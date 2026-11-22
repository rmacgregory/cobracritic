import { GENRES, LIMITS, PLATFORMS } from '../types';

export interface CoverOption {
  url: string;
  label: string;
  source: 'steam' | 'wikipedia' | 'rawg';
  orientation: 'vertical' | 'square' | 'horizontal';
}

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
  coverOptions: CoverOption[];
}

const RAWG_BASE_URL = 'https://api.rawg.io/api/games';
const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';

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
  let trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return '';
  // Strip noisy Wikimedia tracking params so URLs stay clean and compact
  if (trimmed.includes('upload.wikimedia.org') && trimmed.includes('?')) {
    trimmed = trimmed.split('?')[0];
  }
  if (trimmed.length <= LIMITS.URL_MAX) {
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

function normalizeTitleForMatch(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(\s*(?:\d{4}\s+)?video game\s*\)/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function computeTitleSimilarity(targetTitle: string, candidateTitle: string): number {
  const a = normalizeTitleForMatch(targetTitle);
  const b = normalizeTitleForMatch(candidateTitle);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.88;

  const stopWords = new Set(['the', 'of', 'and', 'in', 'a', 'an', 'for', 'to']);
  const tokensA = a.split(' ').filter((t) => t.length > 1 && !stopWords.has(t));
  const tokensB = new Set(b.split(' ').filter((t) => t.length > 1 && !stopWords.has(t)));
  if (tokensA.length === 0 || tokensB.size === 0) return 0;

  let matches = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) matches += 1;
  }
  const precision = matches / tokensB.size;
  const recall = matches / tokensA.length;
  return (precision + recall) / 2;
}

function probeImage(
  url: string,
  timeoutMs = 4500,
): Promise<{ ok: boolean; width: number; height: number }> {
  if (typeof Image === 'undefined') {
    return Promise.resolve({ ok: true, width: 600, height: 900 });
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({
        ok,
        width: ok ? img.naturalWidth : 0,
        height: ok ? img.naturalHeight : 0,
      });
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

function extractSteamAppIdFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/i);
  return match ? match[1] : null;
}

