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
  DEFAULT_NOTIFICATION_PREFERENCES,
  LIMITS,
  MASTER_ADMIN_EMAIL,
  STARTER_GAMES,
  computeWeightedScore,
  resolveNotificationPreferences,
  sanitizeAvatarUrl,
  sanitizeOptionalUrl,
  type AccessRequest,
  type AdminGrant,
  type CobraEvent,
  type CommentReaction,
  type CoverReport,
  type EventCategory,
  type EventMode,
  type EventNomination,
  type EventNominee,
  type EventStatus,
  type EventVote,
  type FeaturedRoundGame,
  type Game,
  type GameInput,
  type GamePlayStatus,
  type GameWithStats,
  type MemberBadge,
  type NotificationPreferences,
  type ReactionType,
  type Review,
  type ReviewComment,
  type ReviewInput,
  type ReviewReaction,
  type UserBan,
  type UserGameStatus,
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
  isReply?: boolean;
  isMention?: boolean;
  hasSpoiler?: boolean;
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

export interface GroupActivityNotification {
  id: string;
  kind: 'featuredRound' | 'event';
  title: string;
  subtitle: string;
  gameId?: string;
  eventId?: string;
  eventStatus?: EventStatus;
  actorName?: string;
  createdAt?: CobraEvent['updatedAt'];
  unread: boolean;
}

export interface AccessRequestNotification {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt?: AccessRequest['createdAt'];
  unread: boolean;
}

export type AccessGateStatus = 'loading' | 'approved' | 'pending' | 'rejected';

