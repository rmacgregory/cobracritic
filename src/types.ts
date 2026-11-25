import type { Timestamp } from 'firebase/firestore';

export const COBRA_LOGO_PATH = '/assets/aistudio/cobracritic_logo_png_350f92ce.png';
export const MASTER_ADMIN_EMAIL = 'kaorurou@gmail.com';
export const ADMIN_AUTH_DOMAIN = 'cobracritic.local';

export const LIMITS = {
  DISPLAY_NAME_MAX: 80,
  BIO_MAX: 240,
  GENRE_MAX: 40,
  URL_MAX: 500,
  AVATAR_DATA_URL_MAX: 65000,
  TOP_FIVE_MAX: 5,
  TOP_FIVE_TITLE_MAX: 120,
  BAN_REASON_MAX: 300,
  ACCESS_REJECTION_REASON_MAX: 300,
  GAME_TITLE_MAX: 120,
  DEVELOPER_MAX: 100,
  SYNOPSIS_MAX: 1200,
  PLATFORMS_MAX: 8,
  GENRES_MAX: 5,
  HEADLINE_MIN: 2,
  HEADLINE_MAX: 140,
  REVIEW_BODY_MIN: 10,
  REVIEW_BODY_MAX: 4000,
  COMMENT_BODY_MAX: 1000,
  HOURS_MAX: 10000,
  RELEASE_YEAR_MIN: 1970,
  RELEASE_YEAR_MAX: 2035,
  EVENT_TITLE_MAX: 120,
  EVENT_DESCRIPTION_MAX: 500,
  EVENT_CATEGORIES_MAX: 30,
  EVENT_CATEGORY_NAME_MAX: 100,
  EVENT_NOMINEES_MAX: 16,
  EVENT_NOMINEE_TITLE_MAX: 120,
  EVENT_DEADLINE_MAX: 32,
  COVER_REPORT_NOTE_MAX: 300,
  FEATURED_ROUND_LABEL_MAX: 80,
  FEATURED_ROUND_NOTE_MAX: 240,
  COMMENT_MENTIONS_MAX: 8,
} as const;

export const BAYESIAN_WEIGHT_PRIOR = 3;

export function computeWeightedScore(
  rawAverage: number,
  reviewCount: number,
  globalMean: number,
): number {
  if (reviewCount <= 0) return 0;
  const m = BAYESIAN_WEIGHT_PRIOR;
  const priorMean = Math.min(globalMean, 75);
  return (reviewCount / (reviewCount + m)) * rawAverage + (m / (reviewCount + m)) * priorMean;
}

export const PLATFORMS = [
  'PC',
  'Steam Deck',
  'PlayStation 5',
  'PlayStation 4',
  'PlayStation 3',
  'PlayStation 2',
  'PlayStation 1',
  'PSP',
  'PS Vita',
  'Xbox Series X|S',
  'Xbox One',
  'Xbox 360',
  'Xbox',
  'Nintendo Switch 2',
  'Nintendo Switch',
  'Wii U',
  'Nintendo Wii',
  'Nintendo GameCube',
  'Nintendo 64',
  'Super Nintendo (SNES)',
  'Nintendo (NES)',
  'Nintendo 3DS',
  'Nintendo DS',
  'Game Boy Advance',
  'Game Boy',
  'Mega Drive / Genesis',
  'Sega Saturn',
  'Dreamcast',
  'Mobile',
  'Retro',
] as const;

export const GENRES = [
  'RPG',
  'Ação',
  'Aventura',
  'Indie',
  'Estratégia',
  'FPS',
  'Metroidvania',
  'Roguelike',
  'Terror',
  'Sobrevivência',
  'Plataforma',
  'Corrida',
  'Luta',
  'Esportes',
  'Simulação',
  'Quebra-Cabeça',
] as const;

export interface CuratedCover {
  id: string;
  label: string;
  url: string;
}

export const CURATED_COVERS: CuratedCover[] = [
  {
    id: 'hollow_citadel',
    label: 'Fantasia Sombria',
    url: '/src/assets/images/cover_hollow_citadel_1795371064773.jpg',
  },
  {
    id: 'solar_drift',
    label: 'Exploração Espacial',
    url: '/src/assets/images/cover_solar_drift_1795371067726.jpg',
  },
  {
    id: 'botanica_tactics',
    label: 'Tática & Aventura',
    url: '/src/assets/images/cover_botanica_tactics_1795371065496.jpg',
  },
  {
    id: 'apex_tarmac',
    label: 'Corrida & Asfalto',
    url: '/src/assets/images/cover_apex_tarmac_1795371135799.jpg',
  },
];

