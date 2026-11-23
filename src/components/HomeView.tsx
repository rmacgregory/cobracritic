import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  LayoutGrid,
  MessageSquare,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  Shuffle,
  ThumbsUp,
  Trophy,
  Vote,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  GAME_PLAY_STATUS_META,
  formatReleaseDate,
  formatTimestamp,
  resolveAssetUrl,
  type CobraEvent,
  type GameProgressStatus,
  type GameWithStats,
  type Review,
} from '../types';
import { FeaturedRoundBanner } from './FeaturedRoundBanner';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
import { ScoreBadge } from './ScoreBadge';

interface HomeViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (uid: string) => void;
  onOpenReview: (game: GameWithStats) => void;
  onOpenNewGame: () => void;
  onGoToCatalog: () => void;
  onGoToFeed: () => void;
  onGoToEvents: (eventId?: string) => void;
}

const TRENDING_WINDOW_MS = 48 * 60 * 60 * 1000;
const POSITIVE_SCORE_THRESHOLD = 75;
const ROTATION_INTERVAL_MS = 7500;

interface TrendingGameEntry {
  game: GameWithStats;
  positiveReviews48h: number;
  comments48h: number;
  heatScore: number;
  latestActivityMs: number;
  latestActivityTs: GameWithStats['createdAt'];
}

type BannerSlide =
  | {
      id: string;
      kind: 'topGame';
      shortLabel: string;
      game: GameWithStats;
      backdropUrl: string;
    }
  | {
      id: string;
      kind: 'review';
      shortLabel: string;
      review: Review;
      game: GameWithStats | null;
      authorName: string;
      authorPhotoURL: string;
      authorFallbackPhotoURL: string;
      authorPlayStatus: GameProgressStatus | null;
      backdropUrl: string;
    }
  | {
      id: string;
      kind: 'event';
      shortLabel: string;
      event: CobraEvent;
      backdropUrl: string;
    };

function resolveEventTimeMs(
  ts: { toMillis?: () => number } | null | undefined,
  fallbackNowMs: number,
): number {
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts === null) return fallbackNowMs;
  return 0;
}

function formatDeadlineCountdown(
  deadlineAt: string | undefined,
  nowMs: number,
): { text: string; expired: boolean } | null {
  if (!deadlineAt) return null;
  const targetMs = new Date(deadlineAt).getTime();
  if (Number.isNaN(targetMs)) return null;
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return { text: 'Prazo encerrado', expired: true };
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) {
    return { text: `Encerra em ${days}d ${hours}h`, expired: false };
  }
  if (hours >= 1) {
    return { text: `Encerra em ${hours}h ${minutes}min`, expired: false };
  }
  return { text: `Encerra em ${Math.max(1, minutes)} min`, expired: false };
}