function buildFeaturedRoundNotifId(round: FeaturedRoundGame): string {
  const slug = `${round.gameId || 'custom'}_${round.title}_${round.roundLabel}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 80);
  return `round_${slug}`;
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
  isRealAdmin: boolean;
  viewAsMember: boolean;
  setViewAsMember: (next: boolean) => void;
  toggleViewAsMember: () => void;
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
  commentReactions: CommentReaction[];
  events: CobraEvent[];
  eventVotes: EventVote[];
  eventNominations: EventNomination[];
  nominationsByEvent: Record<string, EventNomination[]>;
  userGameStatuses: UserGameStatus[];
  userStatusesByGame: Record<string, UserGameStatus[]>;
  myStatusByGame: Record<string, GamePlayStatus>;
  featuredRound: FeaturedRoundGame | null;
  accessStatus: AccessGateStatus;
  myAccessRequest: AccessRequest | null;
  accessRequests: AccessRequest[];
  pendingAccessRequests: AccessRequest[];
  readOnlyMode: boolean;
  enterReadOnlyMode: () => void;
  exitReadOnlyMode: () => void;
  approveAccessRequest: (req: AccessRequest) => Promise<void>;
  rejectAccessRequest: (targetUid: string, reason?: string) => Promise<void>;
  deleteAccessRequest: (targetUid: string) => Promise<void>;
  coverReports: CoverReport[];
  openCoverReports: CoverReport[];
  myOpenCoverReportGameIds: Set<string>;
  commentsByReview: Record<string, ReviewComment[]>;
  reactionsByReview: Record<string, ReviewReaction[]>;
  commentReactionsByComment: Record<string, CommentReaction[]>;
  commentNotifications: CommentNotification[];
  coverReportNotifications: CoverReportNotification[];
  accessRequestNotifications: AccessRequestNotification[];
  groupNotifications: GroupActivityNotification[];
  notificationPreferences: NotificationPreferences;
  unreadNotificationCount: number;
  latestLiveNotification: CommentNotification | null;
  latestLiveCoverReport: CoverReportNotification | null;
  latestLiveAccessRequest: AccessRequestNotification | null;
  latestLiveGroupNotification: GroupActivityNotification | null;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  dismissLiveNotification: () => void;
  dismissLiveCoverReport: () => void;
  dismissLiveAccessRequest: () => void;
  dismissLiveGroupNotification: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithAdminCredentials: (usernameOrEmail: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: {
    displayName: string;
    bio: string;
    topFiveGames: string[];
    photoURL?: string;
  }) => Promise<void>;
  updateNotificationPreferences: (
    next: Partial<NotificationPreferences>,
  ) => Promise<void>;
  createGame: (input: GameInput) => Promise<string>;
  updateGame: (gameId: string, input: GameInput) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  saveReview: (game: Game, input: ReviewInput) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  addComment: (
    reviewId: string,
    gameId: string,
    body: string,
    options?: {
      parentCommentId?: string;
      replyToAuthorName?: string;
      hasSpoiler?: boolean;
      mentionedUserIds?: string[];
    },
  ) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleReaction: (reviewId: string, type?: ReactionType) => Promise<void>;
  toggleCommentReaction: (
    commentId: string,
    reviewId: string,
    type: ReactionType,
  ) => Promise<void>;
  seedStarterGames: () => Promise<void>;
  grantAdmin: (targetUid: string, displayName: string) => Promise<void>;
  revokeAdmin: (targetUid: string) => Promise<void>;
  updateMemberBadge: (targetUid: string, badge: MemberBadge) => Promise<void>;
  banUser: (targetUid: string, displayName: string, reason: string) => Promise<void>;
  unbanUser: (targetUid: string) => Promise<void>;
  purgeMemberContent: (targetUid: string) => Promise<{ reviewsDeleted: number; commentsDeleted: number }>;
  createEvent: (input: {
    title: string;
    description: string;
    mode?: EventMode;
    deadlineAt?: string;
    status: EventStatus;
    categories?: EventCategory[];
  }) => Promise<string>;
  updateEvent: (
    eventId: string,
    input: {
      title: string;
      description: string;
      mode?: EventMode;
      deadlineAt?: string;
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
  saveEventNomination: (
    eventId: string,
    input: { gameId: string; title: string; coverUrl: string },
  ) => Promise<void>;
  deleteEventNomination: (eventId: string, targetUserId?: string) => Promise<void>;
  setGamePlayStatus: (gameId: string, status: GamePlayStatus) => Promise<void>;
  clearGamePlayStatus: (gameId: string) => Promise<void>;
  pinFeaturedRound: (input: {
    gameId: string;
    title: string;
    coverUrl: string;
    roundLabel: string;
    eventId?: string;
    note?: string;
  }) => Promise<void>;
  unpinFeaturedRound: () => Promise<void>;
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
  const [commentReactions, setCommentReactions] = useState<CommentReaction[]>([]);
  const [events, setEvents] = useState<CobraEvent[]>([]);
  const [eventVotes, setEventVotes] = useState<EventVote[]>([]);
  const [eventNominations, setEventNominations] = useState<EventNomination[]>([]);
  const [userGameStatuses, setUserGameStatuses] = useState<UserGameStatus[]>([]);
  const [featuredRound, setFeaturedRound] = useState<FeaturedRoundGame | null>(null);
  const [accessStatus, setAccessStatus] = useState<AccessGateStatus>('approved');
  const [myAccessRequest, setMyAccessRequest] = useState<AccessRequest | null>(null);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [coverReports, setCoverReports] = useState<CoverReport[]>([]);
  const [notifReadState, setNotifReadState] = useState<NotificationReadState>({
    readIds: [],
    readAllBeforeMs: 0,
  });
  const [liveNotifId, setLiveNotifId] = useState<string | null>(null);
  const [liveCoverReportId, setLiveCoverReportId] = useState<string | null>(null);
  const [liveAccessRequestUid, setLiveAccessRequestUid] = useState<string | null>(null);
  const [liveGroupNotifId, setLiveGroupNotifId] = useState<string | null>(null);
  const [viewAsMember, setViewAsMember] = useState(false);
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const commentsInitializedRef = useRef(false);
  const seenCoverReportIdsRef = useRef<Set<string>>(new Set());
  const coverReportsInitializedRef = useRef(false);
  const seenAccessRequestUidsRef = useRef<Set<string>>(new Set());
  const accessRequestsInitializedRef = useRef(false);
  const eventsInitializedRef = useRef(false);
  const seenEventStatusByIdRef = useRef<Map<string, EventStatus>>(new Map());
  const featuredRoundInitializedRef = useRef(false);
  const lastFeaturedRoundKeyRef = useRef<string | null>(null);
  const myReviewIdsRef = useRef<Set<string>>(new Set());
  const myCommentIdsRef = useRef<Set<string>>(new Set());
  const notificationPreferencesRef = useRef<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );

  const enterReadOnlyMode = useCallback(() => {
    setAuthError(null);
    setAdminAuthError(null);
    if (auth.currentUser) {
      void signOut(auth);
    }
    setReadOnlyMode(true);
  }, []);

  const exitReadOnlyMode = useCallback(() => {
    setReadOnlyMode(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setProfileSetupPending(false);

      if (nextUser) {
        setReadOnlyMode(false);
        setAccessStatus('loading');
        setMyAccessRequest(null);

        const userRef = doc(db, 'users', nextUser.uid);
        try {
          const [userSnap, adminSnap, banSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(doc(db, 'admins', nextUser.uid)).catch(() => null),
            getDoc(doc(db, 'bans', nextUser.uid)).catch(() => null),
          ]);

          const isMaster =
            nextUser.email === MASTER_ADMIN_EMAIL && nextUser.emailVerified;
          const isDelegatedAdmin = Boolean(adminSnap?.exists());
          const isUserBanned = Boolean(banSnap?.exists()) && !isMaster;

          if (userSnap.exists()) {
            // Existing registered member logs in normally
            setAccessStatus('approved');
            const existingData = userSnap.data() as Partial<UserProfile> | undefined;
            const authPhoto = sanitizeAvatarUrl(nextUser.photoURL);
            if (!existingData?.photoURL && authPhoto && !isUserBanned) {
              try {
                await updateDoc(userRef, {
                  photoURL: authPhoto,
                  topFiveGames: Array.isArray(existingData?.topFiveGames)
                    ? existingData.topFiveGames
                    : [],
                  updatedAt: serverTimestamp(),
                });
              } catch {
                // ignore backfill errors
              }
            }
            return;
          }

          if (isUserBanned) {
            setAccessStatus('approved');
            return;
          }

          const safeName =
            (
              nextUser.displayName ||
              nextUser.email?.split('@')[0] ||
              'Cobra'
            )
              .trim()
              .slice(0, LIMITS.DISPLAY_NAME_MAX) || 'Cobra';

          if (isMaster || isDelegatedAdmin) {
            await setDoc(userRef, {
              uid: nextUser.uid,
              displayName: safeName,
              photoURL: sanitizeAvatarUrl(nextUser.photoURL),
              bio: '',
              topFiveGames: [],
              visibility: 'group',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setAccessStatus('approved');
            return;
          }

          if (!nextUser.emailVerified) {
            // Email/Password admin account not yet linked in /admins
            setProfileSetupPending(true);
            setAccessStatus('approved');
            return;
          }

          // New Google user without an existing profile: check or create access request
          const reqRef = doc(db, 'accessRequests', nextUser.uid);
          const reqSnap = await getDoc(reqRef);

          if (reqSnap.exists()) {
            const reqData = reqSnap.data() as AccessRequest;
            if (reqData.status === 'approved') {
              await setDoc(userRef, {
                uid: nextUser.uid,
                displayName: safeName,
                photoURL: sanitizeAvatarUrl(nextUser.photoURL),
                bio: '',
                topFiveGames: [],
                visibility: 'group',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setMyAccessRequest(reqData);
              setAccessStatus('approved');
              return;
            }
            setMyAccessRequest(reqData);
            setAccessStatus(reqData.status === 'rejected' ? 'rejected' : 'pending');
            return;
          }

          const newRequest = {
            uid: nextUser.uid,
            displayName: safeName,
            photoURL: sanitizeOptionalUrl(nextUser.photoURL),
            status: 'pending' as const,
            rejectionReason: '',
            reviewedBy: '',
            reviewedByName: '',
            visibility: 'group' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(reqRef, newRequest);
          setMyAccessRequest({
            ...newRequest,
            createdAt: null,
            updatedAt: null,
          });
          setAccessStatus('pending');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `accessRequests/${nextUser.uid}`);
        }
      } else {
        setAccessStatus('approved');
        setMyAccessRequest(null);
        setAccessRequests([]);
        setAdmins([]);
        setBans([]);
        setCoverReports([]);
        setLiveNotifId(null);
        setLiveCoverReportId(null);
        setLiveAccessRequestUid(null);
        setLiveGroupNotifId(null);
        setViewAsMember(false);
        seenCommentIdsRef.current = new Set();
        commentsInitializedRef.current = false;
        seenCoverReportIdsRef.current = new Set();
        coverReportsInitializedRef.current = false;
        seenAccessRequestUidsRef.current = new Set();
        accessRequestsInitializedRef.current = false;
        eventsInitializedRef.current = false;
        seenEventStatusByIdRef.current = new Map();
        featuredRoundInitializedRef.current = false;
        lastFeaturedRoundKeyRef.current = null;
        myReviewIdsRef.current = new Set();
        myCommentIdsRef.current = new Set();
        notificationPreferencesRef.current = DEFAULT_NOTIFICATION_PREFERENCES;
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener while a new user waits for admin approval or rejection
  useEffect(() => {
    if (!authReady || !user || (accessStatus !== 'pending' && accessStatus !== 'rejected')) {
      return;
    }

    const unsubOwnProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setAccessStatus('approved');
        }
      },
      () => {
        // ignore transient read errors while pending
      },
    );

    const unsubOwnRequest = onSnapshot(
      doc(db, 'accessRequests', user.uid),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as AccessRequest;
        setMyAccessRequest(data);
        if (data.status === 'approved') {
          const userRef = doc(db, 'users', user.uid);
          try {
            const existingProfile = await getDoc(userRef);
            if (!existingProfile.exists()) {
              const safeName =
                (
                  user.displayName ||
                  data.displayName ||
                  user.email?.split('@')[0] ||
                  'Cobra'
                )
                  .trim()
                  .slice(0, LIMITS.DISPLAY_NAME_MAX) || 'Cobra';
              await setDoc(userRef, {
                uid: user.uid,
                displayName: safeName,
                photoURL: sanitizeAvatarUrl(user.photoURL || data.photoURL),
                bio: '',
                topFiveGames: [],
                visibility: 'group',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            setAccessStatus('approved');
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          }
        } else if (data.status === 'rejected') {
          setAccessStatus('rejected');
        } else {
          setAccessStatus('pending');
        }
      },
      () => {
        // ignore transient listener errors
      },
    );

    return () => {
      unsubOwnProfile();
      unsubOwnRequest();
    };
  }, [authReady, user, accessStatus]);

  const hasApprovedSession = Boolean(user && accessStatus === 'approved');

  useEffect(() => {
    if (!authReady || (!hasApprovedSession && !readOnlyMode)) {
      setDataLoading(false);
      if (!hasApprovedSession && !readOnlyMode) {
        setMembers([]);
        setGames([]);
        setReviews([]);
        setComments([]);
        setReactions([]);
        setCommentReactions([]);
        setEvents([]);
        setEventVotes([]);
        setEventNominations([]);
        setUserGameStatuses([]);
        setFeaturedRound(null);
      }
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

    const unsubAdmins = hasApprovedSession
      ? onSnapshot(
          query(collection(db, 'admins'), where('visibility', '==', 'group')),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as AdminGrant);
            list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));
            setAdmins(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'admins'),
        )
      : () => {};

    const unsubBans = hasApprovedSession
      ? onSnapshot(
          query(collection(db, 'bans'), where('visibility', '==', 'group')),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as UserBan);
            list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
            setBans(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'bans'),
        )
      : () => {};

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
        } else if (user) {
          for (const change of snap.docChanges()) {
            if (change.type === 'added') {
              const docId = change.doc.id;
              if (!seenCommentIdsRef.current.has(docId)) {
                seenCommentIdsRef.current.add(docId);
                const data = change.doc.data() as Omit<ReviewComment, 'id'>;
                const isReplyToMyComment = Boolean(
                  data.parentCommentId &&
                    myCommentIdsRef.current.has(data.parentCommentId),
                );
                const isMentioningMe = Boolean(
                  Array.isArray(data.mentionedUserIds) &&
                    data.mentionedUserIds.includes(user.uid),
                );
                const prefs = notificationPreferencesRef.current;
                const matchesCommentOrReply =
                  prefs.comments &&
                  (myReviewIdsRef.current.has(data.reviewId) || isReplyToMyComment);
                const matchesMention = prefs.mentions && isMentioningMe;
                if (
                  prefs.liveToasts &&
                  data.authorId !== user.uid &&
                  (matchesCommentOrReply || matchesMention)
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

    const unsubCommentReactions = onSnapshot(
      query(collection(db, 'commentReactions'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CommentReaction, 'id'>),
        }));
        setCommentReactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'commentReactions'),
    );

    eventsInitializedRef.current = false;
    seenEventStatusByIdRef.current = new Map();

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CobraEvent, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));

        if (!eventsInitializedRef.current) {
          const map = new Map<string, EventStatus>();
          for (const ev of list) map.set(ev.id, ev.status);
          seenEventStatusByIdRef.current = map;
          eventsInitializedRef.current = true;
        } else if (user) {
          const prefs = notificationPreferencesRef.current;
          for (const ev of list) {
            const prevStatus = seenEventStatusByIdRef.current.get(ev.id);
            if (prevStatus !== ev.status) {
              seenEventStatusByIdRef.current.set(ev.id, ev.status);
              if (
                ev.status !== 'inactive' &&
                prefs.events &&
                prefs.liveToasts &&
                ev.createdBy !== user.uid
              ) {
                setLiveGroupNotifId(`event_${ev.id}_${ev.status}`);
              }
            }
          }
        }

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

    const unsubEventNominations = onSnapshot(
      query(collection(db, 'eventNominations'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EventNomination, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(a.createdAt) - getTimeMillis(b.createdAt));
        setEventNominations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'eventNominations'),
    );

    const unsubUserGameStatuses = onSnapshot(
      query(collection(db, 'userGameStatuses'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UserGameStatus, 'id'>),
        }));
        list.sort((a, b) => getTimeMillis(b.updatedAt) - getTimeMillis(a.updatedAt));
        setUserGameStatuses(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'userGameStatuses'),
    );

    featuredRoundInitializedRef.current = false;
    lastFeaturedRoundKeyRef.current = null;

    const unsubFeaturedRound = onSnapshot(
      doc(db, 'groupConfig', 'featuredRound'),
      (snap) => {
        if (!snap.exists()) {
          setFeaturedRound(null);
          featuredRoundInitializedRef.current = true;
          lastFeaturedRoundKeyRef.current = null;
          return;
        }
        const nextRound: FeaturedRoundGame = {
          id: snap.id,
          ...(snap.data() as Omit<FeaturedRoundGame, 'id'>),
        };
        const nextKey = buildFeaturedRoundNotifId(nextRound);
        if (!featuredRoundInitializedRef.current) {
          featuredRoundInitializedRef.current = true;
          lastFeaturedRoundKeyRef.current = nextKey;
        } else if (lastFeaturedRoundKeyRef.current !== nextKey) {
          lastFeaturedRoundKeyRef.current = nextKey;
          const prefs = notificationPreferencesRef.current;
          if (
            user &&
            prefs.featuredRound &&
            prefs.liveToasts &&
            nextRound.pinnedBy !== user.uid
          ) {
            setLiveGroupNotifId(nextKey);
          }
        }
        setFeaturedRound(nextRound);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'groupConfig/featuredRound'),
    );

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubBans();
      unsubGames();
      unsubReviews();
      unsubComments();
      unsubReactions();
      unsubCommentReactions();
      unsubEvents();
      unsubEventVotes();
      unsubEventNominations();
      unsubUserGameStatuses();
      unsubFeaturedRound();
    };
  }, [authReady, user, hasApprovedSession, readOnlyMode]);

  const profile = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.uid === user.uid) || null;
  }, [members, user]);

  const notificationPreferences = useMemo<NotificationPreferences>(
    () => resolveNotificationPreferences(profile?.notificationPreferences),
    [profile?.notificationPreferences],
  );

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

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

  const isRealMasterAdmin = useMemo(() => {
    return Boolean(user?.email === MASTER_ADMIN_EMAIL && user?.emailVerified);
  }, [user]);

  const isBanned = useMemo(() => {
    return Boolean(currentBan && !isRealMasterAdmin);
  }, [currentBan, isRealMasterAdmin]);

  const isRealAdmin = useMemo(() => {
    if (!user || isBanned) return false;
    return isRealMasterAdmin || adminUids.has(user.uid);
  }, [user, isRealMasterAdmin, adminUids, isBanned]);

  useEffect(() => {
    if (!isRealAdmin && viewAsMember) {
      setViewAsMember(false);
    }
  }, [isRealAdmin, viewAsMember]);

  const toggleViewAsMember = useCallback(() => {
    if (!isRealAdmin) return;
    setViewAsMember((prev) => !prev);
  }, [isRealAdmin]);

  const isMasterAdmin = isRealMasterAdmin && !viewAsMember;
  const isAdmin = isRealAdmin && !viewAsMember;

  // Dedicated real-time listener for cover reports:
  // - Real admins stay subscribed to group cover reports (avoiding listener churn when toggling preview mode).
  // - Cover report notifications & UI are only exposed when effective `isAdmin` is true.
  useEffect(() => {
    if (!authReady || !user || accessStatus !== 'approved') {
      setCoverReports([]);
      return;
    }

    coverReportsInitializedRef.current = false;
    seenCoverReportIdsRef.current = new Set();

    const reportsQuery = isRealAdmin
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
        } else if (isRealAdmin) {
          for (const change of snap.docChanges()) {
            const data = change.doc.data() as Omit<CoverReport, 'id'>;
            const docId = change.doc.id;
            if (
              (change.type === 'added' || change.type === 'modified') &&
              data.status === 'open' &&
              !seenCoverReportIdsRef.current.has(docId)
            ) {
              seenCoverReportIdsRef.current.add(docId);
              const prefs = notificationPreferencesRef.current;
              if (
                prefs.coverReports &&
                prefs.liveToasts &&
                data.reporterId !== user.uid
              ) {
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
  }, [authReady, user, accessStatus, isRealAdmin]);

  // Dedicated real-time listener for admin access requests queue
  useEffect(() => {
    if (!authReady || !user || accessStatus !== 'approved' || !isRealAdmin) {
      setAccessRequests([]);
      return;
    }

    accessRequestsInitializedRef.current = false;
    seenAccessRequestUidsRef.current = new Set();

    const unsubAccessRequests = onSnapshot(
      query(collection(db, 'accessRequests'), where('visibility', '==', 'group')),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as AccessRequest;
          return { ...data, uid: data.uid || d.id };
        });
        list.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return getTimeMillis(b.updatedAt || b.createdAt) - getTimeMillis(a.updatedAt || a.createdAt);
        });

        if (!accessRequestsInitializedRef.current) {
          seenAccessRequestUidsRef.current = new Set(
            list.filter((r) => r.status === 'pending').map((r) => r.uid),
          );
          accessRequestsInitializedRef.current = true;
        } else {
          for (const change of snap.docChanges()) {
            const data = change.doc.data() as AccessRequest;
            const reqUid = data.uid || change.doc.id;
            if (
              (change.type === 'added' || change.type === 'modified') &&
              data.status === 'pending' &&
              !seenAccessRequestUidsRef.current.has(reqUid)
            ) {
              seenAccessRequestUidsRef.current.add(reqUid);
              const prefs = notificationPreferencesRef.current;
              if (prefs.liveToasts) {
                setLiveAccessRequestUid(reqUid);
              }
            }
            if (change.type === 'modified' && data.status !== 'pending') {
              seenAccessRequestUidsRef.current.delete(reqUid);
            }
          }
        }

        setAccessRequests(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'accessRequests'),
    );

    return () => unsubAccessRequests();
  }, [authReady, user, accessStatus, isRealAdmin]);

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

  const commentReactionsByComment = useMemo(() => {
    const map: Record<string, CommentReaction[]> = {};
    for (const reaction of commentReactions) {
      if (!map[reaction.commentId]) map[reaction.commentId] = [];
      map[reaction.commentId].push(reaction);
    }
    return map;
  }, [commentReactions]);

  const nominationsByEvent = useMemo(() => {
    const map: Record<string, EventNomination[]> = {};
    for (const nom of eventNominations) {
      if (!map[nom.eventId]) map[nom.eventId] = [];
      map[nom.eventId].push(nom);
    }
    return map;
  }, [eventNominations]);

  const userStatusesByGame = useMemo(() => {
    const map: Record<string, UserGameStatus[]> = {};
    for (const st of userGameStatuses) {
      if (!map[st.gameId]) map[st.gameId] = [];
      map[st.gameId].push(st);
    }
    return map;
  }, [userGameStatuses]);

  const myStatusByGame = useMemo(() => {
    const map: Record<string, GamePlayStatus> = {};
    if (!user) return map;
    for (const st of userGameStatuses) {
      if (st.userId === user.uid) {
        map[st.gameId] = st.status;
      }
    }
    return map;
  }, [userGameStatuses, user]);

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

  useEffect(() => {
    if (!user) {
      myCommentIdsRef.current = new Set();
      return;
    }
    myCommentIdsRef.current = new Set(
      comments.filter((c) => c.authorId === user.uid).map((c) => c.id),
    );
  }, [comments, user]);

  const commentNotifications = useMemo<CommentNotification[]>(() => {
    if (!user) return [];
    const allReviewsById = new Map<string, Review>();
    const myReviewsById = new Map<string, Review>();
    for (const r of reviews) {
      allReviewsById.set(r.id, r);
      if (r.authorId === user.uid) {
        myReviewsById.set(r.id, r);
      }
    }

    const myCommentsById = new Map<string, ReviewComment>();
    for (const c of comments) {
      if (c.authorId === user.uid) {
        myCommentsById.set(c.id, c);
      }
    }

    const gamesById = new Map<string, Game>();
    for (const g of games) {
      gamesById.set(g.id, g);
    }

    const readIdSet = new Set(notifReadState.readIds);

    return comments
      .filter((c) => {
        if (c.authorId === user.uid) return false;
        const onMyReview = myReviewsById.has(c.reviewId);
        const replyToMyComment = Boolean(
          c.parentCommentId && myCommentsById.has(c.parentCommentId),
        );
        const mentionedMe = Boolean(
          Array.isArray(c.mentionedUserIds) && c.mentionedUserIds.includes(user.uid),
        );
        const allowedByCommentPref =
          notificationPreferences.comments && (onMyReview || replyToMyComment);
        const allowedByMentionPref =
          notificationPreferences.mentions && mentionedMe;
        return allowedByCommentPref || allowedByMentionPref;
      })
      .sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt))
      .map((c) => {
        const targetReview = allReviewsById.get(c.reviewId);
        const liveAuthor = membersById[c.authorId];
        const createdMs = getTimeMillis(c.createdAt);
        const unread =
          !readIdSet.has(c.id) && createdMs > notifReadState.readAllBeforeMs;
        const isMention = Boolean(
          Array.isArray(c.mentionedUserIds) && c.mentionedUserIds.includes(user.uid),
        );
        const isReply = Boolean(
          c.parentCommentId && myCommentsById.has(c.parentCommentId),
        );

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
          isReply,
          isMention,
          hasSpoiler: Boolean(c.hasSpoiler),
          createdAt: c.createdAt,
          unread,
        };
      });
  }, [
    user,
    reviews,
    games,
    comments,
    membersById,
    notifReadState,
    notificationPreferences.comments,
    notificationPreferences.mentions,
  ]);

  const openCoverReports = useMemo(
    () => (isAdmin ? coverReports.filter((r) => r.status === 'open') : []),
    [isAdmin, coverReports],
  );

  const pendingAccessRequests = useMemo(
    () => (isAdmin ? accessRequests.filter((r) => r.status === 'pending') : []),
    [isAdmin, accessRequests],
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
    if (!user || !isAdmin || !notificationPreferences.coverReports) return [];
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
  }, [
    user,
    isAdmin,
    notificationPreferences.coverReports,
    openCoverReports,
    games,
    membersById,
    notifReadState,
  ]);

  const groupNotifications = useMemo<GroupActivityNotification[]>(() => {
    if (!user) return [];
    const readIdSet = new Set(notifReadState.readIds);
    const list: GroupActivityNotification[] = [];

    if (featuredRound && notificationPreferences.featuredRound) {
      const notifId = buildFeaturedRoundNotifId(featuredRound);
      const updatedMs = getTimeMillis(featuredRound.updatedAt);
      const unread =
        !readIdSet.has(notifId) && updatedMs > notifReadState.readAllBeforeMs;
      list.push({
        id: notifId,
        kind: 'featuredRound',
        title: `${featuredRound.roundLabel}: ${featuredRound.title}`,
        subtitle:
          featuredRound.note ||
          `Fixado por ${featuredRound.pinnedByName} no topo do catálogo.`,
        gameId: featuredRound.gameId || undefined,
        actorName: featuredRound.pinnedByName,
        createdAt: featuredRound.updatedAt,
        unread,
      });
    }

    if (notificationPreferences.events) {
      for (const ev of events) {
        if (ev.status === 'inactive') continue;
        const notifId = `event_${ev.id}_${ev.status}`;
        const updatedMs = getTimeMillis(ev.updatedAt || ev.createdAt);
        const unread =
          !readIdSet.has(notifId) && updatedMs > notifReadState.readAllBeforeMs;

        let title = ev.title;
        let subtitle = '';
        if (ev.status === 'nominating') {
          title = `Indicações abertas · ${ev.title}`;
          subtitle = 'Indique 1 jogo para participar deste evento do grupo.';
        } else if (ev.status === 'active') {
          title = `Votação aberta · ${ev.title}`;
          subtitle =
            ev.mode === 'award'
              ? 'Premiação ao vivo — registre seus palpites nas categorias.'
              : 'Votação do grupo aberta — escolha seus favoritos.';
        } else if (ev.status === 'closed') {
          title = `Resultados publicados · ${ev.title}`;
          subtitle =
            ev.mode === 'award'
              ? 'Confira os vencedores oficiais e o placar de acertos.'
              : 'Confira os jogos mais votados pelo grupo.';
        }

        list.push({
          id: notifId,
          kind: 'event',
          title,
          subtitle,
          eventId: ev.id,
          eventStatus: ev.status,
          actorName: ev.createdByName,
          createdAt: ev.updatedAt || ev.createdAt,
          unread,
        });
      }
    }

    list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
    return list;
  }, [
    user,
    featuredRound,
    events,
    notifReadState,
    notificationPreferences.featuredRound,
    notificationPreferences.events,
  ]);

  const accessRequestNotifications = useMemo<AccessRequestNotification[]>(() => {
    if (!user || !isAdmin) return [];
    const readIdSet = new Set(notifReadState.readIds);
    return pendingAccessRequests.map((req) => {
      const notifId = `access_${req.uid}`;
      const updatedMs = getTimeMillis(req.updatedAt || req.createdAt);
      const unread =
        !readIdSet.has(notifId) && updatedMs > notifReadState.readAllBeforeMs;
      return {
        id: notifId,
        uid: req.uid,
        displayName: req.displayName,
        photoURL: req.photoURL || '',
        createdAt: req.createdAt || req.updatedAt,
        unread,
      };
    });
  }, [user, isAdmin, pendingAccessRequests, notifReadState]);

  const unreadNotificationCount = useMemo(
    () =>
      commentNotifications.filter((n) => n.unread).length +
      coverReportNotifications.filter((n) => n.unread).length +
      accessRequestNotifications.filter((n) => n.unread).length +
      groupNotifications.filter((n) => n.unread).length,
    [
      commentNotifications,
      coverReportNotifications,
      accessRequestNotifications,
      groupNotifications,
    ],
  );

  const latestLiveNotification = useMemo(() => {
    if (!liveNotifId || !notificationPreferences.liveToasts) return null;
    return commentNotifications.find((n) => n.id === liveNotifId) || null;
  }, [commentNotifications, liveNotifId, notificationPreferences.liveToasts]);

  const latestLiveCoverReport = useMemo(() => {
    if (
      !liveCoverReportId ||
      !isAdmin ||
      !notificationPreferences.coverReports ||
      !notificationPreferences.liveToasts
    ) {
      return null;
    }
    return (
      coverReportNotifications.find((n) => n.reportId === liveCoverReportId) || null
    );
  }, [
    coverReportNotifications,
    liveCoverReportId,
    isAdmin,
    notificationPreferences.coverReports,
    notificationPreferences.liveToasts,
  ]);

  const latestLiveAccessRequest = useMemo(() => {
    if (!liveAccessRequestUid || !isAdmin || !notificationPreferences.liveToasts) {
      return null;
    }
    return (
      accessRequestNotifications.find((n) => n.uid === liveAccessRequestUid) || null
    );
  }, [
    accessRequestNotifications,
    liveAccessRequestUid,
    isAdmin,
    notificationPreferences.liveToasts,
  ]);

  const latestLiveGroupNotification = useMemo(() => {
    if (!liveGroupNotifId || !notificationPreferences.liveToasts) return null;
    return groupNotifications.find((n) => n.id === liveGroupNotifId) || null;
  }, [groupNotifications, liveGroupNotifId, notificationPreferences.liveToasts]);

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

  useEffect(() => {
    if (!liveAccessRequestUid) return;
    const timer = window.setTimeout(() => setLiveAccessRequestUid(null), 8000);
    return () => window.clearTimeout(timer);
  }, [liveAccessRequestUid]);

  useEffect(() => {
    if (!liveGroupNotifId) return;
    const timer = window.setTimeout(() => setLiveGroupNotifId(null), 7000);
    return () => window.clearTimeout(timer);
  }, [liveGroupNotifId]);

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
      ...accessRequestNotifications.map((n) => n.id),
      ...groupNotifications.map((n) => n.id),
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
    setLiveAccessRequestUid(null);
    setLiveGroupNotifId(null);
  }, [
    user,
    commentNotifications,
    coverReportNotifications,
    accessRequestNotifications,
    groupNotifications,
  ]);

  const dismissLiveNotification = useCallback(() => {
    setLiveNotifId(null);
  }, []);

  const dismissLiveCoverReport = useCallback(() => {
    setLiveCoverReportId(null);
  }, []);

  const dismissLiveAccessRequest = useCallback(() => {
    setLiveAccessRequestUid(null);
  }, []);

  const dismissLiveGroupNotification = useCallback(() => {
    setLiveGroupNotifId(null);
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

  const updateNotificationPreferences = async (
    next: Partial<NotificationPreferences>,
  ) => {
    if (!user || isBanned) return;
    const merged: NotificationPreferences = {
      ...resolveNotificationPreferences(profile?.notificationPreferences),
      ...next,
    };
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: merged,
        topFiveGames: Array.isArray(profile?.topFiveGames)
          ? profile.topFiveGames
          : [],
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
        const relatedCommentIds = new Set(relatedComments.map((c) => c.id));
        const relatedCommentReactions = commentReactions.filter(
          (cr) =>
            relatedCommentIds.has(cr.commentId) ||
            relatedReviewIds.has(cr.reviewId),
        );
        const relatedStatuses = userGameStatuses.filter((st) => st.gameId === gameId);

        await Promise.all([
          ...relatedCommentReactions.map((cr) =>
            deleteDoc(doc(db, 'commentReactions', cr.id)),
          ),
          ...relatedComments.map((c) => deleteDoc(doc(db, 'comments', c.id))),
          ...relatedReactions.map((r) => deleteDoc(doc(db, 'reactions', r.id))),
          ...relatedStatuses.map((st) => deleteDoc(doc(db, 'userGameStatuses', st.id))),
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
    const hasSpoiler = !ratingOnly && Boolean(input.hasSpoiler);
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
          hasSpoiler,
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
          hasSpoiler,
          headline: cleanHeadline,
          body: cleanBody,
          platformPlayed: cleanPlatform,
          hoursPlayed,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      if (input.playStatus) {
        await setGamePlayStatus(game.id, input.playStatus);
      } else if (
        input.playStatus === null &&
        myStatusByGame[game.id] &&
        myStatusByGame[game.id] !== 'wishlist'
      ) {
        await clearGamePlayStatus(game.id);
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
        const relatedCommentReactions = commentReactions.filter(
          (cr) => cr.reviewId === reviewId,
        );
        await Promise.all([
          ...relatedCommentReactions.map((cr) =>
            deleteDoc(doc(db, 'commentReactions', cr.id)),
          ),
          ...relatedComments.map((c) => deleteDoc(doc(db, 'comments', c.id))),
          ...relatedReactions.map((r) => deleteDoc(doc(db, 'reactions', r.id))),
        ]);
      }
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const addComment = async (
    reviewId: string,
    gameId: string,
    body: string,
    options?: {
      parentCommentId?: string;
      replyToAuthorName?: string;
      hasSpoiler?: boolean;
      mentionedUserIds?: string[];
    },
  ) => {
    if (!user || isBanned) return;
    const cleanBody = body.trim().slice(0, LIMITS.COMMENT_BODY_MAX);
    if (!cleanBody) return;

    const commentId = createSafeId('cmt');
    const path = `comments/${commentId}`;
    const payload: Record<string, unknown> = {
      reviewId,
      gameId,
      authorId: user.uid,
      authorName: getCurrentDisplayName(),
      authorPhotoURL:
        sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL),
      body: cleanBody,
      visibility: 'group' as const,
      createdAt: serverTimestamp(),
    };

    const cleanParentId = options?.parentCommentId?.trim();
    if (cleanParentId) {
      payload.parentCommentId = cleanParentId;
      const cleanReplyAuthor = options?.replyToAuthorName
        ?.trim()
        .slice(0, LIMITS.DISPLAY_NAME_MAX);
      if (cleanReplyAuthor) {
        payload.replyToAuthorName = cleanReplyAuthor;
      }
    }

    if (options?.hasSpoiler) {
      payload.hasSpoiler = true;
    }

    if (Array.isArray(options?.mentionedUserIds) && options.mentionedUserIds.length > 0) {
      const cleanMentions = Array.from(
        new Set(
          options.mentionedUserIds
            .map((uid) => uid.trim())
            .filter((uid) => uid !== user.uid && /^[a-zA-Z0-9_-]{1,128}$/.test(uid)),
        ),
      ).slice(0, LIMITS.COMMENT_MENTIONS_MAX);
      if (cleanMentions.length > 0) {
        payload.mentionedUserIds = cleanMentions;
      }
    }

    try {
      await setDoc(doc(db, 'comments', commentId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user || isBanned) return;
    const path = `comments/${commentId}`;
    try {
      const myCommentReaction = (commentReactionsByComment[commentId] || []).find(
        (cr) => cr.userId === user.uid,
      );
      if (isAdmin) {
        const relatedCommentReactions = commentReactionsByComment[commentId] || [];
        await Promise.all(
          relatedCommentReactions.map((cr) =>
            deleteDoc(doc(db, 'commentReactions', cr.id)),
          ),
        );
      } else if (myCommentReaction) {
        await deleteDoc(doc(db, 'commentReactions', myCommentReaction.id));
      }
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const toggleReaction = async (
    reviewId: string,
    type: ReactionType = 'like',
  ) => {
    if (!user || isBanned) return;
    const safeType: ReactionType = type === 'dislike' ? 'dislike' : 'like';
    const reactionId = `${reviewId}_${user.uid}`;
    const path = `reactions/${reactionId}`;
    const existingReaction = (reactionsByReview[reviewId] || []).find(
      (r) => r.userId === user.uid,
    );
    const existingNormalizedType: ReactionType | null = existingReaction
      ? existingReaction.type === 'dislike'
        ? 'dislike'
        : 'like'
      : null;

    try {
      if (existingReaction && existingNormalizedType === safeType) {
        await deleteDoc(doc(db, 'reactions', reactionId));
      } else {
        await setDoc(doc(db, 'reactions', reactionId), {
          reviewId,
          userId: user.uid,
          userName: getCurrentDisplayName(),
          type: safeType,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const toggleCommentReaction = async (
    commentId: string,
    reviewId: string,
    type: ReactionType,
  ) => {
    if (!user || isBanned) return;
    const safeType: ReactionType = type === 'dislike' ? 'dislike' : 'like';
    const reactionId = `${commentId}_${user.uid}`;
    const path = `commentReactions/${reactionId}`;
    const existingReaction = (commentReactionsByComment[commentId] || []).find(
      (r) => r.userId === user.uid,
    );

    try {
      if (existingReaction && existingReaction.type === safeType) {
        await deleteDoc(doc(db, 'commentReactions', reactionId));
      } else {
        await setDoc(doc(db, 'commentReactions', reactionId), {
          commentId,
          reviewId,
          userId: user.uid,
          userName: getCurrentDisplayName(),
          type: safeType,
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

  const updateMemberBadge = async (targetUid: string, badge: MemberBadge) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem alterar a badge de um membro.');
    }
    const safeBadge: MemberBadge =
      badge === 'guest' || badge === 'lango' ? badge : 'cobra';
    const path = `users/${targetUid}`;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        memberBadge: safeBadge,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
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
    const commentIdsToDelete = new Set(commentsToDelete.map((c) => c.id));
    const commentReactionsToDelete = commentReactions.filter(
      (cr) =>
        cr.userId === targetUid ||
        commentIdsToDelete.has(cr.commentId) ||
        memberReviewIds.has(cr.reviewId),
    );

    try {
      await Promise.all([
        ...commentReactionsToDelete.map((cr) =>
          deleteDoc(doc(db, 'commentReactions', cr.id)),
        ),
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

  const sanitizeDeadline = (raw?: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim().slice(0, LIMITS.EVENT_DEADLINE_MAX);
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(trimmed) ? trimmed : '';
  };

  const sanitizeEventStatus = (raw: EventStatus): EventStatus => {
    if (raw === 'nominating' || raw === 'active' || raw === 'closed') return raw;
    return 'inactive';
  };

  const createEvent = async (input: {
    title: string;
    description: string;
    mode?: EventMode;
    deadlineAt?: string;
    status: EventStatus;
    categories?: EventCategory[];
  }): Promise<string> => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem criar eventos.');
    }
    const cleanTitle = input.title.trim().slice(0, LIMITS.EVENT_TITLE_MAX);
    if (!cleanTitle) {
      throw new Error('Informe o nome do evento.');
    }
    const cleanDesc = input.description.trim().slice(0, LIMITS.EVENT_DESCRIPTION_MAX);
    const safeMode: EventMode = input.mode === 'poll' ? 'poll' : 'award';
    const safeDeadline = sanitizeDeadline(input.deadlineAt);
    const safeStatus = sanitizeEventStatus(input.status);
    const cleanCategories = sanitizeEventCategories(input.categories || []);

    const eventId = createSafeId('evt');
    const path = `events/${eventId}`;
    try {
      await setDoc(doc(db, 'events', eventId), {
        title: cleanTitle,
        description: cleanDesc,
        mode: safeMode,
        deadlineAt: safeDeadline,
        status: safeStatus,
        categories: cleanCategories,
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
      mode?: EventMode;
      deadlineAt?: string;
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
    const safeMode: EventMode = input.mode === 'poll' ? 'poll' : 'award';
    const safeDeadline = sanitizeDeadline(input.deadlineAt);
    const safeStatus = sanitizeEventStatus(input.status);
    const cleanCategories = sanitizeEventCategories(input.categories);

    const path = `events/${eventId}`;
    try {
      await updateDoc(doc(db, 'events', eventId), {
        title: cleanTitle,
        description: cleanDesc,
        mode: safeMode,
        deadlineAt: safeDeadline,
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
      const relatedNominations = eventNominations.filter((n) => n.eventId === eventId);
      await Promise.all([
        ...relatedVotes.map((v) => deleteDoc(doc(db, 'eventVotes', v.id))),
        ...relatedNominations.map((n) => deleteDoc(doc(db, 'eventNominations', n.id))),
      ]);
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

  const saveEventNomination = async (
    eventId: string,
    input: { gameId: string; title: string; coverUrl: string },
  ) => {
    if (!user || isBanned) {
      throw new Error('Faça login para indicar um jogo.');
    }
    const cleanTitle = input.title.trim().slice(0, LIMITS.EVENT_NOMINEE_TITLE_MAX);
    if (!cleanTitle) {
      throw new Error('Informe o jogo que deseja indicar.');
    }
    const cleanGameId =
      typeof input.gameId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(input.gameId)
        ? input.gameId
        : '';
    const cleanCoverUrl = sanitizeOptionalUrl(input.coverUrl);
    const nomId = `${eventId}_${user.uid}`;
    const nomRef = doc(db, 'eventNominations', nomId);
    const path = `eventNominations/${nomId}`;
    const userName = getCurrentDisplayName();
    const userPhotoURL =
      sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL);

    try {
      const existingSnap = await getDoc(nomRef);
      if (existingSnap.exists()) {
        await updateDoc(nomRef, {
          gameId: cleanGameId,
          title: cleanTitle,
          coverUrl: cleanCoverUrl,
          userName,
          userPhotoURL,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(nomRef, {
          eventId,
          gameId: cleanGameId,
          title: cleanTitle,
          coverUrl: cleanCoverUrl,
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

  const deleteEventNomination = async (eventId: string, targetUserId?: string) => {
    if (!user || isBanned) return;
    const uid = targetUserId && isAdmin ? targetUserId : user.uid;
    const nomId = `${eventId}_${uid}`;
    const path = `eventNominations/${nomId}`;
    try {
      await deleteDoc(doc(db, 'eventNominations', nomId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const setGamePlayStatus = async (gameId: string, status: GamePlayStatus) => {
    if (!user || isBanned) return;
    const statusId = `${gameId}_${user.uid}`;
    const statusRef = doc(db, 'userGameStatuses', statusId);
    const path = `userGameStatuses/${statusId}`;
    const userName = getCurrentDisplayName();
    const userPhotoURL =
      sanitizeOptionalUrl(profile?.photoURL) || sanitizeOptionalUrl(user.photoURL);

    try {
      const existingSnap = await getDoc(statusRef);
      if (existingSnap.exists()) {
        await updateDoc(statusRef, {
          status,
          userName,
          userPhotoURL,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(statusRef, {
          gameId,
          userId: user.uid,
          userName,
          userPhotoURL,
          status,
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const clearGamePlayStatus = async (gameId: string) => {
    if (!user || isBanned) return;
    const statusId = `${gameId}_${user.uid}`;
    const path = `userGameStatuses/${statusId}`;
    try {
      await deleteDoc(doc(db, 'userGameStatuses', statusId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const pinFeaturedRound = async (input: {
    gameId: string;
    title: string;
    coverUrl: string;
    roundLabel: string;
    eventId?: string;
    note?: string;
  }) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem fixar o Jogo da Rodada.');
    }
    const cleanTitle = input.title.trim().slice(0, LIMITS.GAME_TITLE_MAX);
    if (!cleanTitle) throw new Error('Informe o título do Jogo da Rodada.');
    const cleanLabel =
      input.roundLabel.trim().slice(0, LIMITS.FEATURED_ROUND_LABEL_MAX) || 'Jogo da Rodada';
    const cleanGameId =
      typeof input.gameId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(input.gameId)
        ? input.gameId
        : '';
    const cleanEventId =
      typeof input.eventId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(input.eventId)
        ? input.eventId
        : '';
    const cleanNote = (input.note || '').trim().slice(0, LIMITS.FEATURED_ROUND_NOTE_MAX);
    const ref = doc(db, 'groupConfig', 'featuredRound');
    const path = 'groupConfig/featuredRound';
    try {
      await setDoc(ref, {
        gameId: cleanGameId,
        title: cleanTitle,
        coverUrl: sanitizeOptionalUrl(input.coverUrl),
        roundLabel: cleanLabel,
        eventId: cleanEventId,
        note: cleanNote,
        pinnedBy: user.uid,
        pinnedByName: getCurrentDisplayName(),
        visibility: 'group' as const,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const unpinFeaturedRound = async () => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem desafixar o Jogo da Rodada.');
    }
    const path = 'groupConfig/featuredRound';
    try {
      await deleteDoc(doc(db, 'groupConfig', 'featuredRound'));
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

  const approveAccessRequest = async (req: AccessRequest) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem aprovar solicitações de acesso.');
    }
    const reviewedByName = getCurrentDisplayName();
    const userRef = doc(db, 'users', req.uid);
    const reqRef = doc(db, 'accessRequests', req.uid);
    try {
      const existingProfile = await getDoc(userRef);
      if (!existingProfile.exists()) {
        await setDoc(userRef, {
          uid: req.uid,
          displayName:
            req.displayName.trim().slice(0, LIMITS.DISPLAY_NAME_MAX) || 'Cobra',
          photoURL: sanitizeAvatarUrl(req.photoURL),
          bio: '',
          topFiveGames: [],
          visibility: 'group' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await updateDoc(reqRef, {
        status: 'approved',
        rejectionReason: '',
        reviewedBy: user.uid,
        reviewedByName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accessRequests/${req.uid}`);
    }
  };

  const rejectAccessRequest = async (targetUid: string, reason = '') => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem recusar solicitações de acesso.');
    }
    const reviewedByName = getCurrentDisplayName();
    const cleanReason = reason.trim().slice(0, LIMITS.ACCESS_REJECTION_REASON_MAX);
    const path = `accessRequests/${targetUid}`;
    try {
      await updateDoc(doc(db, 'accessRequests', targetUid), {
        status: 'rejected',
        rejectionReason: cleanReason,
        reviewedBy: user.uid,
        reviewedByName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteAccessRequest = async (targetUid: string) => {
    if (!user || !isAdmin) {
      throw new Error('Apenas administradores podem remover registros de solicitação.');
    }
    const path = `accessRequests/${targetUid}`;
    try {
      await deleteDoc(doc(db, 'accessRequests', targetUid));
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
        isRealAdmin,
        viewAsMember,
        setViewAsMember,
        toggleViewAsMember,
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
        commentReactions,
        events,
        eventVotes,
        eventNominations,
        nominationsByEvent,
        userGameStatuses,
        userStatusesByGame,
        myStatusByGame,
        featuredRound,
        accessStatus,
        myAccessRequest,
        accessRequests,
        pendingAccessRequests,
        readOnlyMode,
        enterReadOnlyMode,
        exitReadOnlyMode,
        approveAccessRequest,
        rejectAccessRequest,
        deleteAccessRequest,
        coverReports,
        openCoverReports,
        myOpenCoverReportGameIds,
        commentsByReview,
        reactionsByReview,
        commentReactionsByComment,
        commentNotifications,
        coverReportNotifications,
        accessRequestNotifications,
        groupNotifications,
        notificationPreferences,
        unreadNotificationCount,
        latestLiveNotification,
        latestLiveCoverReport,
        latestLiveAccessRequest,
        latestLiveGroupNotification,
        markNotificationRead,
        markAllNotificationsRead,
        dismissLiveNotification,
        dismissLiveCoverReport,
        dismissLiveAccessRequest,
        dismissLiveGroupNotification,
        signInWithGoogle,
        signInWithAdminCredentials,
        signOutUser,
        updateUserProfile,
        updateNotificationPreferences,
        createGame,
        updateGame,
        deleteGame,
        saveReview,
        deleteReview,
        addComment,
        deleteComment,
        toggleReaction,
        toggleCommentReaction,
        seedStarterGames,
        grantAdmin,
        revokeAdmin,
        updateMemberBadge,
        banUser,
        unbanUser,
        purgeMemberContent,
        createEvent,
        updateEvent,
        deleteEvent,
        castEventVote,
        removeEventVote,
        saveEventNomination,
        deleteEventNomination,
        setGamePlayStatus,
        clearGamePlayStatus,
        pinFeaturedRound,
        unpinFeaturedRound,
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
