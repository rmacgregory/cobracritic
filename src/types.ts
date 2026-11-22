import type { Timestamp } from 'firebase/firestore';

export const LIMITS = {
  DISPLAY_NAME_MAX: 80,
  BIO_MAX: 240,
  GENRE_MAX: 40,
  URL_MAX: 500,
  AVATAR_DATA_URL_MAX: 65000,
  TOP_FIVE_MAX: 5,
  TOP_FIVE_TITLE_MAX: 120,
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
} as const;

export const PLATFORMS = [
  'PC',
  'PlayStation 5',
  'Xbox Series X|S',
  'Nintendo Switch',
  'PlayStation 4',
  'Steam Deck',
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
  'Plataforma',
  'Corrida',
  'Luta',
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

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  topFiveGames?: string[];
  favoriteGenre?: string;
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
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export interface ReviewReaction {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  type: 'agree';
  visibility: 'group';
  createdAt?: Timestamp | null;
}

export interface GameWithStats extends Game {
  averageScore: number | null;
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
  headline: string;
  body: string;
  platformPlayed: string;
  hoursPlayed: number;
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

export type ActiveTab = 'catalog' | 'feed' | 'ranking' | 'members' | 'profile';