export interface NotificationPreferences {
  comments: boolean;
  mentions: boolean;
  featuredRound: boolean;
  events: boolean;
  coverReports: boolean;
  liveToasts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  comments: true,
  mentions: true,
  featuredRound: true,
  events: true,
  coverReports: true,
  liveToasts: true,
};

export function resolveNotificationPreferences(
  raw?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  return {
    comments: raw?.comments ?? DEFAULT_NOTIFICATION_PREFERENCES.comments,
    mentions: raw?.mentions ?? DEFAULT_NOTIFICATION_PREFERENCES.mentions,
    featuredRound:
      raw?.featuredRound ?? DEFAULT_NOTIFICATION_PREFERENCES.featuredRound,
    events: raw?.events ?? DEFAULT_NOTIFICATION_PREFERENCES.events,
    coverReports:
      raw?.coverReports ?? DEFAULT_NOTIFICATION_PREFERENCES.coverReports,
    liveToasts: raw?.liveToasts ?? DEFAULT_NOTIFICATION_PREFERENCES.liveToasts,
  };
}

export type MemberBadge = 'cobra' | 'guest';

export const MEMBER_BADGE_META: Record<
  MemberBadge,
  {
    label: string;
    shortLabel: string;
    textClass: string;
    pillClass: string;
    activeButtonClass: string;
  }
> = {
  cobra: {
    label: 'Membro dos Cobras',
    shortLabel: 'Cobra',
    textClass: 'text-[#4ADE80]',
    pillClass: 'text-[#4ADE80] bg-[#16291D] border-[#22543D]',
    activeButtonClass: 'bg-[#142218] border-[#22543D] text-[#4ADE80]',
  },
  guest: {
    label: 'Convidado',
    shortLabel: 'Convidado',
    textClass: 'text-[#60A5FA]',
    pillClass: 'text-[#93C5FD] bg-[#121D2D] border-[#2A4C7C]',
    activeButtonClass: 'bg-[#121D2D] border-[#2A4C7C] text-[#93C5FD]',
  },
};

