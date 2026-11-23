import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  computeWeightedScore,
  sanitizeAvatarUrl,
  sanitizeOptionalUrl,
  type AdminGrant,
  type CobraEvent,
  type CoverReport,
  type EventCategory,
  type EventNominee,
  type EventStatus,
  type EventVote,
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

export interface CommentNotification {
  id: string;
  reviewId: string;
  gameId: string;
  gameTitle: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  authorFallbackPhotoURL: string;
  body: string;
  createdAt?: ReviewComment['createdAt'];
  unread: boolean;
}

export interface CoverReportNotification {
  id: string;
  reportId: string;
  gameId: string;
  gameTitle: string;
  gameCoverUrl: string;
  reporterId: string;
  reporterName: string;
  reporterPhotoURL: string;
  reporterFallbackPhotoURL: string;
  note: string;
  createdAt?: CoverReport['createdAt'];
  unread: boolean;
}

interface NotificationReadState {
  readIds: string[];
  readAllBeforeMs: number;
}

const NOTIF_STORAGE_PREFIX = 'cobracritic_notif_read_v1_';

function loadNotificationReadState(uid: string): NotificationReadState {
  try {
    const raw = window.localStorage.getItem(`${NOTIF_STORAGE_PREFIX}${uid}`);
    if (!raw) return { readIds: [], readAllBeforeMs: 0 };
    const parsed = JSON.parse(raw) as Partial<NotificationReadState>;
    return {
      readIds: Array.isArray(parsed.readIds)
        ? parsed.readIds.filter((id): id is string => typeof id === 'string').slice(-300)
        : [],
      readAllBeforeMs:
        typeof parsed.readAllBeforeMs === 'number' ? parsed.readAllBeforeMs : 0,
    };
  } catch {
    return { readIds: [], readAllBeforeMs: 0 };
  }
}

