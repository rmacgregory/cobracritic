import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  ADMIN_AUTH_DOMAIN,
  LIMITS,
  MASTER_ADMIN_EMAIL,
  STARTER_GAMES,
  sanitizeAvatarUrl,
  sanitizeOptionalUrl,
  type AdminGrant,
  type Game,
  type GameInput,
  type GameWithStats,
  type Review,
  type ReviewComment,
  type ReviewInput,
  type ReviewReaction,
  type UserBan,
  type UserProfile,
} from '../types';

function createSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function getTimeMillis(ts?: { toMillis?: () => number } | null): number {
  if (!ts || typeof ts.toMillis !== 'function') return Date.now();
  return ts.toMillis();
}

interface VereditoContextValue {
  user: User | null;
  authReady: boolean;
  dataLoading: boolean;
  signingIn: boolean;
  authError: string | null;
  adminAuthError: string | null;
  profile: UserProfile | null;
  profileSetupPending: boolean;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  currentBan: UserBan | null;
  admins: AdminGrant[];
  adminUids: Set<string>;
  bans: UserBan[];
  bansByUid: Record<string, UserBan>;
  members: UserProfile[];
  membersById: Record<string, UserProfile>;
  games: Game[];
  gamesWithStats: GameWithStats[];
  reviews: Review[];
  comments: ReviewComment[];
  reactions: ReviewReaction[];
  commentsByReview: Record<string, ReviewComment[]>;
  reactionsByReview: Record<string, ReviewReaction[]>;
  signInWithGoogle: () => Promise<void>;
  signInWithAdminCredentials: (usernameOrEmail: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: {
    displayName: string;
    bio: string;
    topFiveGames: string[];
    photoURL?: string;
  }) => Promise<void>;
  createGame: (input: GameInput) => Promise<string>;
  updateGame: (gameId: string, input: GameInput) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  saveReview: (game: Game, input: ReviewInput) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  addComment: (reviewId: string, gameId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleReaction: (reviewId: string) => Promise<void>;
  seedStarterGames: () => Promise<void>;
  grantAdmin: (targetUid: string, displayName: string) => Promise<void>;
  revokeAdmin: (targetUid: string) => Promise<void>;
  banUser: (targetUid: string, displayName: string, reason: string) => Promise<void>;
  unbanUser: (targetUid: string) => Promise<void>;
  purgeMemberContent: (targetUid: string) => Promise<{ reviewsDeleted: number; commentsDeleted: number }>;
}

const VereditoContext = createContext<VereditoContextValue | null>(null);

export function VereditoProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [profileSetupPending, setProfileSetupPending] = useState(false);

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<AdminGrant[]>([]);
  const [bans, setBans] = useState<UserBan[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [reactions, setReactions] = useState<ReviewReaction[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setProfileSetupPending(false);

      if (nextUser) {
        const userRef = doc(db, 'users', nextUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const safeName = (
              nextUser.displayName ||
              nextUser.email?.split('@')[0] ||
              'Cobra'
            )
              .trim()
              .slice(0, LIMITS.DISPLAY_NAME_MAX);
            try {
              await setDoc(userRef, {
                uid: nextUser.uid,
                displayName: safeName || 'Cobra',
                photoURL: sanitizeAvatarUrl(nextUser.photoURL),
                bio: '',
                topFiveGames: [],
                visibility: 'group',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (writeErr) {
              const code = (writeErr as { code?: string })?.code || '';
              if (code === 'permission-denied' && !nextUser.emailVerified) {
                // Account logged in with Email/Password before being added to /admins
                setProfileSetupPending(true);
                return;
              }
              throw writeErr;
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${nextUser.uid}`);
        }
      } else {
        setMembers([]);
        setAdmins([]);
        setBans([]);
        setGames([]);
        setReviews([]);
        setComments([]);
        setReactions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 2) {
        setDataLoading(false);
      }
    };

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserProfile);
        list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users'),
    );

    const unsubAdmins = onSnapshot(
      query(collection(db, 'admins'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AdminGrant);
        list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));
        setAdmins(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins'),
    );

    const unsubBans = onSnapshot(
      query(collection(db, 'bans'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserBan);
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
        setBans(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bans'),
    );

    const unsubGames = onSnapshot(
      query(collection(db, 'games'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Game, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
        setGames(list);
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'games'),
    );

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Review, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
        setReviews(list);
        markLoaded();
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews'),
    );

    const unsubComments = onSnapshot(
      query(collection(db, 'comments'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReviewComment, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));
        setComments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'comments'),
    );

    const unsubReactions = onSnapshot(
      query(collection(db, 'reactions'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReviewReaction, 'id'>),
        }));
        setReactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reactions'),
    );

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubBans();
      unsubGames();
      unsubReviews();
      unsubComments();
      unsubReactions();
    };
  }, [authReady, user]);

  const profile = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.uid === user.uid) || null;
  }, [members, user]);

  const membersById = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const m of members) {
      map[m.uid] = m;
    }
    return map;
  }, [members]);

  const adminUids = useMemo(() => {
    const set = new Set<string>();
    for (const grant of admins) {
      set.add(grant.uid);
    }
    return set;
  }, [admins]);

  const bansByUid = useMemo(() => {
    const map: Record<string, UserBan> = {};
    for (const ban of bans) {
      map[ban.uid] = ban;
    }
    return map;
  }, [bans]);

  const currentBan = useMemo(() => {
    if (!user) return null;
    return bansByUid[user.uid] || null;
  }, [bansByUid, user]);

  const isMasterAdmin = useMemo(() => {
    return Boolean(user?.email === MASTER_ADMIN_EMAIL && user?.emailVerified);
  }, [user]);

  const isBanned = useMemo(() => {
    return Boolean(currentBan && !isMasterAdmin);
  }, [currentBan, isMasterAdmin]);

  const isAdmin = useMemo(() => {
    if (!user || isBanned) return false;
    return isMasterAdmin || adminUids.has(user.uid);
  }, [user, isMasterAdmin, adminUids, isBanned]);

  const gamesWithStats = useMemo<GameWithStats[]>(() => {
    const reviewsByGame = new Map<string, Review[]>();
    for (const review of reviews) {
      const existing = reviewsByGame.get(review.gameId) || [];
      existing.push(review);
      reviewsByGame.set(review.gameId, existing);
    }

    return games.map((game) => {
      const gameReviews = reviewsByGame.get(game.id) || [];
      const count = gameReviews.length;

      if (count === 0) {
        return {
          ...game,
          averageScore: null,
          reviewCount: 0,
          positiveCount: 0,
          mixedCount: 0,
          negativeCount: 0,
          minScore: null,
          maxScore: null,
          stdDev: 0,
          reviews: [],
        };
      }

      const scores = gameReviews.map((r) => r.score);
      const sum = scores.reduce((acc, val) => acc + val, 0);
      const avg = sum / count;
      const variance =
        scores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      let positiveCount = 0;
      let mixedCount = 0;
      let negativeCount = 0;
      for (const s of scores) {
        if (s >= 75) positiveCount += 1;
        else if (s >= 50) mixedCount += 1;
        else negativeCount += 1;
      }

      return {
        ...game,
        averageScore: Math.round(avg),
        reviewCount: count,
        positiveCount,
        mixedCount,
        negativeCount,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        stdDev,
        reviews: gameReviews,
      };
    });
  }, [games, reviews]);

  const commentsByReview = useMemo(() => {
    const map: Record<string, ReviewComment[]> = {};
    for (const comment of comments) {
      if (!map[comment.reviewId]) map[comment.reviewId] = [];
      map[comment.reviewId].push(comment);
    }
    return map;
  }, [comments]);

  const reactionsByReview = useMemo(() => {
    const map: Record<string, ReviewReaction[]> = {};
    for (const reaction of reactions) {
      if (!map[reaction.reviewId]) map[reaction.reviewId] = [];
      map[reaction.reviewId].push(reaction);
    }
    return map;
  }, [reactions]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setAdminAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setAuthError(
          'Não foi possível entrar com o Google. Verifique se pop-ups estão permitidos no navegador.',
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithAdminCredentials = async (
    usernameOrEmail: string,
    password: string,
  ) => {
    setAuthError(null);
    setAdminAuthError(null);

    const cleanLogin = usernameOrEmail.trim().toLowerCase();
    if (!cleanLogin || !password) {
      setAdminAuthError('Informe o usuário e a senha de administrador.');
      return;
    }

    const email = cleanLogin.includes('@')
      ? cleanLogin
      : `${cleanLogin}@${ADMIN_AUTH_DOMAIN}`;

    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setAdminAuthError(
          'Login por usuário/senha ainda não está ativado no Firebase Authentication. Ative o provedor "E-mail/senha" no console do Firebase ou entre com sua conta Google de Admin Mestre.',
        );
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-email'
      ) {
        setAdminAuthError(
          'Credenciais inválidas ou conta ainda não criada no Firebase Authentication.',
        );
      } else if (code === 'auth/too-many-requests') {
        setAdminAuthError(
          'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
        );
      } else {
        setAdminAuthError(
          'Não foi possível autenticar como administrador. Tente novamente.',
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    setAdminAuthError(null);
    await signOut(auth);
  };

  const getCurrentDisplayName = () => {
    return (
      profile?.displayName ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'Cobra'
    )
      .trim()
      .slice(0, LIMITS.DISPLAY_NAME_MAX);
  };

  const updateUserProfile = async (data: {
    displayName: string;
    bio: string;
    topFiveGames: string[];
    photoURL?: string;
  }) => {
    if (!user || isBanned) return;
    const safeName = data.displayName.trim().slice(0, LIMITS.DISPLAY_NAME_MAX);
    if (!safeName) throw new Error('Informe um nome de exibição.');
    const safeTopFive = data.topFiveGames
      .map((item) => item.trim().slice(0, LIMITS.TOP_FIVE_TITLE_MAX))
      .filter(Boolean)
      .slice(0, LIMITS.TOP_FIVE_MAX);
    const nextPhoto =
      data.photoURL !== undefined
        ? sanitizeAvatarUrl(data.photoURL)
        : sanitizeAvatarUrl(profile?.photoURL || user.photoURL);

    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: safeName,
        photoURL: nextPhoto,
        bio: data.bio.trim().slice(0, LIMITS.BIO_MAX),
        topFiveGames: safeTopFive,
        favoriteGenre: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const createGame = async (input: GameInput): Promise<string> => {
    if (!user || isBanned) throw new Error('Faça login para cadastrar um jogo.');
    const gameId = createSafeId('game');
    const cleanDate = input.releaseDate.trim();
    const year = Number.parseInt(cleanDate.slice(0, 4), 10);
    const releaseYear = Math.min(
      LIMITS.RELEASE_YEAR_MAX,
      Math.max(LIMITS.RELEASE_YEAR_MIN, Number.isNaN(year) ? 2025 : year),
    );
    const cleanPlatforms = input.platforms
      .map((p) => p.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, LIMITS.PLATFORMS_MAX);
    const cleanGenres = input.genres
      .map((g) => g.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, LIMITS.GENRES_MAX);

    const payload = {
      title: input.title.trim().slice(0, LIMITS.GAME_TITLE_MAX),
      developer: input.developer.trim().slice(0, LIMITS.DEVELOPER_MAX),
      releaseDate: cleanDate,
      releaseYear,
      platforms: cleanPlatforms,
      genres: cleanGenres,
      synopsis: input.synopsis.trim().slice(0, LIMITS.SYNOPSIS_MAX),
      coverUrl: sanitizeOptionalUrl(input.coverUrl),
      createdBy: user.uid,
      createdByName: getCurrentDisplayName(),
      visibility: 'group' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const path = `games/${gameId}`;
    try {
      await setDoc(doc(db, 'games', gameId), payload);
      return gameId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateGame = async (gameId: string, input: GameInput) => {
    if (!user || isBanned) throw new Error('Faça login para editar este jogo.');
    const cleanDate = input.releaseDate.trim();
    const year = Number.parseInt(cleanDate.slice(0, 4), 10);
    const releaseYear = Math.min(
      LIMITS.RELEASE_YEAR_MAX,
      Math.max(LIMITS.RELEASE_YEAR_MIN, Number.isNaN(year) ? 2025 : year),
    );
    const cleanPlatforms = input.platforms
      .map((p) => p.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, LIMITS.PLATFORMS_MAX);
    const cleanGenres = input.genres
      .map((g) => g.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, LIMITS.GENRES_MAX);

    const path = `games/${gameId}`;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        title: input.title.trim().slice(0, LIMITS.GAME_TITLE_MAX),
        developer: input.developer.trim().slice(0, LIMITS.DEVELOPER_MAX),
        releaseDate: cleanDate,
        releaseYear,
        platforms: cleanPlatforms,
        genres: cleanGenres,
        synopsis: input.synopsis.trim().slice(0, LIMITS.SYNOPSIS_MAX),
        coverUrl: sanitizeOptionalUrl(input.coverUrl),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!user || isBanned) return;
    const path = `games/${gameId}`;
    try {
      if (isAdmin) {
        const relatedReviews = reviews.filter((r) => r.gameId === gameId);
        const relatedReviewIds = new Set(relatedReviews.map((r) => r.id));
        const relatedComments = comments.filter(
          (c) => c.gameId === gameId || relatedReviewIds.has(c.reviewId),
        );
        const relatedReactions = reactions.filter((r) =>
          relatedReviewIds.has(r.reviewId),
        );

        await Promise.all([
          ...relatedComments.map((c) => deleteDoc(doc(db, 'comments', c.id))),
          ...relatedReactions.map((r) => deleteDoc(doc(db, 'reactions', r.id))),
        ]);
        await Promise.all(
          relatedReviews.map((r) => deleteDoc(doc(db, 'reviews', r.id))),
        );
      }
      await deleteDoc(doc(db, 'games', gameId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const saveReview = async (game: Game, input: ReviewInput) => {
    if (!user || isBanned) throw new Error('Faça login para publicar sua crítica.');
    const reviewId = `${game.id}_${user.uid}`;
    const reviewRef = doc(db, 'reviews', reviewId);
    const path = `reviews/${reviewId}`;

    const score = Math.round(Math.min(100, Math.max(0, Number(input.score) || 0)));
    const hoursPlayed = Math.min(
      LIMITS.HOURS_MAX,
      Math.max(0, Number(input.hoursPlayed) || 0),
    );
    const authorName = getCurrentDisplayName();
    const authorPhotoURL = sanitizeOptionalUrl(user.photoURL);
    const cleanHeadline = input.headline.trim().slice(0, LIMITS.HEADLINE_MAX);
    const cleanBody = input.body.trim().slice(0, LIMITS.REVIEW_BODY_MAX);
    const cleanPlatform = input.platformPlayed.trim().slice(0, 40) || game.platforms[0] || 'PC';

    try {
      const existingSnap = await getDoc(reviewRef);
      if (existingSnap.exists()) {
        await updateDoc(reviewRef, {
          score,
          headline: cleanHeadline,
          body: cleanBody,
          platformPlayed: cleanPlatform,
          hoursPlayed,
          authorName,
          authorPhotoURL,
          gameTitle: game.title.slice(0, LIMITS.GAME_TITLE_MAX),
          gameCoverUrl: sanitizeOptionalUrl(game.coverUrl),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(reviewRef, {
          gameId: game.id,
          gameTitle: game.title.slice(0, LIMITS.GAME_TITLE_MAX),
          gameCoverUrl: sanitizeOptionalUrl(game.coverUrl),
          authorId: user.uid,
          authorName,
          authorPhotoURL,
          score,
          headline: cleanHeadline,
          body: cleanBody,
          platformPlayed: cleanPlatform,
          hoursPlayed,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!user || isBanned) return;
    const path = `reviews/${reviewId}`;
    try {
      if (isAdmin) {
        const relatedComments = comments.filter((c) => c.reviewId === reviewId);
        const relatedReactions = reactions.filter((r) => r.reviewId === reviewId);
        await Promise.all([
          ...relatedComments.map((c) => deleteDoc(doc(db, 'comments', c.id))),
          ...relatedReactions.map((r) => deleteDoc(doc(db, 'reactions', r.id))),
        ]);
      }
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const addComment = async (reviewId: string, gameId: string, body: string) => {
    if (!user || isBanned) return;
    const cleanBody = body.trim().slice(0, LIMITS.COMMENT_BODY_MAX);
    if (!cleanBody) return;

    const commentId = createSafeId('cmt');
    const path = `comments/${commentId}`;
    try {
      await setDoc(doc(db, 'comments', commentId), {
        reviewId,
        gameId,
        authorId: user.uid,
        authorName: getCurrentDisplayName(),
        authorPhotoURL: sanitizeOptionalUrl(user.photoURL),
        body: cleanBody,
        visibility: 'group' as const,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user || isBanned) return;
    const path = `comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const toggleReaction = async (reviewId: string) => {
    if (!user || isBanned) return;
    const reactionId = `${reviewId}_${user.uid}`;
    const path = `reactions/${reactionId}`;
    const alreadyExists = (reactionsByReview[reviewId] || []).some(
      (r) => r.userId === user.uid,
    );

    try {
      if (alreadyExists) {
        await deleteDoc(doc(db, 'reactions', reactionId));
      } else {
        await setDoc(doc(db, 'reactions', reactionId), {
          reviewId,
          userId: user.uid,
          userName: getCurrentDisplayName(),
          type: 'agree',
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const seedStarterGames = async () => {
    if (!user || isBanned) return;
    for (const starter of STARTER_GAMES) {
      await createGame(starter);
    }
  };

  const grantAdmin = async (targetUid: string, displayName: string) => {
    if (!user || !isAdmin) throw new Error('Apenas administradores podem conceder privilégios.');
    const cleanUid = targetUid.trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cleanUid)) {
      throw new Error('UID inválido. Informe um identificador válido do Firebase Auth.');
    }
    const cleanName = (displayName.trim() || 'Admin').slice(0, LIMITS.DISPLAY_NAME_MAX);
    const path = `admins/${cleanUid}`;
    try {
      await setDoc(doc(db, 'admins', cleanUid), {
        uid: cleanUid,
        displayName: cleanName,
        role: 'admin' as const,
        grantedBy: user.uid,
        grantedByName: getCurrentDisplayName(),
        visibility: 'group' as const,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const revokeAdmin = async (targetUid: string) => {
    if (!user || !isAdmin) throw new Error('Apenas administradores podem revogar privilégios.');
    if (targetUid === user.uid) {
      throw new Error('Você não pode remover seus próprios privilégios de admin.');
    }
    const path = `admins/${targetUid}`;
    try {
      await deleteDoc(doc(db, 'admins', targetUid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const banUser = async (targetUid: string, displayName: string, reason: string) => {
    if (!user || !isAdmin) throw new Error('Apenas administradores podem banir membros.');
    if (targetUid === user.uid) {
      throw new Error('Você não pode banir a própria conta.');
    }
    const cleanName = (displayName.trim() || 'Membro').slice(0, LIMITS.DISPLAY_NAME_MAX);
    const cleanReason = reason.trim().slice(0, LIMITS.BAN_REASON_MAX);
    const path = `bans/${targetUid}`;
    try {
      await setDoc(doc(db, 'bans', targetUid), {
        uid: targetUid,
        displayName: cleanName,
        reason: cleanReason,
        bannedBy: user.uid,
        bannedByName: getCurrentDisplayName(),
        visibility: 'group' as const,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const unbanUser = async (targetUid: string) => {
    if (!user || !isAdmin) throw new Error('Apenas administradores podem desbanir membros.');
    const path = `bans/${targetUid}`;
    try {
      await deleteDoc(doc(db, 'bans', targetUid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const purgeMemberContent = async (targetUid: string) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem limpar publicações.');
    }
    const memberReviews = reviews.filter((r) => r.authorId === targetUid);
    const memberReviewIds = new Set(memberReviews.map((r) => r.id));
    const commentsToDelete = comments.filter(
      (c) => c.authorId === targetUid || memberReviewIds.has(c.reviewId),
    );
    const reactionsToDelete = reactions.filter(
      (r) => r.userId === targetUid || memberReviewIds.has(r.reviewId),
    );

    try {
      await Promise.all([
        ...commentsToDelete.map((c) => deleteDoc(doc(db, 'comments', c.id))),
        ...reactionsToDelete.map((r) => deleteDoc(doc(db, 'reactions', r.id))),
      ]);
      await Promise.all(
        memberReviews.map((r) => deleteDoc(doc(db, 'reviews', r.id))),
      );
      return {
        reviewsDeleted: memberReviews.length,
        commentsDeleted: commentsToDelete.length,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `purge/${targetUid}`);
    }
  };

  return (
    <VereditoContext.Provider
      value={{
        user,
        authReady,
        dataLoading,
        signingIn,
        authError,
        adminAuthError,
        profile,
        profileSetupPending,
        isMasterAdmin,
        isAdmin,
        isBanned,
        currentBan,
        admins,
        adminUids,
        bans,
        bansByUid,
        members,
        membersById,
        games,
        gamesWithStats,
        reviews,
        comments,
        reactions,
        commentsByReview,
        reactionsByReview,
        signInWithGoogle,
        signInWithAdminCredentials,
        signOutUser,
        updateUserProfile,
        createGame,
        updateGame,
        deleteGame,
        saveReview,
        deleteReview,
        addComment,
        deleteComment,
        toggleReaction,
        seedStarterGames,
        grantAdmin,
        revokeAdmin,
        banUser,
        unbanUser,
        purgeMemberContent,
      }}
    >
      {children}
    </VereditoContext.Provider>
  );
}

export function useVeredito() {
  const ctx = useContext(VereditoContext);
  if (!ctx) {
    throw new Error('useVeredito deve ser utilizado dentro de VereditoProvider.');
  }
  return ctx;
}