export function getMemberBadgeMeta(badge?: MemberBadge | null) {
  return MEMBER_BADGE_META[badge === 'guest' ? 'guest' : 'cobra'];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  topFiveGames?: string[];
  favoriteGenre?: string;
  notificationPreferences?: NotificationPreferences;
  memberBadge?: MemberBadge;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Game {
  id: string;
  title: string;
  developer: string;
  releaseDate: string; // YYYY-MM-DD
  releaseYear: number;
  platforms: string[];
  genres: string[];
  synopsis: string;
  coverUrl: string;
  createdBy: string;
  createdByName: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Review {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCoverUrl: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  score: number; // 0..100 integer
  ratingOnly?: boolean;
  hasSpoiler?: boolean;
  headline: string;
  body: string;
  platformPlayed: string;
  hoursPlayed: number;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  gameId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  body: string;
  parentCommentId?: string;
  replyToAuthorName?: string;
  hasSpoiler?: boolean;
  mentionedUserIds?: string[];
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export type ReactionType = 'like' | 'dislike';

export interface ReviewReaction {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  type: 'agree' | ReactionType;
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export interface CommentReaction {
  id: string;
  commentId: string;
  reviewId: string;
  userId: string;
  userName: string;
  type: ReactionType;
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export interface AdminGrant {
  uid: string;
  displayName: string;
  role: 'admin';
  grantedBy: string;
  grantedByName: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export interface UserBan {
  uid: string;
  displayName: string;
  reason: string;
  bannedBy: string;
  bannedByName: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export type EventStatus = 'nominating' | 'active' | 'inactive' | 'closed';

export type EventMode = 'poll' | 'award';

export interface EventNominee {
  id: string;
  gameId: string;
  title: string;
  coverUrl: string;
}

export interface EventCategory {
  id: string;
  name: string;
  nominees: EventNominee[];
  winnerNomineeId: string;
}

export interface CobraEvent {
  id: string;
  title: string;
  description: string;
  mode?: EventMode;
  deadlineAt?: string; // YYYY-MM-DDTHH:mm or ''
  status: EventStatus;
  categories: EventCategory[];
  createdBy: string;
  createdByName: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface EventVote {
  id: string;
  eventId: string;
  categoryId: string;
  nomineeId: string;
  nomineeTitle: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface EventNomination {
  id: string;
  eventId: string;
  gameId: string;
  title: string;
  coverUrl: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type GamePlayStatus = 'playing' | 'completed' | 'platinum' | 'wishlist' | 'dropped';

export type GameProgressStatus = Exclude<GamePlayStatus, 'wishlist'>;

export const GAME_PROGRESS_STATUS_LIST: readonly GameProgressStatus[] = [
  'playing',
  'completed',
  'platinum',
  'dropped',
] as const;

export const GAME_PLAY_STATUS_LIST: readonly GamePlayStatus[] = [
  'playing',
  'completed',
  'platinum',
  'dropped',
  'wishlist',
] as const;

export const GAME_PLAY_STATUS_META: Record<
  GamePlayStatus,
  { label: string; shortLabel: string; colorClass: string; activeClass: string }
> = {
  playing: {
    label: 'Jogando',
    shortLabel: 'Jogando',
    colorClass: 'text-[#4ADE80]',
    activeClass: 'bg-[#13261A] border-[#2C6B41] text-[#4ADE80]',
  },
  completed: {
    label: 'Zerado',
    shortLabel: 'Zerado',
    colorClass: 'text-[#60A5FA]',
    activeClass: 'bg-[#121D2D] border-[#2A4C7C] text-[#93C5FD]',
  },
  platinum: {
    label: 'Platinado',
    shortLabel: 'Platinado',
    colorClass: 'text-[#FBBF24]',
    activeClass: 'bg-[#261E0F] border-[#66511D] text-[#FDE68A]',
  },
  wishlist: {
    label: 'Quero jogar',
    shortLabel: 'Quero jogar',
    colorClass: 'text-[#C084FC]',
    activeClass: 'bg-[#20162B] border-[#533378] text-[#D8B4FE]',
  },
  dropped: {
    label: 'Langado',
    shortLabel: 'Langado',
    colorClass: 'text-[#F87171]',
    activeClass: 'bg-[#261414] border-[#5B2727] text-[#FCA5A5]',
  },
};

export interface UserGameStatus {
  id: string;
  gameId: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  status: GamePlayStatus;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FeaturedRoundGame {
  id: string;
  gameId: string;
  title: string;
  coverUrl: string;
  roundLabel: string;
  eventId: string;
  note: string;
  pinnedBy: string;
  pinnedByName: string;
  visibility: 'group';
  updatedAt?: Timestamp | null;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequest {
  uid: string;
  displayName: string;
  photoURL: string;
  status: AccessRequestStatus;
  rejectionReason: string;
  reviewedBy: string;
  reviewedByName: string;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type CoverReportStatus = 'open' | 'resolved';

export interface CoverReport {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCoverUrl: string;
  reporterId: string;
  reporterName: string;
  reporterPhotoURL: string;
  note: string;
  status: CoverReportStatus;
  visibility: 'group';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface GameWithStats extends Game {
  averageScore: number | null;
  weightedScore: number | null;
  reviewCount: number;
  positiveCount: number;
  mixedCount: number;
  negativeCount: number;
  minScore: number | null;
  maxScore: number | null;
  stdDev: number;
  reviews: Review[];
}

export interface GameInput {
  title: string;
  developer: string;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  synopsis: string;
  coverUrl: string;
}

export interface ReviewInput {
  score: number;
  ratingOnly?: boolean;
  hasSpoiler?: boolean;
  headline: string;
  body: string;
  platformPlayed: string;
  hoursPlayed: number;
  playStatus?: GameProgressStatus | null;
}

export interface ScoreMeta {
  label: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  accentTextClass: string;
  barClass: string;
  tier: 'acclaim' | 'favorable' | 'mixed' | 'unfavorable' | 'none';
}

export function getScoreMeta(score: number | null): ScoreMeta {
  if (score === null || Number.isNaN(score)) {
    return {
      label: 'Aguardando avaliações',
      shortLabel: 'Sem nota',
      bgClass: 'bg-[#252925]',
      textClass: 'text-[#A8ACA5]',
      accentTextClass: 'text-[#A8ACA5]',
      barClass: 'bg-[#3A3F3A]',
      tier: 'none',
    };
  }
  if (score >= 90) {
    return {
      label: 'Aclamação Universal',
      shortLabel: 'Aclamação',
      bgClass: 'bg-[#15803D]',
      textClass: 'text-white',
      accentTextClass: 'text-[#4ADE80]',
      barClass: 'bg-[#16A34A]',
      tier: 'acclaim',
    };
  }
  if (score >= 75) {
    return {
      label: 'Geralmente Favorável',
      shortLabel: 'Favorável',
      bgClass: 'bg-[#1E8E49]',
      textClass: 'text-white',
      accentTextClass: 'text-[#4ADE80]',
      barClass: 'bg-[#22C55E]',
      tier: 'favorable',
    };
  }
  if (score >= 50) {
    return {
      label: 'Críticas Mistas',
      shortLabel: 'Misto',
      bgClass: 'bg-[#B45309]',
      textClass: 'text-white',
      accentTextClass: 'text-[#FBBF24]',
      barClass: 'bg-[#D97706]',
      tier: 'mixed',
    };
  }
  return {
    label: 'Geralmente Desfavorável',
    shortLabel: 'Desfavorável',
    bgClass: 'bg-[#B91C1C]',
    textClass: 'text-white',
    accentTextClass: 'text-[#F87171]',
    barClass: 'bg-[#EF4444]',
    tier: 'unfavorable',
  };
}

export function formatReleaseDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  const monthLabel = months[(month || 1) - 1] || 'jan';
  return `${String(day).padStart(2, '0')} ${monthLabel} ${year}`;
}

export function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'agora';
  const date = ts.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function sanitizeOptionalUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim().slice(0, LIMITS.URL_MAX);
  if (trimmed === '') return '';
  if (trimmed.startsWith('https://')) return trimmed;
  if (/^\/src\/assets\/images\/[a-zA-Z0-9_\-.]+$/.test(trimmed)) return trimmed;
  return '';
}

export function sanitizeAvatarUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed.startsWith('https://') && trimmed.length <= LIMITS.URL_MAX) {
    return trimmed;
  }
  if (
    trimmed.length <= LIMITS.AVATAR_DATA_URL_MAX &&
    /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  ) {
    return trimmed;
  }
  return '';
}

export function resolveAssetUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/assets/')) {
    const base = import.meta.env.BASE_URL || './';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${trimmed.slice(1)}`;
  }
  return trimmed;
}

export const STARTER_GAMES: GameInput[] = [
  {
    title: 'Citadel of Silver Ash',
    developer: 'Nocturne Foundry',
    releaseDate: '2025-10-18',
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
    genres: ['RPG', 'Ação'],
    synopsis:
      'Um RPG de ação sombrio ambientado nas ruínas verticais de uma catedral gótica tomada pela névoa prateada. Combate metódico focado em postura, exploração interconectada e escolhas que alteram o destino da expedição.',
    coverUrl: CURATED_COVERS[0].url,
  },
  {
    title: 'Solar Drift: Horizon IX',
    developer: 'Meridian Works',
    releaseDate: '2026-02-14',
    platforms: ['PC', 'PlayStation 5', 'Steam Deck'],
    genres: ['Aventura', 'Indie'],
    synopsis:
      'Expedição contemplativa em um arquipélago oceânico sob a sombra de um gigante gasoso. Decifre transmissões antigas, mapeie correntes marítimas e reconstrua a história da colônia perdida.',
    coverUrl: CURATED_COVERS[1].url,
  },
  {
    title: 'Observatório Botânico',
    developer: 'Estúdio Verbena',
    releaseDate: '2024-06-21',
    platforms: ['PC', 'Nintendo Switch', 'Steam Deck'],
    genres: ['Estratégia', 'Indie', 'Quebra-Cabeça'],
    synopsis:
      'Tática por turnos pintada à mão onde cada estação do ano transforma rios, pontes e rotas de planadores em torno de um observatório secular suspenso entre cachoeiras.',
    coverUrl: CURATED_COVERS[2].url,
  },
  {
    title: 'Apex Tarmac: Endurance',
    developer: 'Monolith Motorsport',
    releaseDate: '2025-04-04',
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S'],
    genres: ['Corrida', 'Simulação'],
    synopsis:
      'Simulação de corridas de resistência em estradas alpinas e circuitos noturnos sob chuva dinâmica. Física de pneus exigente, desgaste mecânico real e foco total em voltas limpas.',
    coverUrl: CURATED_COVERS[3].url,
  },
];

export type ActiveTab =
  | 'home'
  | 'catalog'
  | 'feed'
  | 'events'
  | 'ranking'
  | 'retrospective'
  | 'members'
  | 'profile'
  | 'admin';
