import { useMemo } from 'react';
import {
  Award,
  Gamepad2,
  LayoutGrid,
  MessageSquareText,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  COBRA_LOGO_PATH,
  GENRES,
  PLATFORMS,
  resolveAssetUrl,
  type ActiveTab,
} from '../types';

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
    reviews,
    members,
    bans,
  } = useVeredito();

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

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: typeof LayoutGrid;
    count?: number;
  }[] = [
    { id: 'catalog', label: 'Catálogo', icon: LayoutGrid, count: gamesWithStats.length },
    { id: 'feed', label: 'Feed Social', icon: MessageSquareText, count: reviews.length },
    { id: 'ranking', label: 'Ranking', icon: Award },
    { id: 'members', label: 'Membros', icon: Users, count: members.length },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Painel Admin',
            icon: Shield,
            count: bans.length > 0 ? bans.length : undefined,
          },
        ]
      : []),
  ];

  const handleNavClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleGenreClick = (genre: string) => {
    onSelectGenre(genre);
    onCloseMobile();
  };

  const handlePlatformClick = (platform: string) => {
    onSelectPlatform(platform);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#121412] border-r border-[#232723] text-[#F2F2EE]">
      {/* Brand Header with CobraCritic Logo */}
      <div className="h-16 px-4 border-b border-[#232723] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('catalog')}
          aria-label="CobraCritic — Ir para o catálogo"
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

      {/* Scrollable Navigation & Categories */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
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

        {/* Genre Categories */}
        <div className="space-y-1 pt-4 border-t border-[#1F231F]">
          <div className="px-2.5 pb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-mono text-[#787D75]">Gêneros</p>
            {selectedGenre !== 'all' && (
              <button
                type="button"
                onClick={() => handleGenreClick('all')}
                className="text-[11px] text-[#4ADE80] hover:underline cursor-pointer"
              >
                Todos
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {GENRES.map((genre) => {
              const count = genreCounts[genre] || 0;
              const isSelected = activeTab === 'catalog' && selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleGenreClick(isSelected ? 'all' : genre)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D221D] text-[#4ADE80]'
                      : 'text-[#A8ACA5] hover:text-[#F2F2EE] hover:bg-[#181B18]'
                  }`}
                >
                  <span className="truncate">{genre}</span>
                  {count > 0 && (
                    <span className="font-mono text-[11px] text-[#787D75] tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Platforms Quick Filter */}
        <div className="space-y-1 pt-4 border-t border-[#1F231F]">
          <div className="px-2.5 pb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-mono text-[#787D75]">Plataformas</p>
            {selectedPlatform !== 'all' && (
              <button
                type="button"
                onClick={() => handlePlatformClick('all')}
                className="text-[11px] text-[#4ADE80] hover:underline cursor-pointer"
              >
                Todas
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {PLATFORMS.map((plat) => {
              const count = platformCounts[plat] || 0;
              const isSelected = activeTab === 'catalog' && selectedPlatform === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => handlePlatformClick(isSelected ? 'all' : plat)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D221D] text-[#4ADE80]'
                      : 'text-[#A8ACA5] hover:text-[#F2F2EE] hover:bg-[#181B18]'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Gamepad2 className="w-3.5 h-3.5 text-[#666B63] shrink-0" />
                    <span className="truncate">{plat}</span>
                  </span>
                  {count > 0 && (
                    <span className="font-mono text-[11px] text-[#787D75] tabular-nums">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Member Footer Card */}
      <div className="p-3 border-t border-[#232723] shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('profile')}
          className="w-full p-2 rounded-md hover:bg-[#181B18] transition-colors flex items-center gap-3 text-left cursor-pointer"
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
