import { GENRES, LIMITS, PLATFORMS } from '../types';

export interface RawgSearchResult {
  id: number;
  title: string;
  releaseDate: string;
  coverUrl: string;
  platforms: string[];
  genres: string[];
}

export interface RawgGameDetails {
  id: number;
  title: string;
  developer: string;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  synopsis: string;
  coverUrl: string;
}

const RAWG_BASE_URL = 'https://api.rawg.io/api/games';

function getRawgApiKey(): string {
  return (import.meta.env.VITE_RAWG_API_KEY || '').trim();
}

function mapRawgPlatforms(
  rawPlatforms?: { platform?: { name?: string; slug?: string } }[],
  rawTags?: { slug?: string }[],
): string[] {
  const mapped = new Set<string>();
  for (const entry of rawPlatforms || []) {
    const slug = (entry.platform?.slug || '').toLowerCase();
    const name = (entry.platform?.name || '').toLowerCase();

    if (slug === 'pc' || slug === 'macos' || slug === 'linux' || name === 'pc') {
      mapped.add('PC');
    } else if (slug === 'playstation5' || name.includes('playstation 5')) {
      mapped.add('PlayStation 5');
    } else if (slug === 'playstation4' || name.includes('playstation 4')) {
      mapped.add('PlayStation 4');
    } else if (slug === 'playstation3' || name.includes('playstation 3')) {
      mapped.add('PlayStation 3');
    } else if (slug === 'playstation2' || name.includes('playstation 2')) {
      mapped.add('PlayStation 2');
    } else if (slug === 'playstation1' || name === 'playstation') {
      mapped.add('PlayStation 1');
    } else if (slug === 'psp' || name.includes('psp')) {
      mapped.add('PSP');
    } else if (slug === 'ps-vita' || name.includes('vita')) {
      mapped.add('PS Vita');
    } else if (slug === 'xbox-series-x' || name.includes('xbox series')) {
      mapped.add('Xbox Series X|S');
    } else if (slug === 'xbox-one' || name.includes('xbox one')) {
      mapped.add('Xbox One');
    } else if (slug === 'xbox360' || name.includes('xbox 360')) {
      mapped.add('Xbox 360');
    } else if (slug === 'xbox-old' || name === 'xbox') {
      mapped.add('Xbox');
    } else if (name.includes('switch 2')) {
      mapped.add('Nintendo Switch 2');
    } else if (slug === 'nintendo-switch' || name.includes('switch')) {
      mapped.add('Nintendo Switch');
    } else if (slug === 'wii-u' || name.includes('wii u')) {
      mapped.add('Wii U');
    } else if (slug === 'wii' || name === 'wii') {
      mapped.add('Nintendo Wii');
    } else if (slug === 'gamecube' || name.includes('gamecube')) {
      mapped.add('Nintendo GameCube');
    } else if (slug === 'nintendo-64' || name.includes('nintendo 64')) {
      mapped.add('Nintendo 64');
    } else if (slug === 'snes' || name.includes('snes') || name.includes('super nintendo')) {
      mapped.add('Super Nintendo (SNES)');
    } else if (slug === 'nes' || name === 'nes') {
      mapped.add('Nintendo (NES)');
    } else if (slug === 'nintendo-3ds' || name.includes('3ds')) {
      mapped.add('Nintendo 3DS');
    } else if (slug === 'nintendo-ds' || slug === 'nintendo-dsi' || name.includes('nintendo ds')) {
      mapped.add('Nintendo DS');
    } else if (slug === 'game-boy-advance' || name.includes('game boy advance')) {
      mapped.add('Game Boy Advance');
    } else if (slug === 'game-boy' || slug === 'game-boy-color' || name.includes('game boy')) {
      mapped.add('Game Boy');
    } else if (slug === 'genesis' || name.includes('genesis') || name.includes('mega drive')) {
      mapped.add('Mega Drive / Genesis');
    } else if (slug === 'sega-saturn' || name.includes('saturn')) {
      mapped.add('Sega Saturn');
    } else if (slug === 'dreamcast' || name.includes('dreamcast')) {
      mapped.add('Dreamcast');
    } else if (slug === 'ios' || slug === 'android') {
      mapped.add('Mobile');
    } else if (
      slug.includes('atari') ||
      slug.includes('sega') ||
      slug.includes('neo-geo') ||
      slug.includes('commodore')
    ) {
      mapped.add('Retro');
    }
  }

  for (const tag of rawTags || []) {
    const slug = (tag.slug || '').toLowerCase();
    if (slug.includes('steam-deck')) {
      mapped.add('Steam Deck');
    }
  }

  const ordered = PLATFORMS.filter((p) => mapped.has(p));
  return ordered.length > 0 ? ordered.slice(0, LIMITS.PLATFORMS_MAX) : ['PC'];
}