export function HomeView({
  onSelectGame,
  onSelectMember,
  onOpenReview,
  onOpenNewGame,
  onGoToCatalog,
  onGoToFeed,
  onGoToEvents,
}: HomeViewProps) {
  const {
    user,
    gamesWithStats,
    reviews,
    comments,
    events,
    eventVotes,
    nominationsByEvent,
    membersById,
    userStatusesByGame,
    dataLoading,
    seedStarterGames,
  } = useVeredito();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [seeding, setSeeding] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [backdropBroken, setBackdropBroken] = useState(false);

  // Shuffled queue for non-repeating random auto-rotation
  const randomQueueRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const topRatedGame = useMemo(() => {
    if (gamesWithStats.length === 0) return null;
    const rated = gamesWithStats.filter((g) => g.weightedScore !== null);
    if (rated.length > 0) {
      return [...rated].sort((a, b) => {
        if ((b.weightedScore ?? -1) !== (a.weightedScore ?? -1)) {
          return (b.weightedScore ?? -1) - (a.weightedScore ?? -1);
        }
        if (b.reviewCount !== a.reviewCount) {
          return b.reviewCount - a.reviewCount;
        }
        return (b.averageScore ?? -1) - (a.averageScore ?? -1);
      })[0];
    }
    return gamesWithStats[0];
  }, [gamesWithStats]);

  const ongoingEvents = useMemo(() => {
    const priority: Record<'nominating' | 'active', number> = {
      active: 0,
      nominating: 1,
    };
    return events
      .filter(
        (ev): ev is CobraEvent & { status: 'nominating' | 'active' } =>
          ev.status === 'active' || ev.status === 'nominating',
      )
      .sort((a, b) => priority[a.status] - priority[b.status]);
  }, [events]);

  const slides = useMemo<BannerSlide[]>(() => {
    const list: BannerSlide[] = [];

    if (topRatedGame) {
      list.push({
        id: `top_${topRatedGame.id}`,
        kind: 'topGame',
        shortLabel: 'Top 1',
        game: topRatedGame,
        backdropUrl: topRatedGame.coverUrl || '',
      });
    }

    for (const ev of ongoingEvents.slice(0, 3)) {
      const firstCover =
        ev.categories
          .flatMap((c) => c.nominees)
          .find((n) => Boolean(n.coverUrl))?.coverUrl ||
        (nominationsByEvent[ev.id] || []).find((n) => Boolean(n.coverUrl))
          ?.coverUrl ||
        '';
      list.push({
        id: `event_${ev.id}`,
        kind: 'event',
        shortLabel: ev.status === 'nominating' ? 'Indicações' : 'Votação',
        event: ev,
        backdropUrl: firstCover,
      });
    }

    for (const rev of reviews.slice(0, 5)) {
      const game = gamesById.get(rev.gameId) || null;
      const liveAuthor = membersById[rev.authorId];
      const statusEntry = (userStatusesByGame[rev.gameId] || []).find(
        (item) => item.userId === rev.authorId,
      );
      const authorPlayStatus: GameProgressStatus | null =
        statusEntry && statusEntry.status !== 'wishlist' ? statusEntry.status : null;
      list.push({
        id: `review_${rev.id}`,
        kind: 'review',
        shortLabel: rev.ratingOnly ? 'Nova nota' : 'Nova crítica',
        review: rev,
        game,
        authorName: liveAuthor?.displayName || rev.authorName,
        authorPhotoURL: liveAuthor?.photoURL || '',
        authorFallbackPhotoURL: rev.authorPhotoURL || '',
        authorPlayStatus,
        backdropUrl: game?.coverUrl || rev.gameCoverUrl || '',
      });
    }

    return list;
  }, [
    topRatedGame,
    ongoingEvents,
    nominationsByEvent,
    reviews,
    gamesById,
    membersById,
    userStatusesByGame,
  ]);

  useEffect(() => {
    if (activeSlideIndex >= slides.length) {
      setActiveSlideIndex(0);
    }
    randomQueueRef.current = [];
  }, [slides.length, activeSlideIndex]);

  const currentSlide = slides[activeSlideIndex] || slides[0] || null;

  useEffect(() => {
    setBackdropBroken(false);
  }, [currentSlide?.id]);

  const pickNextRandomIndex = useCallback(
    (currentIdx: number, total: number): number => {
      if (total <= 1) return 0;
      let queue = randomQueueRef.current.filter(
        (idx) => idx >= 0 && idx < total && idx !== currentIdx,
      );
      if (queue.length === 0) {
        const indices: number[] = [];
        for (let i = 0; i < total; i += 1) {
          if (i !== currentIdx) indices.push(i);
        }
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = indices[i];
          indices[i] = indices[j];
          indices[j] = tmp;
        }
        queue = indices;
      }
      const next = queue.shift() ?? 0;
      randomQueueRef.current = queue;
      return next;
    },
    [],
  );

  useEffect(() => {
    if (slides.length <= 1 || isPaused || isHovered) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => pickNextRandomIndex(prev, slides.length));
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused, isHovered, pickNextRandomIndex]);

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleShuffleSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlideIndex((prev) => pickNextRandomIndex(prev, slides.length));
  };

  const trendingGames = useMemo<TrendingGameEntry[]>(() => {
    const cutoffMs = nowMs - TRENDING_WINDOW_MS;
    const activityMap = new Map<
      string,
      {
        positiveReviews48h: number;
        comments48h: number;
        latestActivityMs: number;
        latestActivityTs: GameWithStats['createdAt'];
      }
    >();

    const ensureEntry = (gameId: string) => {
      let entry = activityMap.get(gameId);
      if (!entry) {
        entry = {
          positiveReviews48h: 0,
          comments48h: 0,
          latestActivityMs: 0,
          latestActivityTs: null,
        };
        activityMap.set(gameId, entry);
      }
      return entry;
    };

    for (const review of reviews) {
      if (!gamesById.has(review.gameId)) continue;
      if (review.score < POSITIVE_SCORE_THRESHOLD) continue;
      const reviewTs = review.updatedAt ?? review.createdAt;
      const timeMs = resolveEventTimeMs(reviewTs, nowMs);
      if (timeMs < cutoffMs) continue;
      const entry = ensureEntry(review.gameId);
      entry.positiveReviews48h += 1;
      if (timeMs >= entry.latestActivityMs) {
        entry.latestActivityMs = timeMs;
        entry.latestActivityTs = reviewTs ?? null;
      }
    }

    for (const comment of comments) {
      if (!gamesById.has(comment.gameId)) continue;
      const timeMs = resolveEventTimeMs(comment.createdAt, nowMs);
      if (timeMs < cutoffMs) continue;
      const entry = ensureEntry(comment.gameId);
      entry.comments48h += 1;
      if (timeMs >= entry.latestActivityMs) {
        entry.latestActivityMs = timeMs;
        entry.latestActivityTs = comment.createdAt ?? null;
      }
    }

    const results: TrendingGameEntry[] = [];
    for (const [gameId, stats] of activityMap.entries()) {
      const game = gamesById.get(gameId);
      if (!game) continue;
      if (stats.positiveReviews48h === 0 && stats.comments48h === 0) continue;
      const heatScore = stats.positiveReviews48h * 3 + stats.comments48h;
      results.push({
        game,
        positiveReviews48h: stats.positiveReviews48h,
        comments48h: stats.comments48h,
        heatScore,
        latestActivityMs: stats.latestActivityMs,
        latestActivityTs: stats.latestActivityTs,
      });
    }

    return results
      .sort((a, b) => {
        if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore;
        if (b.positiveReviews48h !== a.positiveReviews48h) {
          return b.positiveReviews48h - a.positiveReviews48h;
        }
        if (b.comments48h !== a.comments48h) {
          return b.comments48h - a.comments48h;
        }
        if (b.latestActivityMs !== a.latestActivityMs) {
          return b.latestActivityMs - a.latestActivityMs;
        }
        return (b.game.weightedScore ?? -1) - (a.game.weightedScore ?? -1);
      })
      .slice(0, 6);
  }, [gamesById, reviews, comments, nowMs]);

  const votesByEvent = useMemo(() => {
    const map: Record<string, typeof eventVotes> = {};
    for (const v of eventVotes) {
      if (!map[v.eventId]) map[v.eventId] = [];
      map[v.eventId].push(v);
    }
    return map;
  }, [eventVotes]);

  const handleSeedStarters = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      await seedStarterGames();
    } finally {
      setSeeding(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="h-64 bg-[#161916] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-[#161916] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (gamesWithStats.length === 0) {
    return (
      <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-14">
        <section className="max-w-2xl mx-auto text-center border border-[#262A26] bg-[#141614] px-8 py-14 space-y-6">
          <p className="text-xs font-medium text-[#4ADE80]">
            Bem-vindo ao CobraCritic
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE]">
            Nenhum jogo cadastrado ainda
          </h1>
          <p className="text-sm sm:text-base text-[#A8ACA5] leading-relaxed">
            O catálogo começa limpo para que o Grupo dos Cobras cadastre manualmente
            apenas os jogos que realmente importa avaliar, votar e discutir.
          </p>
          {user && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenNewGame}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar primeiro jogo</span>
              </button>
              <button
                type="button"
                onClick={handleSeedStarters}
                disabled={seeding}
                className="px-5 py-2.5 text-sm font-medium border border-[#2F352F] bg-[#0C0D0C] text-[#F2F2EE] rounded-md hover:border-[#666B63] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {seeding ? 'Carregando exemplos...' : 'Carregar 4 jogos de exemplo'}
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const resolvedBackdropUrl =
    currentSlide && currentSlide.backdropUrl
      ? resolveAssetUrl(currentSlide.backdropUrl)
      : '';

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <FeaturedRoundBanner
        onSelectGame={onSelectGame}
        onOpenReview={onOpenReview}
      />

      {/* Editorial Rotating Spotlight Banner */}
      {currentSlide && (
        <section
          aria-label="Destaques rotativos do CobraCritic"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative overflow-hidden bg-[#121512] border border-[#262B26]"
        >
          {/* Subtle atmospheric backdrop */}
          {resolvedBackdropUrl && !backdropBroken && (
            <>
              <img
                src={resolvedBackdropUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                onError={() => setBackdropBroken(true)}
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110 pointer-events-none select-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#0E100E] via-[#0E100E]/92 to-[#0E100E]/82 pointer-events-none"
              />
            </>
          )}

          <div className="relative z-10 p-5 sm:p-6 lg:p-7 h-[436px] sm:h-[372px] md:h-[336px] flex flex-col justify-between gap-4">
            {/* Fixed-height Slide Body Wrapper */}
            <div className="flex-1 min-h-0 flex items-center overflow-hidden">
            {currentSlide.kind === 'topGame' && (
              <div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 lg:gap-8">
                <button
                  type="button"
                  onClick={() => onSelectGame(currentSlide.game.id)}
                  className="w-[88px] sm:w-[128px] md:w-[144px] shrink-0 block text-left group cursor-pointer transition-transform duration-300 ease-out hover:scale-[1.02] will-change-transform motion-reduce:transform-none"
                >
                  <GameCover
                    title={currentSlide.game.title}
                    developer={currentSlide.game.developer}
                    releaseYear={currentSlide.game.releaseYear}
                    coverUrl={currentSlide.game.coverUrl}
                    compact
                    className="transition-all duration-300 ease-out group-hover:border-[#4ADE80]/60 shadow-2xl"
                  />
                </button>

                <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs font-medium text-[#4ADE80] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        {currentSlide.game.averageScore !== null
                          ? 'Jogo mais bem avaliado dos Cobras'
                          : 'Destaque do catálogo'}
                      </span>
                      <span className="text-[#4B5148]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#90968C] font-normal">
                        {formatReleaseDate(currentSlide.game.releaseDate)}
                      </span>
                    </p>

                    <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[#F2F2EE] leading-[1.12] line-clamp-2 [text-wrap:balance]">
                      <button
                        type="button"
                        onClick={() => onSelectGame(currentSlide.game.id)}
                        className="hover:text-[#4ADE80] transition-colors text-left cursor-pointer"
                      >
                        {currentSlide.game.title}
                      </button>
                    </h1>

                    <p className="text-xs sm:text-sm text-[#A8ACA5] truncate">
                      <span>{currentSlide.game.developer}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{currentSlide.game.genres.join(', ')}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{currentSlide.game.platforms.join(' / ')}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#262B26]/80">
                    <div className="flex flex-wrap items-center gap-4">
                      <ScoreBadge
                        score={currentSlide.game.averageScore}
                        size="lg"
                        showLabel
                        reviewCount={currentSlide.game.reviewCount}
                      />
                      {currentSlide.game.reviewCount > 0 && (
                        <div className="hidden lg:block space-y-1.5 min-w-[160px]">
                          <div className="h-1.5 w-40 bg-[#222622] overflow-hidden flex rounded-full">
                            {currentSlide.game.positiveCount > 0 && (
                              <div
                                className="bg-[#16A34A] h-full"
                                style={{
                                  width: `${(currentSlide.game.positiveCount / currentSlide.game.reviewCount) * 100}%`,
                                }}
                              />
                            )}
                            {currentSlide.game.mixedCount > 0 && (
                              <div
                                className="bg-[#D97706] h-full"
                                style={{
                                  width: `${(currentSlide.game.mixedCount / currentSlide.game.reviewCount) * 100}%`,
                                }}
                              />
                            )}
                            {currentSlide.game.negativeCount > 0 && (
                              <div
                                className="bg-[#DC2626] h-full"
                                style={{
                                  width: `${(currentSlide.game.negativeCount / currentSlide.game.reviewCount) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-[#8C9288] tabular-nums">
                            {currentSlide.game.positiveCount} fav ·{' '}
                            {currentSlide.game.mixedCount} mis ·{' '}
                            {currentSlide.game.negativeCount} des
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {user && (
                        <button
                          type="button"
                          onClick={() => onOpenReview(currentSlide.game)}
                          className="px-4 py-2 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Avaliar jogo
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectGame(currentSlide.game.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium border border-[#2F352F] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#4ADE80]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Ver ficha e críticas</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSlide.kind === 'review' && (
              <div className="w-full flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 lg:gap-8">
                <button
                  type="button"
                  onClick={() => onSelectGame(currentSlide.review.gameId)}
                  className="w-[88px] sm:w-[128px] md:w-[144px] shrink-0 block text-left group cursor-pointer transition-transform duration-300 ease-out hover:scale-[1.02] will-change-transform motion-reduce:transform-none"
                >
                  <GameCover
                    title={currentSlide.game?.title || currentSlide.review.gameTitle}
                    coverUrl={
                      currentSlide.game?.coverUrl || currentSlide.review.gameCoverUrl
                    }
                    compact
                    className="transition-all duration-300 ease-out group-hover:border-[#4ADE80]/60 shadow-2xl"
                  />
                </button>

                <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-medium text-[#4ADE80]">
                        {currentSlide.review.ratingOnly
                          ? 'Nova nota publicada'
                          : 'Nova crítica dos Cobras'}
                      </span>
                      <span className="text-[#4B5148]" aria-hidden="true">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectGame(currentSlide.review.gameId)}
                        className="text-[#C8CBC4] hover:text-[#F2F2EE] font-medium truncate max-w-[220px] sm:max-w-[320px] cursor-pointer"
                      >
                        {currentSlide.game?.title || currentSlide.review.gameTitle}
                      </button>
                      <span className="text-[#4B5148]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#8C9288]">
                        {formatTimestamp(currentSlide.review.createdAt)}
                      </span>
                    </div>

                    <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-[#F2F2EE] leading-[1.16] line-clamp-2 [text-wrap:balance]">
                      {currentSlide.review.ratingOnly
                        ? `${currentSlide.authorName} avaliou ${
                            currentSlide.game?.title || currentSlide.review.gameTitle
                          }`
                        : `“${currentSlide.review.headline}”`}
                    </h2>

                    {currentSlide.review.ratingOnly ? (
                      <p className="text-xs sm:text-sm text-[#90968C] truncate">
                        Avaliação registrada apenas com nota ·{' '}
                        {currentSlide.review.platformPlayed}
                        {currentSlide.review.hoursPlayed > 0
                          ? ` · ${currentSlide.review.hoursPlayed}h jogadas`
                          : ''}
                      </p>
                    ) : currentSlide.review.hasSpoiler ? (
                      <p className="text-xs sm:text-sm text-[#FBBF24] italic line-clamp-2">
                        Esta crítica foi marcada com spoilers — abra a ficha do jogo para
                        revelar o texto completo.
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-[#C8CBC4] leading-relaxed line-clamp-2 max-w-2xl">
                        {currentSlide.review.body}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#262B26]/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ScoreBadge score={currentSlide.review.score} size="md" />
                      {user ? (
                        <button
                          type="button"
                          onClick={() => onSelectMember(currentSlide.review.authorId)}
                          className="flex items-center gap-2.5 min-w-0 group cursor-pointer text-left"
                        >
                          <MemberAvatar
                            name={currentSlide.authorName}
                            primarySrc={currentSlide.authorPhotoURL}
                            fallbackSrc={currentSlide.authorFallbackPhotoURL}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-medium text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors truncate">
                                {currentSlide.authorName}
                              </p>
                              {currentSlide.authorPlayStatus && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 ${GAME_PLAY_STATUS_META[currentSlide.authorPlayStatus].activeClass}`}
                                >
                                  {GAME_PLAY_STATUS_META[currentSlide.authorPlayStatus].label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8C9288] truncate">
                              {currentSlide.review.platformPlayed}
                              {currentSlide.review.hoursPlayed > 0
                                ? ` · ${currentSlide.review.hoursPlayed}h`
                                : ''}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0 text-left">
                          <MemberAvatar
                            name={currentSlide.authorName}
                            primarySrc={currentSlide.authorPhotoURL}
                            fallbackSrc={currentSlide.authorFallbackPhotoURL}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-medium text-[#F2F2EE] truncate">
                                {currentSlide.authorName}
                              </p>
                              {currentSlide.authorPlayStatus && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 ${GAME_PLAY_STATUS_META[currentSlide.authorPlayStatus].activeClass}`}
                                >
                                  {GAME_PLAY_STATUS_META[currentSlide.authorPlayStatus].label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8C9288] truncate">
                              {currentSlide.review.platformPlayed}
                              {currentSlide.review.hoursPlayed > 0
                                ? ` · ${currentSlide.review.hoursPlayed}h`
                                : ''}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectGame(currentSlide.review.gameId)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Ver crítica completa</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={onGoToFeed}
                        className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-[#2F352F] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#4ADE80]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Abrir feed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSlide.kind === 'event' && (() => {
              const ev = currentSlide.event;
              const isPoll = ev.mode === 'poll';
              const isNominating = ev.status === 'nominating';
              const countdown = formatDeadlineCountdown(ev.deadlineAt, nowMs);
              const evVotes = votesByEvent[ev.id] || [];
              const evNoms = nominationsByEvent[ev.id] || [];
              const sampleCovers = (
                isNominating
                  ? evNoms.map((n) => ({ id: n.id, title: n.title, coverUrl: n.coverUrl }))
                  : ev.categories.flatMap((c) => c.nominees)
              ).slice(0, 3);

              return (
                <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-8">
                  <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-xs font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={
                            isNominating ? 'text-[#60A5FA]' : 'text-[#4ADE80]'
                          }
                        >
                          {isNominating
                            ? 'Evento em fase de indicações'
                            : 'Evento com votação aberta'}
                        </span>
                        <span className="text-[#4B5148]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#A8ACA5] font-normal">
                          {isPoll ? 'Votação do grupo' : 'Premiação ao vivo'}
                        </span>
                        {countdown && (
                          <>
                            <span className="text-[#4B5148]" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 font-mono ${
                                countdown.expired
                                  ? 'text-[#F87171]'
                                  : 'text-[#FBBF24]'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{countdown.text}</span>
                            </span>
                          </>
                        )}
                      </p>

                      <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[#F2F2EE] leading-[1.12] line-clamp-2 [text-wrap:balance]">
                        {ev.title}
                      </h2>

                      {ev.description ? (
                        <p className="text-xs sm:text-sm text-[#C8CBC4] leading-relaxed line-clamp-2 max-w-2xl">
                          {ev.description}
                        </p>
                      ) : (
                        <p className="text-xs sm:text-sm text-[#90968C] line-clamp-2">
                          {isNominating
                            ? 'Cada membro pode indicar 1 jogo para entrar na disputa.'
                            : 'Os votos são abertos para todo o grupo acompanhar em tempo real.'}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#262B26]/80">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#90968C] tabular-nums">
                        {isNominating ? (
                          <span>
                            <strong className="text-[#F2F2EE] font-mono">
                              {evNoms.length}
                            </strong>{' '}
                            {evNoms.length === 1
                              ? 'jogo indicado'
                              : 'jogos indicados'}
                          </span>
                        ) : (
                          <>
                            <span>
                              <strong className="text-[#F2F2EE] font-mono">
                                {ev.categories.length}
                              </strong>{' '}
                              {ev.categories.length === 1
                                ? 'categoria'
                                : 'categorias'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              <strong className="text-[#F2F2EE] font-mono">
                                {evVotes.length}
                              </strong>{' '}
                              {evVotes.length === 1
                                ? 'voto registrado'
                                : 'votos registrados'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onGoToEvents(ev.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Vote className="w-4 h-4" />
                          <span>
                            {user
                              ? isNominating
                                ? 'Indicar jogo'
                                : 'Votar agora'
                              : 'Ver evento'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onGoToEvents()}
                          className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-[#2F352F] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#4ADE80]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Todos os eventos
                        </button>
                      </div>
                    </div>
                  </div>

                  {sampleCovers.length > 0 && (
                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      {sampleCovers.map((nom) => (
                        <div key={nom.id} className="w-[74px]">
                          <GameCover
                            title={nom.title}
                            coverUrl={nom.coverUrl}
                            compact
                            className="shadow-xl"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            </div>

            {/* Banner Rotation Controls Footer */}
            {slides.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222622]">
                <div className="flex items-center gap-1.5 flex-1 min-w-[160px] max-w-md">
                  {slides.map((slide, idx) => {
                    const active = idx === activeSlideIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        title={slide.shortLabel}
                        aria-label={`Ir para destaque ${idx + 1}: ${slide.shortLabel}`}
                        aria-current={active ? 'true' : undefined}
                        className="group flex-1 py-2 cursor-pointer focus:outline-none"
                      >
                        <span
                          className={`block h-1 w-full rounded-full transition-colors ${
                            active
                              ? 'bg-[#4ADE80]'
                              : 'bg-[#2A302A] group-hover:bg-[#495249]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-[#8C9288] tabular-nums">
                    {String(activeSlideIndex + 1).padStart(2, '0')}/
                    {String(slides.length).padStart(2, '0')} · {currentSlide.shortLabel}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      title="Destaque anterior"
                      aria-label="Destaque anterior"
                      className="p-1.5 rounded border border-[#262B26] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#4ADE80]/50 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      title="Próximo destaque"
                      aria-label="Próximo destaque"
                      className="p-1.5 rounded border border-[#262B26] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#4ADE80]/50 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleShuffleSlide}
                      title="Sortear outro destaque"
                      aria-label="Sortear outro destaque"
                      className="p-1.5 rounded border border-[#262B26] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#4ADE80] hover:border-[#4ADE80]/50 transition-colors cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaused((prev) => !prev)}
                      title={
                        isPaused
                          ? 'Retomar rotação automática'
                          : 'Pausar rotação automática'
                      }
                      aria-label={
                        isPaused
                          ? 'Retomar rotação automática'
                          : 'Pausar rotação automática'
                      }
                      className="p-1.5 rounded border border-[#262B26] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#4ADE80]/50 transition-colors cursor-pointer"
                    >
                      {isPaused ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Eventos em Andamento para Votação / Indicações */}
      <section
        aria-label="Eventos em andamento"
        className="border-b border-[#232723] pb-8 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Participe com o grupo</span>
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F2EE]">
              Eventos em Andamento
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onGoToEvents()}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#4ADE80] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Ver todos os eventos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {ongoingEvents.length === 0 ? (
          <div className="bg-[#141614] border border-[#262A26] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#90968C]">
              Nenhum evento aberto para indicação ou votação no momento. Você ainda
              pode conferir os resultados dos eventos encerrados.
            </p>
            <button
              type="button"
              onClick={() => onGoToEvents()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4ADE80] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Abrir aba de Eventos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ongoingEvents.map((ev) => {
              const isPoll = ev.mode === 'poll';
              const isNominating = ev.status === 'nominating';
              const countdown = formatDeadlineCountdown(ev.deadlineAt, nowMs);
              const evVotes = votesByEvent[ev.id] || [];
              const evNoms = nominationsByEvent[ev.id] || [];
              const myVotedCats = user
                ? new Set(
                    evVotes
                      .filter((v) => v.userId === user.uid)
                      .map((v) => v.categoryId),
                  ).size
                : 0;
              const myNomination = user
                ? evNoms.find((n) => n.userId === user.uid) || null
                : null;

              return (
                <article
                  key={ev.id}
                  className="bg-[#141614] border border-[#262A26] hover:border-[#3A433A] p-5 flex flex-col justify-between gap-4 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span
                        className={`font-medium ${
                          isNominating ? 'text-[#60A5FA]' : 'text-[#4ADE80]'
                        }`}
                      >
                        {isNominating ? 'Indicações abertas' : 'Votação aberta'}
                      </span>
                      <span className="text-[#4B5148]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#8C9288]">
                        {isPoll ? 'Votação do grupo' : 'Premiação ao vivo'}
                      </span>
                      {countdown && (
                        <>
                          <span className="text-[#4B5148]" aria-hidden="true">
                            ·
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-mono ${
                              countdown.expired
                                ? 'text-[#F87171]'
                                : 'text-[#FBBF24]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{countdown.text}</span>
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onGoToEvents(ev.id)}
                      className="block font-display text-xl font-semibold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors text-left cursor-pointer"
                    >
                      {ev.title}
                    </button>

                    {ev.description && (
                      <p className="text-xs sm:text-sm text-[#90968C] line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#222622] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[#8C9288] space-y-0.5 tabular-nums min-w-0">
                      {isNominating ? (
                        <>
                          <p>
                            <strong className="text-[#F2F2EE] font-mono">
                              {evNoms.length}
                            </strong>{' '}
                            {evNoms.length === 1
                              ? 'indicação enviada'
                              : 'indicações enviadas'}
                          </p>
                          {user && (
                            <p className="truncate text-[11px]">
                              {myNomination ? (
                                <span className="text-[#60A5FA]">
                                  Sua indicação: {myNomination.title}
                                </span>
                              ) : (
                                <span>Você ainda não indicou seu jogo</span>
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p>
                            <strong className="text-[#F2F2EE] font-mono">
                              {ev.categories.length}
                            </strong>{' '}
                            {ev.categories.length === 1
                              ? 'categoria'
                              : 'categorias'}{' '}
                            ·{' '}
                            <strong className="text-[#F2F2EE] font-mono">
                              {evVotes.length}
                            </strong>{' '}
                            {evVotes.length === 1 ? 'voto' : 'votos'}
                          </p>
                          {user && (
                            <p className="text-[11px]">
                              {myVotedCats > 0 ? (
                                <span className="text-[#4ADE80]">
                                  Você votou em {myVotedCats}/{ev.categories.length}{' '}
                                  {ev.categories.length === 1
                                    ? 'categoria'
                                    : 'categorias'}
                                </span>
                              ) : (
                                <span>Você ainda não votou neste evento</span>
                              )}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onGoToEvents(ev.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>
                        {user
                          ? isNominating
                            ? 'Indicar jogo'
                            : 'Votar agora'
                          : 'Ver evento'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Jogos em Alta (últimas 48 horas) */}
      <section
        aria-label="Jogos em Alta nas últimas 48 horas"
        className="border-b border-[#232723] pb-8 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#FBBF24] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Movimentação das últimas 48h</span>
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F2EE]">
              Jogos em Alta
            </h2>
          </div>
          <p className="text-xs text-[#8C9288] tabular-nums">
            {trendingGames.length > 0
              ? `${trendingGames.length} ${
                  trendingGames.length === 1
                    ? 'jogo aquecido agora'
                    : 'jogos aquecidos agora'
                } · críticas 75+ e comentários`
              : 'Baseado em críticas positivas (75+) e novos comentários'}
          </p>
        </div>

        {trendingGames.length === 0 ? (
          <div className="bg-[#141614] border border-[#262A26] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#90968C]">
              Nenhum jogo recebeu críticas positivas (75+) ou novos comentários nas
              últimas 48 horas. Avalie um jogo ou entre em uma discussão para colocar o
              título em alta.
            </p>
            {reviews.length > 0 && (
              <button
                type="button"
                onClick={onGoToFeed}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4ADE80] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Ir para o feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingGames.map((item, idx) => (
              <article
                key={item.game.id}
                className="group bg-[#141614] border border-[#262A26] hover:border-[#3A433A] p-3.5 flex items-stretch gap-3.5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectGame(item.game.id)}
                  className="w-[68px] shrink-0 block text-left cursor-pointer"
                >
                  <GameCover
                    title={item.game.title}
                    developer={item.game.developer}
                    releaseYear={item.game.releaseYear}
                    coverUrl={item.game.coverUrl}
                    compact
                    className="transition-all duration-300 ease-out group-hover:border-[#4ADE80]/50"
                  />
                </button>

                <div className="min-w-0 flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono font-semibold text-[#FBBF24] tabular-nums">
                          #{String(idx + 1).padStart(2, '0')} EM ALTA
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectGame(item.game.id)}
                          className="block font-display text-base font-semibold text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors truncate text-left w-full cursor-pointer"
                        >
                          {item.game.title}
                        </button>
                      </div>
                      <ScoreBadge score={item.game.averageScore} size="xs" />
                    </div>
                    <p className="text-[11px] text-[#8C9288] truncate">
                      {item.game.developer} · {item.game.releaseYear}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#222622] flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
                    <div className="flex flex-wrap items-center gap-3">
                      {item.positiveReviews48h > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-[#4ADE80]">
                          <ThumbsUp className="w-3 h-3" />
                          <span>
                            +{item.positiveReviews48h}{' '}
                            {item.positiveReviews48h === 1
                              ? 'positiva'
                              : 'positivas'}
                          </span>
                        </span>
                      )}
                      {item.comments48h > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-[#60A5FA]">
                          <MessageSquare className="w-3 h-3" />
                          <span>
                            +{item.comments48h}{' '}
                            {item.comments48h === 1 ? 'comentário' : 'comentários'}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-[#6E736B]">
                      {formatTimestamp(item.latestActivityTs)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Quick Navigation Strip to Catalog & Social Feed */}
      <section
        aria-label="Atalhos principais"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <button
          type="button"
          onClick={onGoToCatalog}
          className="group text-left bg-[#141614] border border-[#262A26] hover:border-[#4ADE80]/60 p-5 flex items-center justify-between gap-4 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <LayoutGrid className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="font-display text-lg font-semibold text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors">
                Explorar Catálogo Completo
              </p>
              <p className="text-xs text-[#8C9288] tabular-nums">
                {gamesWithStats.length}{' '}
                {gamesWithStats.length === 1
                  ? 'jogo cadastrado'
                  : 'jogos cadastrados'}{' '}
                · Filtre por plataforma, gênero, nota ou seu status
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8C9288] group-hover:text-[#4ADE80] shrink-0 transition-colors" />
        </button>

        <button
          type="button"
          onClick={onGoToFeed}
          className="group text-left bg-[#141614] border border-[#262A26] hover:border-[#4ADE80]/60 p-5 flex items-center justify-between gap-4 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <MessageSquareText className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="font-display text-lg font-semibold text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors">
                Abrir Feed Social
              </p>
              <p className="text-xs text-[#8C9288] tabular-nums">
                {reviews.length}{' '}
                {reviews.length === 1
                  ? 'crítica publicada'
                  : 'críticas publicadas'}{' '}
                · Leia todas as avaliações e discussões recentes
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8C9288] group-hover:text-[#4ADE80] shrink-0 transition-colors" />
        </button>
      </section>
    </main>
  );
}