async function fetchSteamVerticalCoverByRawgId(
  gameId: number,
  apiKey: string,
): Promise<CoverOption | null> {
  try {
    const storesUrl = new URL(`${RAWG_BASE_URL}/${gameId}/stores`);
    storesUrl.searchParams.set('key', apiKey);

    const response = await fetch(storesUrl.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results?: { store_id?: number; url?: string }[];
    };

    let steamAppId: string | null = null;
    for (const entry of data.results || []) {
      const id = extractSteamAppIdFromUrl(entry.url);
      if (id) {
        steamAppId = id;
        break;
      }
    }
    if (!steamAppId) return null;

    const candidates = [
      `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900_2x.jpg`,
      `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg`,
    ];

    for (const candidateUrl of candidates) {
      const probe = await probeImage(candidateUrl, 4000);
      if (probe.ok && probe.width >= 200 && probe.height > probe.width) {
        return {
          url: candidateUrl,
          label: 'Capa vertical (Steam)',
          source: 'steam',
          orientation: 'vertical',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

interface WikiPageItem {
  title?: string;
  index?: number;
  thumbnail?: { source?: string; width?: number; height?: number };
  original?: { source?: string; width?: number; height?: number };
}

async function fetchWikipediaCoverOptions(
  title: string,
  releaseDate?: string,
): Promise<CoverOption[]> {
  const cleanTitle = title.trim();
  if (cleanTitle.length < 2) return [];

  const targetYear =
    releaseDate && /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : '';
  const lowerTarget = cleanTitle.toLowerCase();

  try {
    const url = new URL(WIKIPEDIA_API_URL);
    url.searchParams.set('action', 'query');
    url.searchParams.set('origin', '*');
    url.searchParams.set('format', 'json');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', `${cleanTitle} video game`);
    url.searchParams.set('gsrlimit', '6');
    url.searchParams.set('prop', 'pageimages');
    url.searchParams.set('pilicense', 'any');
    url.searchParams.set('piprop', 'original|thumbnail');
    url.searchParams.set('pithumbsize', '600');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5500),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      query?: { pages?: Record<string, WikiPageItem> };
    };
    const pages = Object.values(data.query?.pages || {});

    const scored: {
      score: number;
      option: CoverOption;
    }[] = [];

    for (const page of pages) {
      const pageTitle = page.title || '';
      const lowerPageTitle = pageTitle.toLowerCase();

      // Skip movies, TV shows, soundtracks, lists, and character pages
      const blockedTerms = [
        '(film)',
        ' film)',
        'soundtrack',
        'list of ',
        '(tv series)',
        '(character)',
        '(novel)',
      ];
      if (
        blockedTerms.some(
          (term) => lowerPageTitle.includes(term) && !lowerTarget.includes(term.trim()),
        )
      ) {
        continue;
      }

      const img = page.original?.source ? page.original : page.thumbnail;
      if (!img?.source || !img.width || !img.height) continue;
      if (img.width < 150 || img.height < 150) continue;

      const cleanUrl = sanitizeHttpsImageUrl(img.source);
      if (!cleanUrl || /\.svg$/i.test(cleanUrl)) continue;

      const similarity = computeTitleSimilarity(cleanTitle, pageTitle);
      if (similarity < 0.52) continue;

      const aspectRatio = img.height / img.width;
      const orientation: CoverOption['orientation'] =
        aspectRatio >= 1.12
          ? 'vertical'
          : aspectRatio >= 0.85
            ? 'square'
            : 'horizontal';

      // Ignore super wide banners/screenshots from Wikipedia
      if (aspectRatio < 0.65) continue;

      let score = similarity * 100;
      if (orientation === 'vertical') score += 35;
      else if (orientation === 'square') score += 18;
      else score -= 15;

      if (targetYear && pageTitle.includes(targetYear)) {
        score += 22;
      }
      if (lowerPageTitle.includes('video game')) {
        score += 6;
      }
      // Prefer exact cover art files over generic screenshots
      if (/cover|box|art|poster/i.test(cleanUrl)) {
        score += 10;
      }

      scored.push({
        score,
        option: {
          url: cleanUrl,
          label:
            orientation === 'vertical'
              ? 'Capa oficial (Vertical)'
              : orientation === 'square'
                ? 'Capa oficial (Quadrada)'
                : 'Capa oficial (Clássica)',
          source: 'wikipedia',
          orientation,
        },
      });
    }

    scored.sort((a, b) => b.score - a.score);

    const verified: CoverOption[] = [];
    const seenUrls = new Set<string>();
    for (const candidate of scored.slice(0, 3)) {
      if (seenUrls.has(candidate.option.url)) continue;
      const probe = await probeImage(candidate.option.url, 4000);
      if (probe.ok) {
        seenUrls.add(candidate.option.url);
        verified.push(candidate.option);
        if (verified.length >= 2) break;
      }
    }

    return verified;
  } catch {
    return [];
  }
}

function mergeAndSortCoverOptions(options: CoverOption[]): CoverOption[] {
  const rank = (opt: CoverOption): number => {
    if (opt.source === 'steam' && opt.orientation === 'vertical') return 0;
    if (opt.source === 'wikipedia' && opt.orientation === 'vertical') return 1;
    if (opt.source === 'wikipedia' && opt.orientation === 'square') return 2;
    if (opt.source === 'rawg') return 3;
    return 4;
  };

  const unique: CoverOption[] = [];
  const seen = new Set<string>();
  for (const opt of [...options].sort((a, b) => rank(a) - rank(b))) {
    if (!opt.url || seen.has(opt.url)) continue;
    seen.add(opt.url);
    unique.push(opt);
  }
  return unique;
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

  const [detailsResponse, steamCover] = await Promise.all([
    fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }),
    fetchSteamVerticalCoverByRawgId(gameId, apiKey),
  ]);

  if (!detailsResponse.ok) {
    throw new Error('Não foi possível carregar os detalhes deste jogo no RAWG.');
  }

  const item = (await detailsResponse.json()) as {
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

  const title = (item.name || '').trim().slice(0, LIMITS.GAME_TITLE_MAX);
  const devName =
    item.developers?.find((d) => d.name)?.name ||
    item.publishers?.find((p) => p.name)?.name ||
    '';

  const releaseDate =
    typeof item.released === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.released)
      ? item.released
      : '';

  const wikiCovers = await fetchWikipediaCoverOptions(title, releaseDate);

  const rawOptions: CoverOption[] = [];
  if (steamCover) rawOptions.push(steamCover);
  rawOptions.push(...wikiCovers);

  const rawgBg = sanitizeHttpsImageUrl(item.background_image);
  if (rawgBg) {
    rawOptions.push({
      url: rawgBg,
      label: 'Arte horizontal (RAWG)',
      source: 'rawg',
      orientation: 'horizontal',
    });
  }

  const coverOptions = mergeAndSortCoverOptions(rawOptions);
  const bestCoverUrl = coverOptions[0]?.url || rawgBg;

  return {
    id: item.id ?? gameId,
    title,
    developer: devName.trim().slice(0, LIMITS.DEVELOPER_MAX),
    releaseDate,
    platforms: mapRawgPlatforms(item.platforms, item.tags),
    genres: mapRawgGenres(item.genres, item.tags),
    synopsis: cleanSynopsis(item.description_raw),
    coverUrl: bestCoverUrl,
    coverOptions,
  };
}

export async function findVerticalCoversForTitle(
  title: string,
  releaseDate?: string,
): Promise<CoverOption[]> {
  const cleanTitle = title.trim();
  if (cleanTitle.length < 2) return [];

  const apiKey = getRawgApiKey();

  const steamPromise = (async (): Promise<CoverOption | null> => {
    if (!apiKey) return null;
    try {
      const results = await searchRawgGames(cleanTitle);
      if (results.length === 0) return null;
      const ranked = results
        .map((r) => ({
          result: r,
          score: computeTitleSimilarity(cleanTitle, r.title),
        }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (!best || best.score < 0.55) return null;
      return await fetchSteamVerticalCoverByRawgId(best.result.id, apiKey);
    } catch {
      return null;
    }
  })();

  const [steamCover, wikiCovers] = await Promise.all([
    steamPromise,
    fetchWikipediaCoverOptions(cleanTitle, releaseDate),
  ]);

  const combined: CoverOption[] = [];
  if (steamCover) combined.push(steamCover);
  combined.push(...wikiCovers);

  return mergeAndSortCoverOptions(combined);
}
