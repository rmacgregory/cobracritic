import { useState } from 'react';
import { Ban, Check, Copy, Eye, LogIn, LogOut, Menu, Plus, Shield } from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { AuthGate } from './components/AuthGate';
import { CatalogView } from './components/CatalogView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventsView } from './components/EventsView';
import { GameDetailView } from './components/GameDetailView';
import { GameFormModal } from './components/GameFormModal';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { HomeView } from './components/HomeView';
import { MembersView } from './components/MembersView';
import { NotificationsBell } from './components/NotificationsBell';
import { ProfileView } from './components/ProfileView';
import { RankingView } from './components/RankingView';
import { RetrospectiveView } from './components/RetrospectiveView';
import { ReviewFormModal } from './components/ReviewFormModal';
import { Sidebar } from './components/Sidebar';
import { SocialFeedView } from './components/SocialFeedView';
import { VereditoProvider, useVeredito } from './context/VereditoContext';
import {
  COBRA_LOGO_PATH,
  resolveAssetUrl,
  type ActiveTab,
  type Game,
  type GameWithStats,
  type Review,
} from './types';

function CobraCriticShell() {
  const {
    user,
    authReady,
    signingIn,
    authError,
    adminAuthError,
    isAdmin,
    isRealAdmin,
    viewAsMember,
    toggleViewAsMember,
    isBanned,
    currentBan,
    profileSetupPending,
    gamesWithStats,
    members,
    myStatusByGame,
    registrationLocked,
    readOnlyMode,
    enterReadOnlyMode,
    exitReadOnlyMode,
    signInWithGoogle,
    signInWithAdminCredentials,
    signOutUser,
    createGame,
    updateGame,
    saveReview,
    deleteReview,
  } = useVeredito();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [profileFocusSection, setProfileFocusSection] = useState<
    'notifications' | null
  >(null);
  const [initialEventId, setInitialEventId] = useState<string | null>(null);

  const [showGameModal, setShowGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [reviewModalTarget, setReviewModalTarget] = useState<{
    game: Game;
    existing: Review | null;
  } | null>(null);

  const selectedGame = selectedGameId
    ? gamesWithStats.find((g) => g.id === selectedGameId) || null
    : null;

  const selectedMember = selectedMemberId
    ? members.find((m) => m.uid === selectedMemberId) || null
    : null;

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedGameId(null);
    if (tab !== 'members') {
      setSelectedMemberId(null);
    }
    if (tab === 'catalog') {
      setSelectedGenre('all');
      setSelectedPlatform('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGenre = (genre: string) => {
    setActiveTab('catalog');
    setSelectedGameId(null);
    setSelectedGenre(genre);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlatform = (platform: string) => {
    setActiveTab('catalog');
    setSelectedGameId(null);
    setSelectedPlatform(platform);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMember = (memberUid: string | null) => {
    if (!user) return;
    setActiveTab('members');
    setSelectedGameId(null);
    setSelectedMemberId(memberUid);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNotificationSettings = () => {
    setSelectedGameId(null);
    setSelectedMemberId(null);
    setActiveTab('profile');
    setProfileFocusSection('notifications');
  };

  const handleGoToEvents = (eventId?: string) => {
    setSelectedGameId(null);
    setSelectedMemberId(null);
    setInitialEventId(eventId ?? null);
    setActiveTab('events');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNewGame = () => {
    if (!user) return;
    setEditingGame(null);
    setShowGameModal(true);
  };

  const handleOpenEditGame = (game: GameWithStats) => {
    if (!user) return;
    setEditingGame(game);
    setShowGameModal(true);
  };

  const handleOpenReview = (game: GameWithStats, existing?: Review | null) => {
    if (!user) return;
    const foundExisting =
      existing !== undefined
        ? existing
        : game.reviews.find((r) => r.authorId === user.uid) || null;
    setReviewModalTarget({ game, existing: foundExisting });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0C0D0C] text-[#90968C] flex items-center justify-center">
        <p className="text-sm font-mono">Carregando CobraCritic...</p>
      </div>
    );
  }

  if (!user && !readOnlyMode) {
    return (
      <AuthGate
        onSignIn={signInWithGoogle}
        onAdminSignIn={signInWithAdminCredentials}
        onEnterReadOnly={enterReadOnlyMode}
        registrationLocked={registrationLocked}
        signingIn={signingIn}
        authError={authError}
        adminAuthError={adminAuthError}
      />
    );
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#0C0D0C] text-[#F2F2EE] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#141614] border border-[#3F2222] p-8 text-center space-y-6">
          <img
            src={resolveAssetUrl(COBRA_LOGO_PATH)}
            alt="CobraCritic"
            className="h-9 w-auto mx-auto object-contain"
          />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-[#F87171]">
              <Ban className="w-4 h-4" />
              <span>Acesso suspenso</span>
            </div>
            <h1 className="font-serif text-2xl font-medium text-[#F2F2EE]">
              Sua conta foi banida do CobraCritic
            </h1>
            {currentBan?.reason && (
              <p className="text-sm text-[#C8CBC4] bg-[#0C0D0C] border border-[#262A26] p-3 rounded-md mt-3">
                Motivo: {currentBan.reason}
              </p>
            )}
            <p className="text-xs text-[#8C9288] pt-1">
              Entre em contato com um administrador do Grupo dos Cobras caso queira
              revisar a suspensão.
            </p>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    );
  }

  if (user && profileSetupPending && !isRealAdmin) {
    return (
      <div className="min-h-screen bg-[#0C0D0C] text-[#F2F2EE] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-[#141614] border border-[#262A26] p-8 space-y-5">
          <img
            src={resolveAssetUrl(COBRA_LOGO_PATH)}
            alt="CobraCritic"
            className="h-9 w-auto object-contain"
          />
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#4ADE80] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Ativação de Conta Admin</span>
            </p>
            <h1 className="font-serif text-2xl font-medium text-[#F2F2EE]">
              Falta vincular este UID como Administrador
            </h1>
            <p className="text-sm text-[#A8ACA5] leading-relaxed">
              Esta conta entrou com usuário e senha, mas ainda não recebeu o selo de
              administrador no Firestore. Copie o UID abaixo, entre com sua conta Google
              de Admin Mestre e cole em <strong>Painel Admin → Conceder Admin por UID</strong>.
            </p>
          </div>

          <div className="bg-[#0C0D0C] border border-[#2A2F2A] p-3 rounded-md flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-[#4ADE80] truncate">
              {user.uid}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(user.uid);
                setCopiedUid(true);
                setTimeout(() => setCopiedUid(false), 2000);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#1D221D] text-[#F2F2EE] rounded cursor-pointer shrink-0"
            >
              {copiedUid ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar UID</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair e voltar para o login</span>
          </button>
        </div>
      </div>
    );
  }

  const tabLabels: Record<ActiveTab, string> = {
    home: 'Início',
    catalog: 'Catálogo',
    feed: 'Feed Social',
    events: 'Eventos',
    ranking: 'Ranking',
    retrospective: 'Retrospectiva',
    members: 'Membros',
    profile: 'Meu Perfil',
    admin: 'Painel Admin',
  };

  const effectiveTab: ActiveTab =
    (activeTab === 'admin' && !isAdmin) ||
    ((activeTab === 'profile' || activeTab === 'members') && !user)
      ? 'home'
      : activeTab;

  const breadcrumbTrail: string[] = [tabLabels[effectiveTab]];
  if (selectedGame) {
    breadcrumbTrail.push(selectedGame.title);
  } else if (effectiveTab === 'catalog' && selectedGenre !== 'all') {
    breadcrumbTrail.push(selectedGenre);
  } else if (effectiveTab === 'catalog' && selectedPlatform !== 'all') {
    breadcrumbTrail.push(selectedPlatform);
  } else if (effectiveTab === 'members' && selectedMember) {
    breadcrumbTrail.push(selectedMember.displayName);
  }

  return (
    <div className="min-h-screen flex bg-[#0C0D0C] text-[#F2F2EE]">
      <Sidebar
        activeTab={effectiveTab}
        selectedGenre={selectedGenre}
        selectedPlatform={selectedPlatform}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onSelectTab={handleSelectTab}
        onSelectGenre={handleSelectGenre}
        onSelectPlatform={handleSelectPlatform}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Workspace Header with Global Search */}
        <header className="sticky top-0 z-30 h-16 bg-[#0C0D0C]/95 backdrop-blur-sm border-b border-[#232723] px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
              className="lg:hidden p-2 -ml-2 text-[#A8ACA5] hover:text-[#F2F2EE] cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav
              aria-label="Localização atual"
              className="hidden sm:flex items-center gap-2 text-sm min-w-0 max-w-[240px] xl:max-w-[320px]"
            >
              {breadcrumbTrail.map((crumb, idx) => (
                <span key={`${crumb}-${idx}`} className="flex items-center gap-2 min-w-0">
                  {idx > 0 && (
                    <span className="text-[#4B5148] shrink-0" aria-hidden="true">
                      /
                    </span>
                  )}
                  <span
                    className={`truncate ${
                      idx === breadcrumbTrail.length - 1
                        ? 'text-[#F2F2EE] font-medium'
                        : 'text-[#8C9288]'
                    }`}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <GlobalSearchBar
            onSelectGame={handleSelectGame}
            onSelectMember={(uid) => handleSelectMember(uid)}
          />

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!user && readOnlyMode ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[#13261A] border border-[#2C6B41] text-[#86EFAC] whitespace-nowrap shrink-0">
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Modo somente leitura</span>
                  <span className="sm:hidden">Leitura</span>
                </span>
                <button
                  type="button"
                  onClick={exitReadOnlyMode}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Voltar ao login</span>
                  <span className="sm:hidden">Login</span>
                </button>
              </>
            ) : (
              <>
                {isRealAdmin && (
                  <button
                    type="button"
                    onClick={toggleViewAsMember}
                    aria-pressed={viewAsMember}
                    title={
                      viewAsMember
                        ? 'Você está vendo o site como usuário comum. Clique para voltar ao modo Admin.'
                        : 'Visualizar o site como um usuário comum'
                    }
                    aria-label={
                      viewAsMember
                        ? 'Sair da visualização de usuário comum e voltar ao modo Admin'
                        : 'Ver o site como usuário comum'
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      viewAsMember
                        ? 'bg-[#241D0F] border-[#FBBF24]/70 text-[#FDE68A] hover:bg-[#2E2512]'
                        : 'bg-[#141614] border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#3A433A]'
                    }`}
                  >
                    {viewAsMember ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                        <span className="hidden sm:inline">Modo usuário · Voltar p/ Admin</span>
                        <span className="sm:hidden">Voltar Admin</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden md:inline">Ver como usuário</span>
                      </>
                    )}
                  </button>
                )}

                <NotificationsBell
                  onSelectGame={handleSelectGame}
                  onEditGame={handleOpenEditGame}
                  onSelectEvents={() => handleSelectTab('events')}
                  onOpenNotificationSettings={handleOpenNotificationSettings}
                />

                <button
                  type="button"
                  onClick={handleOpenNewGame}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Cadastrar jogo</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1">
          {selectedGame ? (
            <GameDetailView
              game={selectedGame}
              onBack={() => setSelectedGameId(null)}
              onOpenReview={handleOpenReview}
              onEditGame={handleOpenEditGame}
              onSelectAuthor={user ? (uid) => handleSelectMember(uid) : undefined}
            />
          ) : effectiveTab === 'home' ? (
            <HomeView
              onSelectGame={handleSelectGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
              onOpenReview={(g) => handleOpenReview(g)}
              onOpenNewGame={handleOpenNewGame}
              onGoToCatalog={() => handleSelectTab('catalog')}
              onGoToFeed={() => handleSelectTab('feed')}
              onGoToEvents={handleGoToEvents}
            />
          ) : effectiveTab === 'catalog' ? (
            <CatalogView
              selectedPlatform={selectedPlatform}
              selectedGenre={selectedGenre}
              onChangePlatform={setSelectedPlatform}
              onChangeGenre={setSelectedGenre}
              onSelectGame={handleSelectGame}
              onOpenNewGame={handleOpenNewGame}
              onOpenReview={(g) => handleOpenReview(g)}
              onGoToFeed={() => handleSelectTab('feed')}
            />
          ) : effectiveTab === 'feed' ? (
            <SocialFeedView
              onSelectGame={handleSelectGame}
              onSelectAuthor={user ? (uid) => handleSelectMember(uid) : undefined}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
              onGoToCatalog={() => handleSelectTab('catalog')}
            />
          ) : effectiveTab === 'events' ? (
            <EventsView
              onSelectGame={handleSelectGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
              initialEventId={initialEventId}
              onClearInitialEvent={() => setInitialEventId(null)}
            />
          ) : effectiveTab === 'ranking' ? (
            <RankingView
              onSelectGame={handleSelectGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
            />
          ) : effectiveTab === 'retrospective' ? (
            <RetrospectiveView
              onSelectGame={handleSelectGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
            />
          ) : effectiveTab === 'members' ? (
            <MembersView
              selectedMemberId={selectedMemberId}
              onSelectMember={handleSelectMember}
              onSelectGame={handleSelectGame}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
            />
          ) : effectiveTab === 'admin' ? (
            <AdminPanelView
              onSelectGame={handleSelectGame}
              onEditGame={handleOpenEditGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
            />
          ) : (
            <ProfileView
              onSelectGame={handleSelectGame}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
              focusSection={profileFocusSection}
              onClearFocusSection={() => setProfileFocusSection(null)}
            />
          )}
        </div>

        <footer className="border-t border-[#232723] mt-16">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#787D75]">
            <img
              src={resolveAssetUrl(COBRA_LOGO_PATH)}
              alt="CobraCritic"
              className="h-5 w-auto object-contain opacity-85"
            />
            <p>Grupo dos Cobras · Catálogo manual e críticas de jogos.</p>
          </div>
        </footer>
      </div>

      {showGameModal && (
        <GameFormModal
          initialGame={editingGame}
          onClose={() => {
            setShowGameModal(false);
            setEditingGame(null);
          }}
          onSubmit={async (input) => {
            if (editingGame) {
              await updateGame(editingGame.id, input);
            } else {
              const newId = await createGame(input);
              setSelectedGameId(newId);
            }
          }}
        />
      )}

      {reviewModalTarget && (
        <ReviewFormModal
          game={reviewModalTarget.game}
          existingReview={reviewModalTarget.existing}
          initialPlayStatus={myStatusByGame[reviewModalTarget.game.id] ?? null}
          onClose={() => setReviewModalTarget(null)}
          onSubmit={async (input) => {
            await saveReview(reviewModalTarget.game, input);
          }}
          onDelete={
            reviewModalTarget.existing
              ? async () => {
                  if (reviewModalTarget.existing) {
                    await deleteReview(reviewModalTarget.existing.id);
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VereditoProvider>
        <CobraCriticShell />
      </VereditoProvider>
    </ErrorBoundary>
  );
}
