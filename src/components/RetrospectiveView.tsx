import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Clock,
  Flame,
  HeartHandshake,
  MessageSquare,
  Share2,
  Trophy,
  Users,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { computeWeightedScore, type GameWithStats, type Review } from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
import { RetroEasterEggSlot } from './RetroEasterEggs';
import { ScoreBadge } from './ScoreBadge';
import { ShareCardModal } from './ShareCardModal';

interface RetrospectiveViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (uid: string) => void;
}

interface YearGameSummary {
  gameId: string;
  title: string;
  developer: string;
  coverUrl: string;
  releaseYear?: number;
  reviewCount: number;
  avgScore: number;
  weightedScore: number;
  minScore: number;
  maxScore: number;
  stdDev: number;
}

export function RetrospectiveView({
  onSelectGame,
  onSelectMember,
}: RetrospectiveViewProps) {
  const { user, gamesWithStats, reviews, comments, membersById } = useVeredito();

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    for (const g of gamesWithStats) {
      if (Number.isFinite(g.releaseYear) && g.releaseYear >= 1970) {
        years.add(g.releaseYear);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [gamesWithStats]);

  const [selectedYear, setSelectedYear] = useState<number>(
    () => new Date().getFullYear(),
  );
  const [showShareModal, setShowShareModal] = useState(false);

  const yearStats = useMemo(() => {
    const releasedGamesInYear = gamesWithStats.filter(
      (g) => g.releaseYear === selectedYear,
    );
    const releasedGameIds = new Set(releasedGamesInYear.map((g) => g.id));

    const yearReviews = reviews.filter((r) => releasedGameIds.has(r.gameId));
    const yearComments = comments.filter((c) => releasedGameIds.has(c.gameId));

    const totalReviews = yearReviews.length;
    const totalHours = yearReviews.reduce((acc, r) => acc + (r.hoursPlayed || 0), 0);
    const avgScore =
      totalReviews > 0
        ? Math.round(yearReviews.reduce((acc, r) => acc + r.score, 0) / totalReviews)
        : null;
    const globalMean =
      totalReviews > 0
        ? yearReviews.reduce((acc, r) => acc + r.score, 0) / totalReviews
        : 75;

    // Group reviews by game (strictly games released in selectedYear)
    const byGame = new Map<string, Review[]>();
    for (const r of yearReviews) {
      const list = byGame.get(r.gameId) || [];
      list.push(r);
      byGame.set(r.gameId, list);
    }

    const gameSummaries: YearGameSummary[] = [];
    for (const [gameId, revs] of byGame.entries()) {
      const game = gamesById.get(gameId);
      const scores = revs.map((r) => r.score);
      const rawAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance =
        scores.reduce((acc, s) => acc + (s - rawAvg) ** 2, 0) / scores.length;
      gameSummaries.push({
        gameId,
        title: game?.title || revs[0].gameTitle,
        developer: game?.developer || '',
        coverUrl: game?.coverUrl || revs[0].gameCoverUrl,
        releaseYear: game?.releaseYear ?? selectedYear,
        reviewCount: revs.length,
        avgScore: Math.round(rawAvg),
        weightedScore: computeWeightedScore(rawAvg, revs.length, globalMean),
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        stdDev: Math.sqrt(variance),
      });
    }

    const topGames = [...gameSummaries].sort((a, b) => {
      if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return b.avgScore - a.avgScore;
    });

    const multiReviewGames = gameSummaries.filter((g) => g.reviewCount >= 2);
    const mostControversial =
      [...multiReviewGames].sort((a, b) => b.stdDev - a.stdDev)[0] || null;
    const highestConsensus =
      [...multiReviewGames].sort((a, b) => {
        if (a.stdDev !== b.stdDev) return a.stdDev - b.stdDev;
        return b.reviewCount - a.reviewCount;
      })[0] || null;

    // Member highlights on games released in selectedYear
    const byMember = new Map<
      string,
      { uid: string; name: string; photoURL: string; fallbackPhoto: string; count: number; totalScore: number; totalHours: number }
    >();
    for (const r of yearReviews) {
      const live = membersById[r.authorId];
      const entry = byMember.get(r.authorId) || {
        uid: r.authorId,
        name: live?.displayName || r.authorName,
        photoURL: live?.photoURL || '',
        fallbackPhoto: r.authorPhotoURL || '',
        count: 0,
        totalScore: 0,
        totalHours: 0,
      };
      entry.count += 1;
      entry.totalScore += r.score;
      entry.totalHours += r.hoursPlayed || 0;
      byMember.set(r.authorId, entry);
    }

    const memberEntries = Array.from(byMember.values()).map((m) => ({
      ...m,
      avg: Math.round(m.totalScore / m.count),
    }));

    const mostActive =
      [...memberEntries].sort((a, b) => b.count - a.count)[0] || null;
    const marathoner =
      [...memberEntries].filter((m) => m.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours)[0] ||
      null;
    const eligibleForAvg = memberEntries.filter((m) => m.count >= 2);
    const poolForAvg = eligibleForAvg.length > 0 ? eligibleForAvg : memberEntries;
    const strictest = [...poolForAvg].sort((a, b) => a.avg - b.avg)[0] || null;
    const mostGenerous = [...poolForAvg].sort((a, b) => b.avg - a.avg)[0] || null;

    // Top genres among games released in selectedYear
    const genreCounts = new Map<string, { count: number; scoreSum: number }>();
    for (const r of yearReviews) {
      const game = gamesById.get(r.gameId);
      if (!game) continue;
      for (const genre of game.genres) {
        const cur = genreCounts.get(genre) || { count: 0, scoreSum: 0 };
        cur.count += 1;
        cur.scoreSum += r.score;
        genreCounts.set(genre, cur);
      }
    }
    const topGenres = Array.from(genreCounts.entries())
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        avg: Math.round(data.scoreSum / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      totalReviews,
      totalGames: byGame.size,
      catalogGamesInYear: releasedGamesInYear.length,
      totalComments: yearComments.length,
      totalHours,
      avgScore,
      topGames,
      mostControversial,
      highestConsensus,
      mostActive,
      marathoner,
      strictest,
      mostGenerous,
      topGenres,
    };
  }, [gamesWithStats, reviews, comments, selectedYear, gamesById, membersById]);

  const goty = yearStats.topGames[0] || null;

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header + Year Switcher + Share Button */}
      <header className="relative border-b border-[#232723] pb-6 flex flex-wrap items-end justify-between gap-4">
        <RetroEasterEggSlot slot="retrospective-header" mode="corner" />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Retrospectiva por Ano de Lançamento · Jogos de {selectedYear}</span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE]">
            Retrospectiva {selectedYear}
          </h1>
          <p className="text-sm text-[#90968C] max-w-2xl leading-relaxed">
            Esta retrospectiva reúne exclusivamente os{' '}
            <strong className="text-[#D8DDD5] font-medium">
              jogos lançados em {selectedYear}
            </strong>{' '}
            — independentemente do ano em que foram jogados ou avaliados pelo grupo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Escolher ano de lançamento dos jogos"
            className="px-3.5 py-2 text-sm font-mono bg-[#141614] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80] cursor-pointer"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Lançamentos {yr}
              </option>
            ))}
          </select>

          {yearStats.totalReviews > 0 && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Gerar card da retrospectiva</span>
            </button>
          )}
        </div>
      </header>

      {yearStats.totalReviews === 0 ? (
        <section className="bg-[#141614] border border-[#262A26] rounded-md p-12 text-center space-y-3">
          <Trophy className="w-8 h-8 text-[#4B5148] mx-auto" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-semibold text-[#F2F2EE]">
            Nenhum jogo lançado em {selectedYear} foi avaliado ainda
          </h2>
          <p className="text-sm text-[#90968C] max-w-lg mx-auto leading-relaxed">
            Esta retrospectiva considera apenas os jogos com lançamento em {selectedYear} (não
            o ano em que foram jogados).
            {yearStats.catalogGamesInYear > 0
              ? ` Há ${yearStats.catalogGamesInYear} ${
                  yearStats.catalogGamesInYear === 1
                    ? 'jogo lançado'
                    : 'jogos lançados'
                } em ${selectedYear} no catálogo aguardando avaliações.`
              : ` Assim que títulos lançados em ${selectedYear} forem cadastrados e avaliados, o resumo aparecerá aqui.`}
          </p>
        </section>
      ) : (
        <>
          {/* KPI Strip */}
          <section
            aria-label={`Números dos jogos lançados em ${selectedYear}`}
            className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4"
          >
            <div className="bg-[#141614] border border-[#262A26] rounded-md p-4">
              <p className="text-xs text-[#8C9288]">Críticas (jogos de {selectedYear})</p>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
                {yearStats.totalReviews}
              </p>
            </div>
            <div className="bg-[#141614] border border-[#262A26] rounded-md p-4">
              <p className="text-xs text-[#8C9288]">Lançamentos avaliados</p>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
                {yearStats.totalGames}
                {yearStats.catalogGamesInYear > yearStats.totalGames && (
                  <span className="text-xs font-normal text-[#787D75] ml-1">
                    /{yearStats.catalogGamesInYear}
                  </span>
                )}
              </p>
            </div>
            <div className="bg-[#141614] border border-[#262A26] rounded-md p-4">
              <p className="text-xs text-[#8C9288]">Média de {selectedYear}</p>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#4ADE80] tabular-nums mt-1">
                {yearStats.avgScore ?? '—'}
              </p>
            </div>
            <div className="bg-[#141614] border border-[#262A26] rounded-md p-4">
              <p className="text-xs text-[#8C9288]">Horas jogadas</p>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
                {Math.round(yearStats.totalHours)}h
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#141614] border border-[#262A26] rounded-md p-4">
              <p className="text-xs text-[#8C9288]">Comentários</p>
              <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
                {yearStats.totalComments}
              </p>
            </div>
          </section>

          {/* Jogo do Ano + Podium */}
          {goty && (
            <section className="bg-[#131914] border border-[#255436] rounded-md p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <button
                  type="button"
                  onClick={() => onSelectGame(goty.gameId)}
                  className="w-28 sm:w-32 shrink-0 text-left cursor-pointer"
                >
                  <GameCover
                    title={goty.title}
                    coverUrl={goty.coverUrl}
                    compact
                    className="w-full rounded-[3px]"
                  />
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#4ADE80] flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Melhor Jogo Lançado em {selectedYear} · Cobras</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectGame(goty.gameId)}
                    className="font-display text-2xl sm:text-3xl font-bold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors text-left cursor-pointer block"
                  >
                    {goty.title}
                  </button>
                  <p className="text-xs sm:text-sm text-[#A8ACA5] tabular-nums">
                    {goty.developer ? `${goty.developer} · ` : ''}
                    Lançado em {selectedYear} · {goty.reviewCount}{' '}
                    {goty.reviewCount === 1 ? 'avaliação' : 'avaliações'} · Faixa{' '}
                    {goty.minScore}–{goty.maxScore}
                  </p>
                </div>
                <div className="shrink-0">
                  <ScoreBadge
                    score={goty.avgScore}
                    size="lg"
                    showLabel
                    reviewCount={goty.reviewCount}
                  />
                </div>
              </div>

              {yearStats.topGames.length > 1 && (
                <div className="pt-5 border-t border-[#223326] space-y-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#8C9288]">
                    Top {Math.min(yearStats.topGames.length, 5)} lançamentos de {selectedYear}{' '}
                    mais bem avaliados
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {yearStats.topGames.slice(1, 5).map((g, idx) => (
                      <button
                        key={g.gameId}
                        type="button"
                        onClick={() => onSelectGame(g.gameId)}
                        className="p-3 rounded-md bg-[#0E120E] border border-[#232A23] hover:border-[#4ADE80]/60 flex items-center gap-3 text-left transition-colors cursor-pointer"
                      >
                        <span className="font-mono text-xs font-bold text-[#4ADE80] tabular-nums">
                          #{idx + 2}
                        </span>
                        <GameCover
                          title={g.title}
                          coverUrl={g.coverUrl}
                          compact
                          className="w-9 shrink-0 rounded-[2px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#F2F2EE] truncate">
                            {g.title}
                          </p>
                          <p className="text-[11px] font-mono text-[#8C9288] tabular-nums">
                            Nota {g.avgScore} · {g.reviewCount}{' '}
                            {g.reviewCount === 1 ? 'av.' : 'avs.'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Controversy & Consensus */}
          {(yearStats.mostControversial || yearStats.highestConsensus) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {yearStats.mostControversial && (
                <button
                  type="button"
                  onClick={() =>
                    yearStats.mostControversial &&
                    onSelectGame(yearStats.mostControversial.gameId)
                  }
                  className="bg-[#141614] border border-[#4D3B17] hover:border-[#FBBF24] rounded-md p-5 text-left space-y-3 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-medium text-[#FBBF24] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Maior Polêmica (Lançamentos {selectedYear})</span>
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <GameCover
                        title={yearStats.mostControversial.title}
                        coverUrl={yearStats.mostControversial.coverUrl}
                        compact
                        className="w-12 shrink-0 rounded-[2px]"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-lg font-semibold text-[#F2F2EE] truncate">
                          {yearStats.mostControversial.title}
                        </p>
                        <p className="text-xs text-[#A8ACA5] font-mono tabular-nums mt-0.5">
                          Notas de {yearStats.mostControversial.minScore} a{' '}
                          {yearStats.mostControversial.maxScore} · desvio ±
                          {yearStats.mostControversial.stdDev.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <ScoreBadge score={yearStats.mostControversial.avgScore} size="sm" />
                  </div>
                </button>
              )}

              {yearStats.highestConsensus && (
                <button
                  type="button"
                  onClick={() =>
                    yearStats.highestConsensus &&
                    onSelectGame(yearStats.highestConsensus.gameId)
                  }
                  className="bg-[#141614] border border-[#244D32] hover:border-[#4ADE80] rounded-md p-5 text-left space-y-3 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Maior Consenso (Lançamentos {selectedYear})</span>
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <GameCover
                        title={yearStats.highestConsensus.title}
                        coverUrl={yearStats.highestConsensus.coverUrl}
                        compact
                        className="w-12 shrink-0 rounded-[2px]"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-lg font-semibold text-[#F2F2EE] truncate">
                          {yearStats.highestConsensus.title}
                        </p>
                        <p className="text-xs text-[#A8ACA5] font-mono tabular-nums mt-0.5">
                          Notas entre {yearStats.highestConsensus.minScore} e{' '}
                          {yearStats.highestConsensus.maxScore} · desvio ±
                          {yearStats.highestConsensus.stdDev.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <ScoreBadge score={yearStats.highestConsensus.avgScore} size="sm" />
                  </div>
                </button>
              )}
            </section>
          )}

          {/* Member Awards */}
          <section className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F2F2EE] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#4ADE80]" />
              <span>Destaques dos Membros nos Jogos de {selectedYear}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {yearStats.mostActive && (
                <button
                  type="button"
                  disabled={!user}
                  onClick={() =>
                    user && yearStats.mostActive && onSelectMember(yearStats.mostActive.uid)
                  }
                  className={`bg-[#141614] border border-[#262A26] rounded-md p-4 text-left space-y-3 transition-colors ${
                    user ? 'hover:border-[#4ADE80]/60 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Mais avaliou jogos de {selectedYear}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={yearStats.mostActive.name}
                      primarySrc={yearStats.mostActive.photoURL}
                      fallbackSrc={yearStats.mostActive.fallbackPhoto}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {yearStats.mostActive.name}
                      </p>
                      <p className="text-xs font-mono text-[#90968C] tabular-nums">
                        {yearStats.mostActive.count}{' '}
                        {yearStats.mostActive.count === 1 ? 'crítica' : 'críticas'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {yearStats.marathoner && (
                <button
                  type="button"
                  disabled={!user}
                  onClick={() =>
                    user && yearStats.marathoner && onSelectMember(yearStats.marathoner.uid)
                  }
                  className={`bg-[#141614] border border-[#262A26] rounded-md p-4 text-left space-y-3 transition-colors ${
                    user ? 'hover:border-[#60A5FA]/60 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#60A5FA] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Maratonista de {selectedYear}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={yearStats.marathoner.name}
                      primarySrc={yearStats.marathoner.photoURL}
                      fallbackSrc={yearStats.marathoner.fallbackPhoto}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {yearStats.marathoner.name}
                      </p>
                      <p className="text-xs font-mono text-[#90968C] tabular-nums">
                        {Math.round(yearStats.marathoner.totalHours)}h jogadas
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {yearStats.strictest && (
                <button
                  type="button"
                  disabled={!user}
                  onClick={() =>
                    user && yearStats.strictest && onSelectMember(yearStats.strictest.uid)
                  }
                  className={`bg-[#141614] border border-[#262A26] rounded-md p-4 text-left space-y-3 transition-colors ${
                    user ? 'hover:border-[#FBBF24]/60 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#FBBF24] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Mais exigente</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={yearStats.strictest.name}
                      primarySrc={yearStats.strictest.photoURL}
                      fallbackSrc={yearStats.strictest.fallbackPhoto}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {yearStats.strictest.name}
                      </p>
                      <p className="text-xs font-mono text-[#90968C] tabular-nums">
                        Média {yearStats.strictest.avg}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {yearStats.mostGenerous && (
                <button
                  type="button"
                  disabled={!user}
                  onClick={() =>
                    user &&
                    yearStats.mostGenerous &&
                    onSelectMember(yearStats.mostGenerous.uid)
                  }
                  className={`bg-[#141614] border border-[#262A26] rounded-md p-4 text-left space-y-3 transition-colors ${
                    user ? 'hover:border-[#4ADE80]/60 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#86EFAC] flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Mais entusiasta</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={yearStats.mostGenerous.name}
                      primarySrc={yearStats.mostGenerous.photoURL}
                      fallbackSrc={yearStats.mostGenerous.fallbackPhoto}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {yearStats.mostGenerous.name}
                      </p>
                      <p className="text-xs font-mono text-[#90968C] tabular-nums">
                        Média {yearStats.mostGenerous.avg}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </section>

          {/* Top Genres */}
          {yearStats.topGenres.length > 0 && (
            <section className="bg-[#141614] border border-[#262A26] rounded-md p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold text-[#F2F2EE]">
                Gêneros mais avaliados entre lançamentos de {selectedYear}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {yearStats.topGenres.map((item) => (
                  <div
                    key={item.genre}
                    className="p-3.5 rounded-md bg-[#0C0D0C] border border-[#232823] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#F2F2EE]">{item.genre}</p>
                      <p className="text-xs text-[#8C9288] tabular-nums">
                        {item.count} {item.count === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    </div>
                    <ScoreBadge score={item.avg} size="xs" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {showShareModal && (
        <ShareCardModal
          payload={{
            kind: 'retrospective',
            year: selectedYear,
            totalReviews: yearStats.totalReviews,
            totalGames: yearStats.totalGames,
            totalHours: yearStats.totalHours,
            avgScore: yearStats.avgScore,
            gotyTitle: goty?.title || '—',
            gotyScore: goty?.avgScore ?? null,
            controversialTitle: yearStats.mostControversial?.title || '—',
            controversialRange: yearStats.mostControversial
              ? `Notas de ${yearStats.mostControversial.minScore} a ${yearStats.mostControversial.maxScore}`
              : '',
            mostActiveMember: yearStats.mostActive?.name || '—',
            mostActiveCount: yearStats.mostActive?.count || 0,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}