function saveNotificationReadState(uid: string, state: NotificationReadState) {
  try {
    window.localStorage.setItem(
      `${NOTIF_STORAGE_PREFIX}${uid}`,
      JSON.stringify({
        readIds: state.readIds.slice(-300),
        readAllBeforeMs: state.readAllBeforeMs,
      }),
    );
  } catch {
    // ignore storage errors
  }
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
  events: CobraEvent[];
  eventVotes: EventVote[];
  coverReports: CoverReport[];
  openCoverReports: CoverReport[];
  myOpenCoverReportGameIds: Set<string>;
  commentsByReview: Record<string, ReviewComment[]>;
  reactionsByReview: Record<string, ReviewReaction[]>;
  commentNotifications: CommentNotification[];
  coverReportNotifications: CoverReportNotification[];
  unreadNotificationCount: number;
  latestLiveNotification: CommentNotification | null;
  latestLiveCoverReport: CoverReportNotification | null;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  dismissLiveNotification: () => void;
  dismissLiveCoverReport: () => void;
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
  createEvent: (input: {
    title: string;
    description: string;
    status: EventStatus;
  }) => Promise<string>;
  updateEvent: (
    eventId: string,
    input: {
      title: string;
      description: string;
      status: EventStatus;
      categories: EventCategory[];
    },
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  castEventVote: (
    eventId: string,
    categoryId: string,
    nominee: EventNominee,
  ) => Promise<void>;
  removeEventVote: (eventId: string, categoryId: string) => Promise<void>;
  reportIncorrectCover: (game: Game, note?: string) => Promise<void>;
  resolveCoverReport: (reportId: string) => Promise<void>;
  deleteCoverReport: (reportId: string) => Promise<void>;
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
  const [events, setEvents] = useState<CobraEvent[]>([]);
  const [eventVotes, setEventVotes] = useState<EventVote[]>([]);
  const [coverReports, setCoverReports] = useState<CoverReport[]>([]);
  const [notifReadState, setNotifReadState] = useState<NotificationReadState>({
    readIds: [],
    readAllBeforeMs: 0,
  });
  const [liveNotifId, setLiveNotifId] = useState<string | null>(null);
  const [liveCoverReportId, setLiveCoverReportId] = useState<string | null>(null);
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const commentsInitializedRef = useRef(false);
  const seenCoverReportIdsRef = useRef<Set<string>>(new Set());
  const coverReportsInitializedRef = useRef(false);
  const myReviewIdsRef = useRef<Set<string>>(new Set());

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
          } else {
            const existingData = snap.data() as Partial<UserProfile> | undefined;
            const authPhoto = sanitizeAvatarUrl(nextUser.photoURL);
            if (!existingData?.photoURL && authPhoto) {
              try {
                await updateDoc(userRef, {
                  photoURL: authPhoto,
                  topFiveGames: Array.isArray(existingData?.topFiveGames)
                    ? existingData.topFiveGames
                    : [],
                  updatedAt: serverTimestamp(),
                });
              } catch {
                // ignore backfill errors for non-verified accounts
              }
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
        setEvents([]);
        setEventVotes([]);
        setCoverReports([]);
        setLiveNotifId(null);
        setLiveCoverReportId(null);
        seenCommentIdsRef.current = new Set();
        commentsInitializedRef.current = false;
        seenCoverReportIdsRef.current = new Set();
        coverReportsInitializedRef.current = false;
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
        const list = snap.docs.map((d) => {
          const data = d.data() as Partial<UserProfile>;
          return {
            ...(data as UserProfile),
            uid: data.uid || d.id,
          };
        });
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

    commentsInitializedRef.current = false;
    seenCommentIdsRef.current = new Set();

    const unsubComments = onSnapshot(
      query(collection(db, 'comments'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReviewComment, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));

        if (!commentsInitializedRef.current) {
          seenCommentIdsRef.current = new Set(list.map((c) => c.id));
          commentsInitializedRef.current = true;
        } else {
          for (const change of snap.docChanges()) {
            if (change.type === 'added') {
              const docId = change.doc.id;
              if (!seenCommentIdsRef.current.has(docId)) {
                seenCommentIdsRef.current.add(docId);
                const data = change.doc.data() as Omit<ReviewComment, 'id'>;
                if (
                  data.authorId !== user.uid &&
                  myReviewIdsRef.current.has(data.reviewId)
                ) {
                  setLiveNotifId(docId);
                }
              }
            }
          }
        }

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

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CobraEvent, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
        setEvents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events'),
    );

    const unsubEventVotes = onSnapshot(
      query(collection(db, 'eventVotes'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EventVote, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));
        setEventVotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'eventVotes'),
    );

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubBans();
      unsubGames();
      unsubReviews();
      unsubComments();
      unsubReactions();
      unsubEvents();
      unsubEventVotes();
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

  // Dedicated real-time listener for cover reports:
  // - Admins receive all group cover reports + live notifications when new ones arrive.
  // - Regular members only track their own reports (never receive admin alerts).
  useEffect(() => {
    if (!authReady || !user) {
      setCoverReports([]);
      return;
    }

    coverReportsInitializedRef.current = false;
    seenCoverReportIdsRef.current = new Set();

    const reportsQuery = isAdmin
      ? query(collection(db, 'coverReports'), where('visibility', '==', 'group'))
      : query(
          collection(db, 'coverReports'),
          where('visibility', '==', 'group'),
          where('reporterId', '==', user.uid),
        );

    const unsubReports = onSnapshot(
      reportsQuery,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CoverReport, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.updatedAt) - getTimeMillis(a.updatedAt));

        if (!coverReportsInitializedRef.current) {
          seenCoverReportIdsRef.current = new Set(
            list.filter((r) => r.status === 'open').map((r) => r.id),
          );
          coverReportsInitializedRef.current = true;
        } else if (isAdmin) {
          for (const change of snap.docChanges()) {
            const data = change.doc.data() as Omit<CoverReport, 'id'>;
            const docId = change.doc.id;
            if (
              (change.type === 'added' || change.type === 'modified') &&
              data.status === 'open' &&
              !seenCoverReportIdsRef.current.has(docId)
            ) {
              seenCoverReportIdsRef.current.add(docId);
              if (data.reporterId !== user.uid) {
                setLiveCoverReportId(docId);
              }
            }
            if (change.type === 'modified' && data.status === 'resolved') {
              seenCoverReportIdsRef.current.delete(docId);
            }
          }
        }

        setCoverReports(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'coverReports'),
    );

    return () => unsubReports();
  }, [authReady, user, isAdmin]);

  const gamesWithStats = useMemo<GameWithStats[]>(() => {
    const reviewsByGame = new Map<string, Review[]>();
    let totalScoreSum = 0;
    for (const review of reviews) {
      totalScoreSum += review.score;
      const existing = reviewsByGame.get(review.gameId) || [];
      existing.push(review);
      reviewsByGame.set(review.gameId, existing);
    }
    const globalMean = reviews.length > 0 ? totalScoreSum / reviews.length : 75;

    return games.map((game) => {
      const gameReviews = reviewsByGame.get(game.id) || [];
      const count = gameReviews.length;

      if (count === 0) {
        return {
          ...game,
          averageScore: null,
          weightedScore: null,
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
      const weighted = computeWeightedScore(avg, count, globalMean);
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
        weightedScore: Number(weighted.toFixed(2)),
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

  useEffect(() => {
    if (!user) {
      setNotifReadState({ readIds: [], readAllBeforeMs: 0 });
      return;
    }
    setNotifReadState(loadNotificationReadState(user.uid));
  }, [user]);

  useEffect(() => {
    if (!user) {
      myReviewIdsRef.current = new Set();
      return;
    }
    myReviewIdsRef.current = new Set(
      reviews.filter((r) => r.authorId === user.uid).map((r) => r.id),
    );
  }, [reviews, user]);

  const commentNotifications = useMemo<CommentNotification[]>(() => {
    if (!user) return [];
    const myReviewsById = new Map<string, Review>();
    for (const r of reviews) {
      if (r.authorId === user.uid) {
        myReviewsById.set(r.id, r);
      }
    }
    if (myReviewsById.size === 0) return [];

    const gamesById = new Map<string, Game>();
    for (const g of games) {
      gamesById.set(g.id, g);
    }

    const readIdSet = new Set(notifReadState.readIds);

    return comments
      .filter((c) => c.authorId !== user.uid && myReviewsById.has(c.reviewId))
      .sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt))
      .map((c) => {
        const targetReview = myReviewsById.get(c.reviewId);
        const liveAuthor = membersById[c.authorId];
        const createdMs = getTimeMillis(c.createdAt);
        const unread =
          !readIdSet.has(c.id) && createdMs > notifReadState.readAllBeforeMs;

        return {
          id: c.id,
          reviewId: c.reviewId,
          gameId: c.gameId,
          gameTitle:
            gamesById.get(c.gameId)?.title || targetReview?.gameTitle || 'Jogo',
          authorId: c.authorId,
          authorName: liveAuthor?.displayName || c.authorName,
          authorPhotoURL: liveAuthor?.photoURL || '',
          authorFallbackPhotoURL: c.authorPhotoURL || '',
          body: c.body,
          createdAt: c.createdAt,
          unread,
        };
      });
  }, [user, reviews, games, comments, membersById, notifReadState]);

  const openCoverReports = useMemo(
    () => (isAdmin ? coverReports.filter((r) => r.status === 'open') : []),
    [isAdmin, coverReports],
  );

  const myOpenCoverReportGameIds = useMemo(() => {
    const set = new Set<string>();
    if (!user) return set;
    for (const r of coverReports) {
      if (r.reporterId === user.uid && r.status === 'open') {
        set.add(r.gameId);
      }
    }
    return set;
  }, [coverReports, user]);

  const coverReportNotifications = useMemo<CoverReportNotification[]>(() => {
    if (!user || !isAdmin) return [];
    const gamesById = new Map<string, Game>();
    for (const g of games) gamesById.set(g.id, g);
    const readIdSet = new Set(notifReadState.readIds);

    return openCoverReports.map((report) => {
      const liveReporter = membersById[report.reporterId];
      const liveGame = gamesById.get(report.gameId);
      const notifId = `cover_${report.id}`;
      const updatedMs = getTimeMillis(report.updatedAt || report.createdAt);
      const unread =
        !readIdSet.has(notifId) && updatedMs > notifReadState.readAllBeforeMs;

      return {
        id: notifId,
        reportId: report.id,
        gameId: report.gameId,
        gameTitle: liveGame?.title || report.gameTitle,
        gameCoverUrl: liveGame?.coverUrl ?? report.gameCoverUrl,
        reporterId: report.reporterId,
        reporterName: liveReporter?.displayName || report.reporterName,
        reporterPhotoURL:
          liveReporter?.photoURL ||
          (report.reporterId === user.uid ? user.photoURL || '' : ''),
        reporterFallbackPhotoURL: report.reporterPhotoURL || '',
        note: report.note,
        createdAt: report.updatedAt || report.createdAt,
        unread,
      };
    });
  }, [user, isAdmin, openCoverReports, games, membersById, notifReadState]);

  const unreadNotificationCount = useMemo(
    () =>
      commentNotifications.filter((n) => n.unread).length +
      coverReportNotifications.filter((n) => n.unread).length,
    [commentNotifications, coverReportNotifications],
  );

  const latestLiveNotification = useMemo(() => {
    if (!liveNotifId) return null;
    return commentNotifications.find((n) => n.id === liveNotifId) || null;
  }, [commentNotifications, liveNotifId]);

  const latestLiveCoverReport = useMemo(() => {
    if (!liveCoverReportId || !isAdmin) return null;
    return (
      coverReportNotifications.find((n) => n.reportId === liveCoverReportId) || null
    );
  }, [coverReportNotifications, liveCoverReportId, isAdmin]);

  useEffect(() => {
    if (!liveNotifId) return;
    const timer = window.setTimeout(() => setLiveNotifId(null), 6000);
    return () => window.clearTimeout(timer);
  }, [liveNotifId]);

  useEffect(() => {
    if (!liveCoverReportId) return;
    const timer = window.setTimeout(() => setLiveCoverReportId(null), 8000);
    return () => window.clearTimeout(timer);
  }, [liveCoverReportId]);

  const markNotificationRead = useCallback(
    (notifId: string) => {
      if (!user) return;
      setNotifReadState((prev) => {
        if (prev.readIds.includes(notifId)) return prev;
        const next: NotificationReadState = {
          ...prev,
          readIds: [...prev.readIds, notifId].slice(-300),
        };
        saveNotificationReadState(user.uid, next);
        return next;
      });
    },
    [user],
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    const allIds = [
      ...commentNotifications.map((n) => n.id),
      ...coverReportNotifications.map((n) => n.id),
    ];
    setNotifReadState((prev) => {
      const mergedIds = Array.from(new Set([...prev.readIds, ...allIds])).slice(-300);
      const next: NotificationReadState = {
        readIds: mergedIds,
        readAllBeforeMs: Date.now(),
      };
      saveNotificationReadState(user.uid, next);
      return next;
    });
    setLiveNotifId(null);
    setLiveCoverReportId(null);
  }, [user, commentNotifications, coverReportNotifications]);

  const dismissLiveNotification = useCallback(() => {
    setLiveNotifId(null);
  }, []);

  const dismissLiveCoverReport = useCallback(() => {
    setLiveCoverReportId(null);
  }, []);

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

    const nextCoverUrl = sanitizeOptionalUrl(input.coverUrl);
    const prevGame = games.find((g) => g.id === gameId);

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
        coverUrl: nextCoverUrl,
        updatedAt: serverTimestamp(),
      });

      // Auto-resolve pending cover reports for this game when an admin changes the cover
      if (isAdmin && prevGame && prevGame.coverUrl !== nextCoverUrl) {
        const openForGame = coverReports.filter(
          (r) => r.gameId === gameId && r.status === 'open',
        );
        if (openForGame.length > 0) {
          await Promise.all(
            openForGame.map((r) =>
              updateDoc(doc(db, 'coverReports', r.id), {
                status: 'resolved',
                updatedAt: serverTimestamp(),
              }),
            ),
          );
        }
      }
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
    const authorPhotoURL =
      sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL);
    const ratingOnly = Boolean(input.ratingOnly);
    const cleanHeadline = ratingOnly
      ? ''
      : input.headline.trim().slice(0, LIMITS.HEADLINE_MAX);
    const cleanBody = ratingOnly
      ? ''
      : input.body.trim().slice(0, LIMITS.REVIEW_BODY_MAX);
    const cleanPlatform = input.platformPlayed.trim().slice(0, 40) || game.platforms[0] || 'PC';

    try {
      const existingSnap = await getDoc(reviewRef);
      if (existingSnap.exists()) {
        await updateDoc(reviewRef, {
          score,
          ratingOnly,
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
          ratingOnly,
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
        authorPhotoURL:
          sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL),
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

  const sanitizeEventCategories = (rawCategories: EventCategory[]): EventCategory[] => {
    return rawCategories
      .slice(0, LIMITS.EVENT_CATEGORIES_MAX)
      .map((cat) => {
        const cleanId =
          /^[a-zA-Z0-9_-]{1,128}$/.test(cat.id) ? cat.id : createSafeId('cat');
        const cleanName = cat.name.trim().slice(0, LIMITS.EVENT_CATEGORY_NAME_MAX);
        const cleanNominees: EventNominee[] = (cat.nominees || [])
          .slice(0, LIMITS.EVENT_NOMINEES_MAX)
          .map((nom) => ({
            id: /^[a-zA-Z0-9_-]{1,128}$/.test(nom.id) ? nom.id : createSafeId('nom'),
            gameId:
              typeof nom.gameId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(nom.gameId)
                ? nom.gameId
                : '',
            title: nom.title.trim().slice(0, LIMITS.EVENT_NOMINEE_TITLE_MAX),
            coverUrl: sanitizeOptionalUrl(nom.coverUrl),
          }))
          .filter((nom) => nom.title.length > 0);
        const validWinnerId =
          cat.winnerNomineeId &&
          cleanNominees.some((nom) => nom.id === cat.winnerNomineeId)
            ? cat.winnerNomineeId
            : '';

        return {
          id: cleanId,
          name: cleanName,
          nominees: cleanNominees,
          winnerNomineeId: validWinnerId,
        };
      })
      .filter((cat) => cat.name.length > 0);
  };

  const createEvent = async (input: {
    title: string;
    description: string;
    status: EventStatus;
  }): Promise<string> => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem criar eventos.');
    }
    const cleanTitle = input.title.trim().slice(0, LIMITS.EVENT_TITLE_MAX);
    if (!cleanTitle) {
      throw new Error('Informe o nome do evento.');
    }
    const cleanDesc = input.description.trim().slice(0, LIMITS.EVENT_DESCRIPTION_MAX);
    const safeStatus: EventStatus =
      input.status === 'active' || input.status === 'closed' ? input.status : 'inactive';

    const eventId = createSafeId('evt');
    const path = `events/${eventId}`;
    try {
      await setDoc(doc(db, 'events', eventId), {
        title: cleanTitle,
        description: cleanDesc,
        status: safeStatus,
        categories: [],
        createdBy: user.uid,
        createdByName: getCurrentDisplayName(),
        visibility: 'group' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return eventId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateEvent = async (
    eventId: string,
    input: {
      title: string;
      description: string;
      status: EventStatus;
      categories: EventCategory[];
    },
  ) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem editar eventos.');
    }
    const cleanTitle = input.title.trim().slice(0, LIMITS.EVENT_TITLE_MAX);
    if (!cleanTitle) {
      throw new Error('Informe o nome do evento.');
    }
    const cleanDesc = input.description.trim().slice(0, LIMITS.EVENT_DESCRIPTION_MAX);
    const safeStatus: EventStatus =
      input.status === 'active' || input.status === 'closed' ? input.status : 'inactive';
    const cleanCategories = sanitizeEventCategories(input.categories);

    const path = `events/${eventId}`;
    try {
      await updateDoc(doc(db, 'events', eventId), {
        title: cleanTitle,
        description: cleanDesc,
        status: safeStatus,
        categories: cleanCategories,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem excluir eventos.');
    }
    const path = `events/${eventId}`;
    try {
      const relatedVotes = eventVotes.filter((v) => v.eventId === eventId);
      await Promise.all(
        relatedVotes.map((v) => deleteDoc(doc(db, 'eventVotes', v.id))),
      );
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const castEventVote = async (
    eventId: string,
    categoryId: string,
    nominee: EventNominee,
  ) => {
    if (!user || isBanned) {
      throw new Error('Faça login para votar neste evento.');
    }
    const voteId = `${eventId}_${categoryId}_${user.uid}`;
    const voteRef = doc(db, 'eventVotes', voteId);
    const path = `eventVotes/${voteId}`;
    const userName = getCurrentDisplayName();
    const userPhotoURL =
      sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL);
    const nomineeTitle = nominee.title.trim().slice(0, LIMITS.EVENT_NOMINEE_TITLE_MAX);

    try {
      const existingSnap = await getDoc(voteRef);
      if (existingSnap.exists()) {
        await updateDoc(voteRef, {
          nomineeId: nominee.id,
          nomineeTitle,
          userName,
          userPhotoURL,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(voteRef, {
          eventId,
          categoryId,
          nomineeId: nominee.id,
          nomineeTitle,
          userId: user.uid,
          userName,
          userPhotoURL,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeEventVote = async (eventId: string, categoryId: string) => {
    if (!user || isBanned) return;
    const voteId = `${eventId}_${categoryId}_${user.uid}`;
    const path = `eventVotes/${voteId}`;
    try {
      await deleteDoc(doc(db, 'eventVotes', voteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const reportIncorrectCover = async (game: Game, note = '') => {
    if (!user || isBanned) {
      throw new Error('Faça login para reportar uma capa incorreta.');
    }
    const reportId = `${game.id}_${user.uid}`;
    const reportRef = doc(db, 'coverReports', reportId);
    const path = `coverReports/${reportId}`;
    const cleanNote = note.trim().slice(0, LIMITS.COVER_REPORT_NOTE_MAX);
    const reporterName = getCurrentDisplayName();
    const reporterPhotoURL =
      sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL);
    const gameTitle = game.title.slice(0, LIMITS.GAME_TITLE_MAX);
    const gameCoverUrl = sanitizeOptionalUrl(game.coverUrl);

    try {
      const existingSnap = await getDoc(reportRef);
      if (existingSnap.exists()) {
        await updateDoc(reportRef, {
          note: cleanNote,
          status: 'open',
          gameTitle,
          gameCoverUrl,
          reporterName,
          reporterPhotoURL,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(reportRef, {
          gameId: game.id,
          gameTitle,
          gameCoverUrl,
          reporterId: user.uid,
          reporterName,
          reporterPhotoURL,
          note: cleanNote,
          status: 'open' as const,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const resolveCoverReport = async (reportId: string) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem resolver reportes de capa.');
    }
    const path = `coverReports/${reportId}`;
    try {
      await updateDoc(doc(db, 'coverReports', reportId), {
        status: 'resolved',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteCoverReport = async (reportId: string) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem excluir reportes de capa.');
    }
    const path = `coverReports/${reportId}`;
    try {
      await deleteDoc(doc(db, 'coverReports', reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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
        events,
        eventVotes,
        coverReports,
        openCoverReports,
        myOpenCoverReportGameIds,
        commentsByReview,
        reactionsByReview,
        commentNotifications,
        coverReportNotifications,
        unreadNotificationCount,
        latestLiveNotification,
        latestLiveCoverReport,
        markNotificationRead,
        markAllNotificationsRead,
        dismissLiveNotification,
        dismissLiveCoverReport,
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
        createEvent,
        updateEvent,
        deleteEvent,
        castEventVote,
        removeEventVote,
        reportIncorrectCover,
        resolveCoverReport,
        deleteCoverReport,
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
