import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CalendarRange,
  Check,
  ChevronDown,
  Eye,
  Gamepad2,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquareText,
  Monitor,
  Search,
  Shield,
  SlidersHorizontal,
  Tag,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCrt } from '../context/CrtContext';
import { useVeredito } from '../context/VereditoContext';
import {
  COBRA_LOGO_PATH,
  GENRES,
  PLATFORMS,
  resolveAssetUrl,
  type ActiveTab,
} from '../types';
import { RetroEasterEggSlot } from './RetroEasterEggs';

interface SidebarProps {
  activeTab: ActiveTab;
  selectedGenre: string;
  selectedPlatform: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectGenre: (genre: string) => void;
  onSelectPlatform: (platform: string) => void;
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface SidebarFilterComboboxProps {
  label: string;
  allLabel: string;
  placeholder: string;
  options: readonly string[];
  counts: Record<string, number>;
  selectedValue: string;
  isCatalogActive: boolean;
  icon: typeof Tag;
  onSelect: (value: string) => void;
}

function SidebarFilterCombobox({
  label,
  allLabel,
  placeholder,
  options,
  counts,
  selectedValue,
  isCatalogActive,
  icon: Icon,
  onSelect,
}: SidebarFilterComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normQuery = normalizeSearch(query);
    if (!normQuery) return options;
    return options.filter((opt) => normalizeSearch(opt).includes(normQuery));
  }, [options, query]);

  const hasSelection = isCatalogActive && selectedValue !== 'all';

  const handleChoose = (value: string) => {
    onSelect(value);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-2 pt-4 border-t border-[#1F231F]">
      <RetroEasterEggSlot
        slot={`sidebar-filter-${label.toLowerCase()}`}
        mode="corner"
      />
      <div className="px-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-mono text-[#787D75] flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-[#666B63]" />
          <span>{label}</span>
        </p>
        {hasSelection && (
          <button
            type="button"
            onClick={() => handleChoose('all')}
            className="text-[11px] text-[#4ADE80] hover:underline cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Active Filter Pill Indicator */}
      {hasSelection && (
        <div className="px-2">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-[#16291D] border border-[#22543D] text-xs text-[#4ADE80]">
            <span className="truncate font-medium">{selectedValue}</span>
            <button
              type="button"
              onClick={() => handleChoose('all')}
              aria-label={`Remover filtro ${selectedValue}`}
              className="text-[#86EFAC] hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search + Dropdown Combobox */}
      <div className="px-2 relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#666B63] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
              } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                e.preventDefault();
                handleChoose(filteredOptions[0]);
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-expanded={open}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
          />
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={`Abrir lista de ${label.toLowerCase()}`}
            className="absolute right-1.5 p-1 text-[#787D75] hover:text-[#F2F2EE] cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                open ? 'rotate-180 text-[#4ADE80]' : ''
              }`}
            />
          </button>
        </div>

        {open && (
          <div className="mt-1.5 bg-[#0E100E] border border-[#2A302A] rounded-md shadow-xl max-h-56 overflow-y-auto py-1 z-20">
            {!query.trim() && (
              <button
                type="button"
                onClick={() => handleChoose('all')}
                className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  !hasSelection
                    ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                    : 'text-[#A8ACA5] hover:bg-[#181B18] hover:text-[#F2F2EE]'
                }`}
              >
                <span className="truncate">{allLabel}</span>
                {!hasSelection && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-[#787D75]">
                Nenhum resultado para “{query}”.
              </p>
            ) : (
              filteredOptions.map((option) => {
                const count = counts[option] || 0;
                const isSelected = isCatalogActive && selectedValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleChoose(isSelected ? 'all' : option)}
                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                        : 'text-[#C8CBC4] hover:bg-[#181B18] hover:text-[#F2F2EE]'
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {count > 0 && (
                        <span className="font-mono text-[11px] text-[#787D75] tabular-nums">
                          {count}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#4ADE80]" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  activeTab,
  selectedGenre,
  selectedPlatform,
  mobileOpen,
  onCloseMobile,
  onSelectTab,
  onSelectGenre,
  onSelectPlatform,
}: SidebarProps) {
  const {
    user,
    profile,
    isAdmin,
    isMasterAdmin,
    gamesWithStats,
    events,
    signOutUser,
    exitReadOnlyMode,
  } = useVeredito();
  const {
    settings: crtSettings,
    unlocked: crtUnlocked,
    toggleCrt,
    setConfigOpen: setCrtConfigOpen,
  } = useCrt();

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gamesWithStats) {
      for (const genre of g.genres) {
        counts[genre] = (counts[genre] || 0) + 1;
      }
    }
    return counts;
  }, [gamesWithStats]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gamesWithStats) {
      for (const plat of g.platforms) {
        counts[plat] = (counts[plat] || 0) + 1;
      }
    }
    return counts;
  }, [gamesWithStats]);

  const displayName = profile?.displayName || user?.displayName || 'Cobra';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const activeEventsCount = useMemo(
    () =>
      events.filter((ev) => ev.status === 'active' || ev.status === 'nominating')
        .length,
    [events],
  );

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: typeof LayoutGrid;
    count?: number;
  }[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'catalog', label: 'Catálogo', icon: LayoutGrid },
    { id: 'feed', label: 'Feed Social', icon: MessageSquareText },
    {
      id: 'events',
      label: 'Eventos',
      icon: Trophy,
      count: activeEventsCount > 0 ? activeEventsCount : undefined,
    },
    { id: 'ranking', label: 'Ranking', icon: Award },
    { id: 'retrospective', label: 'Retrospectiva', icon: CalendarRange },
    ...(user
      ? [
          { id: 'members' as const, label: 'Membros', icon: Users },
          { id: 'profile' as const, label: 'Meu Perfil', icon: User },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Painel Admin',
            icon: Shield,
          },
        ]
      : []),
  ];

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleGenreSelect = (genre: string) => {
    onSelectGenre(genre);
    onCloseMobile();
  };

  const handlePlatformSelect = (platform: string) => {
    onSelectPlatform(platform);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#121412] border-r border-[#232723] text-[#F2F2EE]">
      {/* Brand Header with CobraCritic Logo */}
      <div className="relative h-16 px-4 border-b border-[#232723] flex items-center justify-between gap-2 shrink-0">
        <RetroEasterEggSlot slot="sidebar-logo" mode="corner" />
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          aria-label="CobraCritic — Ir para a tela inicial"
          className="flex items-center min-w-0 flex-1 cursor-pointer focus:outline-none"
        >
          <img
            src={resolveAssetUrl(COBRA_LOGO_PATH)}
            alt="CobraCritic"
            className="h-7 w-auto max-w-[196px] object-contain object-left select-none"
          />
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu lateral"
          className="lg:hidden p-1.5 text-[#90968C] hover:text-[#F2F2EE] cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Navigation & Filter Comboboxes */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <nav aria-label="Seções do CobraCritic" className="space-y-1">
          <p className="px-2.5 pb-1.5 text-[11px] font-mono text-[#787D75]">
            Navegação
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id &&
              !(
                item.id === 'catalog' &&
                (selectedGenre !== 'all' || selectedPlatform !== 'all')
              );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-2.5 py-2 rounded-md text-sm font-medium flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1D221D] text-[#F2F2EE]'
                    : 'text-[#A8ACA5] hover:text-[#F2F2EE] hover:bg-[#181B18]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-[#4ADE80]'
                        : item.id === 'admin'
                          ? 'text-[#4ADE80]/80'
                          : 'text-[#787D75]'
                    }`}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="font-mono text-xs text-[#787D75] tabular-nums shrink-0">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Genre Search + Dropdown */}
        <SidebarFilterCombobox
          label="Gêneros"
          allLabel="Todos os gêneros"
          placeholder="Buscar ou escolher gênero..."
          options={GENRES}
          counts={genreCounts}
          selectedValue={selectedGenre}
          isCatalogActive={activeTab === 'catalog'}
          icon={Tag}
          onSelect={handleGenreSelect}
        />

        {/* Platform Search + Dropdown */}
        <SidebarFilterCombobox
          label="Plataformas"
          allLabel="Todas as plataformas"
          placeholder="Buscar console ou PC..."
          options={PLATFORMS}
          counts={platformCounts}
          selectedValue={selectedPlatform}
          isCatalogActive={activeTab === 'catalog'}
          icon={Gamepad2}
          onSelect={handlePlatformSelect}
        />

        {/* CRT Monitor Mode & Configuration (hidden until unlocked) */}
        {crtUnlocked && (
          <div className="pt-4 border-t border-[#1F231F] space-y-2 px-2">
            <p className="text-[11px] font-mono text-[#787D75] flex items-center gap-1.5">
              <Monitor className="w-3 h-3 text-[#666B63]" />
              <span>Monitor Retrô</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleCrt}
                aria-pressed={crtSettings.enabled}
                title="Alternar filtro de monitor CRT"
                className={`flex-1 min-w-0 px-2.5 py-2 rounded-md border text-xs font-medium flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                  crtSettings.enabled
                    ? 'bg-[#16291D] border-[#4ADE80]/80 text-[#4ADE80] shadow-[0_0_12px_rgba(74,222,128,0.22)]'
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#C8CBC4] hover:text-[#F2F2EE] hover:border-[#3A433A]'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Monitor className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Modo CRT</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded border shrink-0 leading-none ${
                    crtSettings.enabled
                      ? 'bg-[#1E3B27] border-[#4ADE80]/45 text-[#86EFAC]'
                      : 'bg-[#171B17] border-[#2F362F] text-[#9EA49B]'
                  }`}
                >
                  ALPHA
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCrtConfigOpen(true);
                  onCloseMobile();
                }}
                aria-label="Configurar CRT"
                title="Configurar CRT"
                className="shrink-0 w-[34px] h-[34px] rounded-md border border-[#262B26] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#3A433A] flex items-center justify-center transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="relative h-6">
          <RetroEasterEggSlot slot="sidebar" mode="corner" cornerOverride="br" />
        </div>
      </div>

      {/* Member Footer Card with Quick Logout / Read-Only Login Button */}
      <div className="relative p-3 border-t border-[#232723] shrink-0 flex items-center gap-2">
        <RetroEasterEggSlot slot="sidebar-footer" mode="corner" />
        {user ? (
          <>
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className="flex-1 min-w-0 p-2 rounded-md hover:bg-[#181B18] transition-colors flex items-center gap-2.5 text-left cursor-pointer"
            >
              {profile?.photoURL || user?.photoURL ? (
                <img
                  src={profile?.photoURL || user?.photoURL || ''}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-[#2C312C] shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#222622] text-[#F2F2EE] text-xs font-semibold flex items-center justify-center shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F2F2EE] truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-[#8C9288] truncate">
                  {isMasterAdmin
                    ? 'Admin Mestre'
                    : isAdmin
                      ? 'Administrador'
                      : 'Grupo dos Cobras'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={signOutUser}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-[#262B26] bg-[#0C0D0C] text-xs font-medium text-[#90968C] hover:text-[#F87171] hover:border-[#4A2525] hover:bg-[#1F1414] transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0 p-1.5 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#13261A] border border-[#2C6B41] text-[#86EFAC] flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F2F2EE] truncate">
                  Visitante
                </p>
                <p className="text-[11px] text-[#86EFAC] truncate">
                  Somente leitura
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                exitReadOnlyMode();
              }}
              title="Voltar para a tela de login"
              aria-label="Voltar para a tela de login"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-[#2C342C] bg-[#0C0D0C] text-xs font-medium text-[#C8CBC4] hover:text-[#4ADE80] hover:border-[#4ADE80]/60 transition-colors shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
