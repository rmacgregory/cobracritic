import { useMemo, useState } from 'react';
import { ArrowRight, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  GENRES,
  PLATFORMS,
  formatReleaseDate,
  getScoreMeta,
  type GameWithStats,
} from '../types';
import { GameCover } from './GameCover';
import { ScoreBadge } from './ScoreBadge';

interface CatalogViewProps {
  selectedPlatform: string;
  selectedGenre: string;
  onChangePlatform: (platform: string) => void;
  onChangeGenre: (genre: string) => void;
  onSelectGame: (gameId: string) => void;
  onOpenNewGame: () => void;
  onOpenReview: (game: GameWithStats) => void;
  onGoToFeed: () => void;
}

type SortOption =
  | 'score_desc'
  | 'release_desc'
  | 'release_asc'
  | 'reviews_desc'
  | 'title_asc';

export function CatalogView({
  selectedPlatform,
  selectedGenre,
  onChangePlatform,
  onChangeGenre,
  onSelectGame,
  onOpenNewGame,
  onOpenReview,
  onGoToFeed,
}: CatalogViewProps) {
  const { gamesWithStats, reviews, dataLoading, seedStarterGames } = useVeredito();

  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('score_desc');
  const [seeding, setSeeding] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const g of gamesWithStats) {
      years.add(g.releaseYear);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [gamesWithStats]);

  const featuredGame = useMemo(() => {
    if (gamesWithStats.length === 0) return null;
    const rated = gamesWithStats.filter((g) => g.averageScore !== null);
    if (rated.length > 0) {
      return [...rated].sort((a, b) => {
        if ((b.averageScore ?? -1) !== (a.averageScore ?? -1)) {
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        }
        return b.reviewCount - a.reviewCount;
      })[0];
    }
    return gamesWithStats[0];
  }, [gamesWithStats]);

  const filteredGames = useMemo(() => {
    const queryLower = search.trim().toLowerCase();

    const matches = gamesWithStats.filter((game) => {
      if (queryLower) {
        const inTitle = game.title.toLowerCase().includes(queryLower);
        const inDev = game.developer.toLowerCase().includes(queryLower);
        const inSynopsis = game.synopsis.toLowerCase().includes(queryLower);
        if (!inTitle && !inDev && !inSynopsis) return false;
      }

      if (
        selectedPlatform !== 'all' &&
        !game.platforms.includes(selectedPlatform)
      ) {
        return false;
      }

      if (selectedGenre !== 'all' && !game.genres.includes(selectedGenre)) {
        return false;
      }

      if (selectedYear !== 'all') {
        if (selectedYear === 'older') {
          if (game.releaseYear >= 2020) return false;
        } else if (String(game.releaseYear) !== selectedYear) {
          return false;
        }
      }

      if (dateFrom && game.releaseDate < dateFrom) {
        return false;
      }

      if (dateTo && game.releaseDate > dateTo) {
        return false;
      }

      return true;
    });

    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'score_desc': {
          const scoreA = a.averageScore ?? -1;
          const scoreB = b.averageScore ?? -1;
          if (scoreB !== scoreA) return scoreB - scoreA;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return b.releaseDate.localeCompare(a.releaseDate);
        }
        case 'release_desc':
          return b.releaseDate.localeCompare(a.releaseDate);
        case 'release_asc':
          return a.releaseDate.localeCompare(b.releaseDate);
        case 'reviews_desc':
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        case 'title_asc':
          return a.title.localeCompare(b.title, 'pt-BR');
        default:
          return 0;
      }
    });
  }, [
    gamesWithStats,
    search,
    selectedPlatform,
    selectedGenre,
    selectedYear,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedPlatform !== 'all' ||
      selectedGenre !== 'all' ||
      selectedYear !== 'all' ||
      dateFrom ||
      dateTo,
  );

  const resetFilters = () => {
    setSearch('');
    onChangePlatform('all');
    onChangeGenre('all');
    setSelectedYear('all');
    setDateFrom('');
    setDateTo('');
  };

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
      <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-10">
        <div className="h-72 bg-[#161916] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-3">
              <div className="aspect-[3/4] bg-[#161916] animate-pulse" />
              <div className="h-4 w-3/4 bg-[#161916] animate-pulse" />
              <div className="h-3 w-1/2 bg-[#161916] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gamesWithStats.length === 0) {
    return (
      <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-14">
        <section className="max-w-2xl mx-auto text-center border border-[#262A26] bg-[#141614] px-8 py-14 space-y-6">
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#4ADE80]">
            Catálogo CobraCritic
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#F2F2EE]">
            Nenhum jogo cadastrado ainda
          </h1>
          <p className="text-sm sm:text-base text-[#A8ACA5] leading-relaxed">
            O catálogo começa limpo de propósito para que o Grupo dos Cobras cadastre
            manualmente apenas os jogos que realmente importa avaliar e discutir.
          </p>
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
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-12">
      {/* Editorial Spotlight Hero (hidden when filtering by sidebar category so results are immediate) */}
      {featuredGame && !hasActiveFilters && (
        <section
          aria-label="Destaque dos Cobras"
          className="border-b border-[#232723] pb-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-4 max-w-[260px] lg:max-w-none w-full">
              <button
                type="button"
                onClick={() => onSelectGame(featuredGame.id)}
                className="block w-full text-left group cursor-pointer"
              >
                <GameCover
                  title={featuredGame.title}
                  developer={featuredGame.developer}
                  releaseYear={featuredGame.releaseYear}
                  coverUrl={featuredGame.coverUrl}
                />
              </button>
            </div>

            <div className="lg:col-span-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#4ADE80]">
                  {featuredGame.averageScore !== null
                    ? 'Maior média dos Cobras'
                    : 'Recém-adicionado ao catálogo'}
                  {' · '}
                  <span className="text-[#90968C]">
                    {formatReleaseDate(featuredGame.releaseDate)}
                  </span>
                </p>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#F2F2EE] leading-[1.1]">
                  {featuredGame.title}
                </h1>

                <p className="text-sm text-[#90968C]">
                  <span>{featuredGame.developer}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{featuredGame.genres.join(', ')}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{featuredGame.platforms.join(' / ')}</span>
                </p>

                <p className="text-[15px] sm:text-base text-[#C8CBC4] leading-relaxed max-w-2xl">
                  {featuredGame.synopsis}
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-[#222622]">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <ScoreBadge
                    score={featuredGame.averageScore}
                    size="lg"
                    showLabel
                    reviewCount={featuredGame.reviewCount}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenReview(featuredGame)}
                      className="px-5 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Avaliar este jogo
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectGame(featuredGame.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border border-[#2F352F] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#666B63] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Ver críticas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {featuredGame.reviewCount > 0 && (
                  <div className="space-y-2 max-w-xl">
                    <div className="h-2 w-full bg-[#222622] overflow-hidden flex">
                      {featuredGame.positiveCount > 0 && (
                        <div
                          className="bg-[#16A34A] h-full"
                          style={{
                            width: `${(featuredGame.positiveCount / featuredGame.reviewCount) * 100}%`,
                          }}
                        />
                      )}
                      {featuredGame.mixedCount > 0 && (
                        <div
                          className="bg-[#D97706] h-full"
                          style={{
                            width: `${(featuredGame.mixedCount / featuredGame.reviewCount) * 100}%`,
                          }}
                        />
                      )}
                      {featuredGame.negativeCount > 0 && (
                        <div
                          className="bg-[#DC2626] h-full"
                          style={{
                            width: `${(featuredGame.negativeCount / featuredGame.reviewCount) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#90968C] tabular-nums">
                      {featuredGame.positiveCount} favoráveis · {featuredGame.mixedCount}{' '}
                      mistas · {featuredGame.negativeCount} desfavoráveis
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter & Catalog Section */}
      <section aria-label="Catálogo completo" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#F2F2EE]">
              {selectedGenre !== 'all'
                ? `Jogos de ${selectedGenre}`
                : selectedPlatform !== 'all'
                  ? `Jogos em ${selectedPlatform}`
                  : 'Catálogo dos Cobras'}
            </h2>
            <p className="text-sm text-[#90968C] mt-1 tabular-nums">
              {filteredGames.length} de {gamesWithStats.length}{' '}
              {gamesWithStats.length === 1 ? 'jogo' : 'jogos'} exibidos · {reviews.length}{' '}
              {reviews.length === 1 ? 'crítica publicada' : 'críticas publicadas'}
            </p>
          </div>

          {reviews.length > 0 && (
            <button
              type="button"
              onClick={onGoToFeed}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4ADE80] hover:underline cursor-pointer"
            >
              <span>Abrir feed social</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Bar: Search, Platform, Genre, Release Date, Sort */}
        <div className="bg-[#141614] border border-[#262A26] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jogo por título ou estúdio..."
                aria-label="Buscar jogos"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedPlatform}
                onChange={(e) => onChangePlatform(e.target.value)}
                aria-label="Filtrar por plataforma"
                className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="all">Todas plataformas</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedGenre}
                onChange={(e) => onChangeGenre(e.target.value)}
                aria-label="Filtrar por gênero"
                className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="all">Todos gêneros</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filtrar por ano de lançamento"
                className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="all">Qualquer ano</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Lançados em {yr}
                  </option>
                ))}
                <option value="older">Antes de 2020</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Ordenar jogos"
                className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              >
                <option value="score_desc">Maior média</option>
                <option value="release_desc">Mais recentes</option>
                <option value="release_asc">Mais antigos</option>
                <option value="reviews_desc">Mais avaliados</option>
                <option value="title_asc">Ordem alfabética</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowDateRange((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {showDateRange
                  ? 'Ocultar intervalo exato de lançamento'
                  : 'Filtrar por intervalo de data de lançamento'}
              </span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4ADE80] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          {showDateRange && (
            <div className="pt-3 border-t border-[#222622] flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="filter-date-from" className="text-xs text-[#90968C]">
                  Lançado de
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="filter-date-to" className="text-xs text-[#90968C]">
                  até
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Games Grid */}
        {filteredGames.length === 0 ? (
          <div className="border border-[#262A26] bg-[#141614] px-6 py-12 text-center space-y-3">
            <p className="font-serif text-xl text-[#F2F2EE]">
              Nenhum jogo corresponde aos filtros selecionados
            </p>
            <p className="text-sm text-[#90968C]">
              Tente ajustar a plataforma, gênero ou período de lançamento, ou cadastre o jogo
              manualmente.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-medium border border-[#2F352F] bg-[#0C0D0C] text-[#F2F2EE] rounded-md hover:border-[#666B63] cursor-pointer"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={onOpenNewGame}
                className="px-4 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white cursor-pointer"
              >
                Cadastrar jogo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredGames.map((game) => {
              const scoreMeta = getScoreMeta(game.averageScore);
              return (
                <article
                  key={game.id}
                  className="group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => onSelectGame(game.id)}
                      className="block w-full text-left cursor-pointer"
                    >
                      <GameCover
                        title={game.title}
                        developer={game.developer}
                        releaseYear={game.releaseYear}
                        coverUrl={game.coverUrl}
                      />
                    </button>

                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectGame(game.id)}
                          className="font-serif text-lg font-medium text-[#F2F2EE] leading-snug group-hover:text-[#4ADE80] transition-colors text-left cursor-pointer line-clamp-2"
                        >
                          {game.title}
                        </button>
                        <p className="text-xs text-[#90968C] mt-1 truncate">
                          {game.developer} · {formatReleaseDate(game.releaseDate)}
                        </p>
                      </div>
                      <ScoreBadge score={game.averageScore} size="sm" />
                    </div>

                    <div className="space-y-1 text-xs text-[#8C9288]">
                      <p className="truncate">{game.platforms.join(' · ')}</p>
                      <p className="truncate text-[#6E736B]">{game.genres.join(' / ')}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#222622] flex items-center justify-between gap-2 text-xs">
                    <span className={`font-medium ${scoreMeta.accentTextClass}`}>
                      {game.reviewCount === 0
                        ? 'Sem notas'
                        : `${scoreMeta.shortLabel} · ${game.reviewCount} ${
                            game.reviewCount === 1 ? 'nota' : 'notas'
                          }`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReview(game)}
                      className="font-medium text-[#F2F2EE] hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Avaliar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