function mapRawgGenres(
  rawGenres?: { name?: string; slug?: string }[],
  rawTags?: { name?: string; slug?: string }[],
): string[] {
  const mapped = new Set<string>();
  const genreSlugs = (rawGenres || []).map((g) => (g.slug || '').toLowerCase());
  const tagSlugs = (rawTags || []).map((t) => (t.slug || '').toLowerCase());

  for (const slug of genreSlugs) {
    if (slug.includes('role-playing') || slug === 'rpg') mapped.add('RPG');
    if (slug === 'action') mapped.add('Ação');
    if (slug === 'adventure') mapped.add('Aventura');
    if (slug === 'indie') mapped.add('Indie');
    if (slug === 'strategy' || slug === 'board-games' || slug === 'card') {
      mapped.add('Estratégia');
    }
    if (slug === 'shooter') mapped.add('FPS');
    if (slug === 'platformer') mapped.add('Plataforma');
    if (slug === 'racing') mapped.add('Corrida');
    if (slug === 'fighting') mapped.add('Luta');
    if (slug === 'sports') mapped.add('Esportes');
    if (slug === 'simulation') mapped.add('Simulação');
    if (slug === 'puzzle') mapped.add('Quebra-Cabeça');
  }

  for (const slug of tagSlugs) {
    if (slug === 'metroidvania') mapped.add('Metroidvania');
    if (slug === 'roguelike' || slug === 'roguelite') mapped.add('Roguelike');
    if (slug === 'horror' || slug === 'survival-horror') mapped.add('Terror');
    if (slug === 'survival') mapped.add('Sobrevivência');
    if (slug === 'fps' || slug === 'first-person-shooter') mapped.add('FPS');
  }

  const ordered = GENRES.filter((g) => mapped.has(g));
  return ordered.length > 0 ? ordered.slice(0, LIMITS.GENRES_MAX) : ['Ação'];
}

function sanitizeHttpsImageUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') && trimmed.length <= LIMITS.URL_MAX) {
    return trimmed;
  }
  return '';
}

function cleanSynopsis(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const maxLen = LIMITS.SYNOPSIS_MAX - 20;
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 3).trimEnd()}...`;
}

export async function searchRawgGames(query: string): Promise<RawgSearchResult[]> {
  const apiKey = getRawgApiKey();
  if (!apiKey) {
    throw new Error(
      'Chave do RAWG não encontrada no build. Verifique o secret RAWG_API no GitHub Actions (ou VITE_RAWG_API_KEY no ambiente).',
    );
  }

  const cleanQuery = query.trim();
  if (cleanQuery.length < 2 || cleanQuery.length > 100) {
    throw new Error('Digite entre 2 e 100 caracteres para buscar no catálogo RAWG.');
  }

  const url = new URL(RAWG_BASE_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('search', cleanQuery);
  url.searchParams.set('page_size', '8');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error('Não foi possível consultar o catálogo RAWG no momento.');
  }

  const data = (await response.json()) as {
    results?: {
      id?: number;
      name?: string;
      released?: string | null;
      background_image?: string | null;
      platforms?: { platform?: { name?: string; slug?: string } }[];
      genres?: { name?: string; slug?: string }[];
      tags?: { name?: string; slug?: string }[];
    }[];
  };

  return (data.results || [])
    .filter((item) => typeof item.id === 'number' && typeof item.name === 'string')
    .map((item) => ({
      id: item.id as number,
      title: (item.name || '').trim().slice(0, LIMITS.GAME_TITLE_MAX),
      releaseDate:
        typeof item.released === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.released)
          ? item.released
          : '',
      coverUrl: sanitizeHttpsImageUrl(item.background_image),
      platforms: mapRawgPlatforms(item.platforms, item.tags),
      genres: mapRawgGenres(item.genres, item.tags),
    }));
}

export async function getRawgGameDetails(gameId: number): Promise<RawgGameDetails> {
  const apiKey = getRawgApiKey();
  if (!apiKey) {
    throw new Error(
      'Chave do RAWG não encontrada no build. Verifique o secret RAWG_API no GitHub Actions.',
    );
  }

  const idStr = String(gameId);
  if (!/^\d{1,10}$/.test(idStr)) {
    throw new Error('Identificador de jogo inválido.');
  }

  const url = new URL(`${RAWG_BASE_URL}/${idStr}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error('Não foi possível carregar os detalhes deste jogo no RAWG.');
  }

  const item = (await response.json()) as {
    id?: number;
    name?: string;
    released?: string | null;
    description_raw?: string | null;
    background_image?: string | null;
    developers?: { name?: string }[];
    publishers?: { name?: string }[];
    platforms?: { platform?: { name?: string; slug?: string } }[];
    genres?: { name?: string; slug?: string }[];
    tags?: { name?: string; slug?: string }[];
  };

  const devName =
    item.developers?.find((d) => d.name)?.name ||
    item.publishers?.find((p) => p.name)?.name ||
    '';

  const releaseDate =
    typeof item.released === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.released)
      ? item.released
      : '';

  return {
    id: item.id ?? gameId,
    title: (item.name || '').trim().slice(0, LIMITS.GAME_TITLE_MAX),
    developer: devName.trim().slice(0, LIMITS.DEVELOPER_MAX),
    releaseDate,
    platforms: mapRawgPlatforms(item.platforms, item.tags),
    genres: mapRawgGenres(item.genres, item.tags),
    synopsis: cleanSynopsis(item.description_raw),
    coverUrl: sanitizeHttpsImageUrl(item.background_image),
  };
}
