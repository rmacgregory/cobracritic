import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { scrollToAppTop } from '../context/CrtContext';
import { useVeredito } from '../context/VereditoContext';
import {
  GAME_PLAY_STATUS_LIST,
  GAME_PLAY_STATUS_META,
  GENRES,
  PLATFORMS,
  getScoreMeta,
  type GamePlayStatus,
  type GameWithStats,
} from '../types';
import { GameCover } from './GameCover';
import { RetroEasterEggSlot } from './RetroEasterEggs';
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
  | 'avg_desc'
  | 'release_desc'
  | 'release_asc'
  | 'reviews_desc'
  | 'title_asc';

type CatalogViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'cobracritic_catalog_view_mode';
const ROWS_PER_PAGE = 5;

function getGridColumns(): number {
  if (typeof window === 'undefined') return 6;
  const width = window.innerWidth;
  if (width >= 1280) return 6; // xl
  if (width >= 1024) return 5; // lg
  if (width >= 768) return 4; // md
  if (width >= 640) return 3; // sm
  return 2;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCatalogCsv(games: GameWithStats[]): string {
  const headers = [
    'Título',
    'Estúdio',
    'Data de Lançamento',
    'Ano',
    'Gêneros',
    'Plataformas',
    'Nota Média Simples',
    'Índice Ponderado',
    'Classificação',
    'Qtd. Avaliações',
    'Nota Mínima',
    'Nota Máxima',
    'Favoráveis',
    'Mistas',
    'Desfavoráveis',
    'Cadastrado por',
  ];

  const rows = games.map((game) => [
    game.title,
    game.developer,
    game.releaseDate,
    game.releaseYear,
    game.genres.join(', '),
    game.platforms.join(', '),
    game.averageScore !== null ? game.averageScore : '',
    game.weightedScore !== null ? game.weightedScore.toFixed(1) : '',
    getScoreMeta(game.averageScore).label,
    game.reviewCount,
    game.minScore !== null ? game.minScore : '',
    game.maxScore !== null ? game.maxScore : '',
    game.positiveCount,
    game.mixedCount,
    game.negativeCount,
    game.createdByName,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');
}

function getPageItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
}

function CatalogPagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onPageChange,
}: CatalogPaginationProps) {
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <nav
      aria-label="Paginação do catálogo"
      className="bg-[#141614] border border-[#262A26] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-[#8C9288] tabular-nums">
        Mostrando{' '}
        <strong className="text-[#F2F2EE] font-mono">
          {startItem}–{endItem}
        </strong>{' '}
        de <strong className="text-[#F2F2EE] font-mono">{totalItems}</strong>{' '}
        {totalItems === 1 ? 'jogo' : 'jogos'}
      </p>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {currentPage >= 2 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              aria-label="Voltar para a primeira página"
              title="Primeira página"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border border-[#2A2F2A] bg-[#0C0D0C] text-[#C8CBC4] hover:text-[#F2F2EE] hover:border-[#4ADE80]/60 transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Primeira</span>
            </button>
          )}

          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Página anterior"
            title="Página anterior"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#2A2F2A] bg-[#0C0D0C] text-[#C8CBC4] hover:text-[#F2F2EE] hover:border-[#4ADE80]/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {pageItems.map((item, idx) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-xs font-mono text-[#6E736B] select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-label={`Página ${item}`}
                  aria-current={item === currentPage ? 'page' : undefined}
                  className={`min-w-[30px] h-[30px] px-2 text-xs font-mono font-medium rounded-md border transition-colors tabular-nums cursor-pointer ${
                    item === currentPage
                      ? 'bg-[#4ADE80] border-[#4ADE80] text-[#0C0D0C] font-semibold'
                      : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#495249]'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Próxima página"
            title="Próxima página"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#2A2F2A] bg-[#0C0D0C] text-[#C8CBC4] hover:text-[#F2F2EE] hover:border-[#4ADE80]/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Ir para a última página"
            title="Última página"
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border border-[#2A2F2A] bg-[#0C0D0C] text-[#C8CBC4] hover:text-[#F2F2EE] hover:border-[#4ADE80]/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span className="hidden md:inline">Última</span>
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
}

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
  const {
    user,
    gamesWithStats,
    reviews,
    dataLoading,
    myStatusByGame,
    seedStarterGames,
  } = useVeredito();

  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | GamePlayStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('score_desc');
  const [seeding, setSeeding] = useState(false);
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [gridColumns, setGridColumns] = useState<number>(() => getGridColumns());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDirection, setPageDirection] = useState<1 | -1>(1);
  const [csvExported, setCsvExported] = useState(false);
  const catalogTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setGridColumns(getGridColumns());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChangeViewMode = (mode: CatalogViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const g of gamesWithStats) {
      years.add(g.releaseYear);
    }
    return Array.from(years).sort((a, b) => b - a);
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

      if (selectedStatus !== 'all' && myStatusByGame[game.id] !== selectedStatus) {
        return false;
      }

      return true;
    });

    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'score_desc': {
          const weightA = a.weightedScore ?? -1;
          const weightB = b.weightedScore ?? -1;
          if (weightB !== weightA) return weightB - weightA;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        }
        case 'avg_desc': {
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
    selectedStatus,
    myStatusByGame,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedPlatform,
    selectedGenre,
    selectedYear,
    selectedStatus,
    dateFrom,
    dateTo,
    sortBy,
    viewMode,
  ]);

  const itemsPerPage =
    viewMode === 'list' ? ROWS_PER_PAGE : gridColumns * ROWS_PER_PAGE;

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedGames = useMemo(() => {
    const startIdx = (safePage - 1) * itemsPerPage;
    return filteredGames.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredGames, safePage, itemsPerPage]);

  const startItem =
    filteredGames.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, filteredGames.length);

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped === safePage) return;
    setPageDirection(clamped > safePage ? 1 : -1);
    setCurrentPage(clamped);
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      scrollToAppTop('smooth');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedPlatform !== 'all' ||
      selectedGenre !== 'all' ||
      selectedYear !== 'all' ||
      selectedStatus !== 'all' ||
      dateFrom ||
      dateTo,
  );

  const resetFilters = () => {
    setSearch('');
    onChangePlatform('all');
    onChangeGenre('all');
    setSelectedYear('all');
    setSelectedStatus('all');
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

  const handleExportCsv = () => {
    if (gamesWithStats.length === 0) return;
    const sortedAll = [...gamesWithStats].sort((a, b) => {
      switch (sortBy) {
        case 'score_desc': {
          const weightA = a.weightedScore ?? -1;
          const weightB = b.weightedScore ?? -1;
          if (weightB !== weightA) return weightB - weightA;
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        }
        case 'avg_desc': {
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

    const csv = buildCatalogCsv(sortedAll);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cobracritic-catalogo-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    setCsvExported(true);
    window.setTimeout(() => setCsvExported(false), 2500);
  };

  if (dataLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="h-56 bg-[#161916] animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-2.5">
              <div className="aspect-[3/4] bg-[#161916] animate-pulse" />
              <div className="h-3.5 w-3/4 bg-[#161916] animate-pulse" />
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
          <p className="text-xs font-medium text-[#4ADE80]">
            Catálogo CobraCritic
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE]">
            Nenhum jogo cadastrado ainda
          </h1>
          <p className="text-sm sm:text-base text-[#A8ACA5] leading-relaxed">
            O catálogo começa limpo de propósito para que o Grupo dos Cobras cadastre
            manualmente apenas os jogos que realmente importa avaliar e discutir.
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

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Filter & Catalog Section */}
      <section aria-label="Catálogo completo" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F2EE]">
              {selectedGenre !== 'all'
                ? `Jogos de ${selectedGenre}`
                : selectedPlatform !== 'all'
                  ? `Jogos em ${selectedPlatform}`
                  : 'Catálogo dos Cobras'}
            </h1>
            <p className="text-sm text-[#90968C] mt-1 tabular-nums">
              {filteredGames.length} de {gamesWithStats.length}{' '}
              {gamesWithStats.length === 1 ? 'jogo' : 'jogos'} exibidos · {reviews.length}{' '}
              {reviews.length === 1 ? 'crítica publicada' : 'críticas publicadas'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Modo de visualização do catálogo"
              className="inline-flex items-center bg-[#141614] border border-[#262A26] rounded-md p-0.5"
            >
              <button
                type="button"
                onClick={() => handleChangeViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                title="Grid de pôsteres"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#F2F2EE] text-[#0C0D0C]'
                    : 'text-[#90968C] hover:text-[#F2F2EE]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Pôsteres</span>
              </button>
              <button
                type="button"
                onClick={() => handleChangeViewMode('list')}
                aria-pressed={viewMode === 'list'}
                title="Lista compacta"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#F2F2EE] text-[#0C0D0C]'
                    : 'text-[#90968C] hover:text-[#F2F2EE]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              title={`Exportar todos os ${gamesWithStats.length} jogos cadastrados em CSV`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141614] border border-[#262A26] text-[#F2F2EE] rounded-md hover:border-[#4ADE80]/60 hover:text-[#4ADE80] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{csvExported ? 'CSV exportado!' : 'Exportar CSV'}</span>
            </button>

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
        </div>

        {/* Filter Bar: Search, Platform, Genre, Release Date, Sort */}
        <div className="relative bg-[#141614] border border-[#262A26] p-4 space-y-4">
          <RetroEasterEggSlot slot="catalog-filters" mode="corner" />
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
              <RetroEasterEggSlot
                slot="catalog-search"
                mode="corner"
                cornerOverride="br"
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
                <option value="score_desc">Top jogos (ponderado)</option>
                <option value="avg_desc">Maior média simples</option>
                <option value="release_desc">Mais recentes</option>
                <option value="release_asc">Mais antigos</option>
                <option value="reviews_desc">Mais avaliados</option>
                <option value="title_asc">Ordem alfabética</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {user && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="filter-my-status"
                    className="text-xs text-[#8C9288] whitespace-nowrap"
                  >
                    Meu status:
                  </label>
                  <select
                    id="filter-my-status"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as 'all' | GamePlayStatus)
                    }
                    aria-label="Filtrar pelo meu status de jogo"
                    className="px-2.5 py-1.5 text-xs bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                  >
                    <option value="all">Todos os status</option>
                    {GAME_PLAY_STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {GAME_PLAY_STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowDateRange((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {showDateRange
                    ? 'Ocultar intervalo de lançamento'
                    : 'Intervalo de lançamento'}
                </span>
              </button>
            </div>

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

        {/* Games Grid / List with 5-row Pagination */}
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
              {user && (
                <button
                  type="button"
                  onClick={onOpenNewGame}
                  className="px-4 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white cursor-pointer"
                >
                  Cadastrar jogo
                </button>
              )}
            </div>
          </div>
        ) : (
          <div ref={catalogTopRef} className="space-y-6 scroll-mt-20">
            <CatalogPagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredGames.length}
              startItem={startItem}
              endItem={endItem}
              onPageChange={handlePageChange}
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`catalog-page-${viewMode}-${safePage}-${itemsPerPage}-${selectedPlatform}-${selectedGenre}-${selectedYear}-${selectedStatus}-${sortBy}-${search.trim()}`}
                initial={{ opacity: 0, y: pageDirection >= 0 ? 14 : -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: pageDirection >= 0 ? -10 : 10 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {viewMode === 'list' ? (
                  <div className="border border-[#262A26] bg-[#141614] divide-y divide-[#222622]">
                    <div className="hidden sm:grid sm:grid-cols-12 items-center gap-3 px-4 py-2 bg-[#101210] text-[11px] font-mono uppercase tracking-wider text-[#787D75]">
                      <span className="col-span-1">Nota</span>
                      <span className={user ? 'col-span-6' : 'col-span-7'}>Jogo</span>
                      <span className="col-span-4">Plataformas</span>
                      {user && <span className="col-span-1 text-right">Ação</span>}
                    </div>
                    {paginatedGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex sm:grid sm:grid-cols-12 items-center gap-3 px-4 py-2.5 hover:bg-[#191D19] transition-colors"
                      >
                        <div className="sm:col-span-1 shrink-0">
                          <ScoreBadge score={game.averageScore} size="xs" />
                        </div>

                        <div
                          className={`min-w-0 flex-1 ${
                            user ? 'sm:col-span-6' : 'sm:col-span-7'
                          } flex items-center gap-2`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectGame(game.id)}
                            className="font-display text-sm font-semibold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors truncate text-left cursor-pointer"
                          >
                            {game.title}
                          </button>
                          <span className="hidden md:inline text-[11px] font-mono text-[#6E736B] tabular-nums shrink-0">
                            {game.releaseYear}
                          </span>
                          {myStatusByGame[game.id] && (
                            <span
                              className={`text-[11px] font-medium shrink-0 ${
                                GAME_PLAY_STATUS_META[myStatusByGame[game.id]].colorClass
                              }`}
                            >
                              · {GAME_PLAY_STATUS_META[myStatusByGame[game.id]].shortLabel}
                            </span>
                          )}
                        </div>

                        <p
                          title={game.platforms.join(' · ')}
                          className="text-xs text-[#8C9288] truncate max-w-[34%] sm:max-w-none sm:col-span-4"
                        >
                          {game.platforms.join(' · ')}
                        </p>

                        {user && (
                          <div className="sm:col-span-1 flex justify-end shrink-0">
                            <button
                              type="button"
                              onClick={() => onOpenReview(game)}
                              className="text-xs font-medium text-[#A8ACA5] hover:text-[#4ADE80] transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Avaliar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
                    {paginatedGames.map((game) => {
                      const scoreMeta = getScoreMeta(game.averageScore);
                      return (
                        <article
                          key={game.id}
                          className="group flex flex-col justify-between space-y-2.5 transition-transform duration-300 ease-out hover:scale-[1.03] will-change-transform motion-reduce:transform-none"
                        >
                          <div className="space-y-2">
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
                                compact
                                className="transition-all duration-300 ease-out group-hover:border-[#3A433A] group-hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.85)]"
                              />
                            </button>

                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onSelectGame(game.id)}
                                  className="font-display text-sm font-semibold text-[#F2F2EE] leading-snug group-hover:text-[#4ADE80] transition-colors text-left cursor-pointer line-clamp-2"
                                >
                                  {game.title}
                                </button>
                                <p className="text-[11px] text-[#90968C] mt-0.5 truncate">
                                  {game.developer} · {game.releaseYear}
                                </p>
                              </div>
                              <ScoreBadge score={game.averageScore} size="xs" />
                            </div>

                            <div className="space-y-0.5 text-[11px] text-[#8C9288]">
                              <p className="truncate">{game.platforms.join(' · ')}</p>
                              <p className="truncate text-[#6E736B]">
                                {game.genres.join(' / ')}
                                {myStatusByGame[game.id] && (
                                  <span
                                    className={`font-medium ${
                                      GAME_PLAY_STATUS_META[myStatusByGame[game.id]].colorClass
                                    }`}
                                  >
                                    {' · '}
                                    {GAME_PLAY_STATUS_META[myStatusByGame[game.id]].shortLabel}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#222622] flex items-center justify-between gap-2 text-[11px]">
                            <span className={`font-medium truncate ${scoreMeta.accentTextClass}`}>
                              {game.reviewCount === 0
                                ? 'Sem notas'
                                : `${scoreMeta.shortLabel} · ${game.reviewCount}`}
                            </span>
                            {user && (
                              <button
                                type="button"
                                onClick={() => onOpenReview(game)}
                                className="font-medium text-[#F2F2EE] hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Avaliar
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <CatalogPagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredGames.length}
              startItem={startItem}
              endItem={endItem}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </section>

      <div className="relative h-5">
        <RetroEasterEggSlot slot="catalog" mode="corner" cornerOverride="br" />
      </div>
    </main>
  );
}
