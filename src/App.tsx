import { useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { CatalogView } from './components/CatalogView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameDetailView } from './components/GameDetailView';
import { GameFormModal } from './components/GameFormModal';
import { GlobalSearchBar } from './components/GlobalSearchBar';
import { MembersView } from './components/MembersView';
import { ProfileView } from './components/ProfileView';
import { RankingView } from './components/RankingView';
import { ReviewFormModal } from './components/ReviewFormModal';
import { Sidebar } from './components/Sidebar';
import { SocialFeedView } from './components/SocialFeedView';
import { VereditoProvider, useVeredito } from './context/VereditoContext';
import type { ActiveTab, Game, GameWithStats, Review } from './types';

function CobraCriticShell() {
  const {
    user,
    authReady,
    signingIn,
    authError,
    gamesWithStats,
    members,
    signInWithGoogle,
    createGame,
    updateGame,
    saveReview,
    deleteReview,
  } = useVeredito();

  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setActiveTab('members');
    setSelectedGameId(null);
    setSelectedMemberId(memberUid);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNewGame = () => {
    setEditingGame(null);
    setShowGameModal(true);
  };

  const handleOpenEditGame = (game: GameWithStats) => {
    setEditingGame(game);
    setShowGameModal(true);
  };

  const handleOpenReview = (game: GameWithStats, existing?: Review | null) => {
    const foundExisting =
      existing !== undefined
        ? existing
        : user
          ? game.reviews.find((r) => r.authorId === user.uid) || null
          : null;
    setReviewModalTarget({ game, existing: foundExisting });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0C0D0C] text-[#90968C] flex items-center justify-center">
        <p className="text-sm font-mono">Carregando CobraCritic...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        onSignIn={signInWithGoogle}
        signingIn={signingIn}
        authError={authError}
      />
    );
  }

  const tabLabels: Record<ActiveTab, string> = {
    catalog: 'Catálogo',
    feed: 'Feed Social',
    ranking: 'Ranking',
    members: 'Membros',
    profile: 'Meu Perfil',
  };

  const breadcrumbTrail: string[] = [tabLabels[activeTab]];
  if (selectedGame) {
    breadcrumbTrail.push(selectedGame.title);
  } else if (activeTab === 'catalog' && selectedGenre !== 'all') {
    breadcrumbTrail.push(selectedGenre);
  } else if (activeTab === 'catalog' && selectedPlatform !== 'all') {
    breadcrumbTrail.push(selectedPlatform);
  } else if (activeTab === 'members' && selectedMember) {
    breadcrumbTrail.push(selectedMember.displayName);
  }

  return (
    <div className="min-h-screen flex bg-[#0C0D0C] text-[#F2F2EE]">
      <Sidebar
        activeTab={activeTab}
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

          <button
            type="button"
            onClick={handleOpenNewGame}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar jogo</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </header>

        <div className="flex-1">
          {selectedGame ? (
            <GameDetailView
              game={selectedGame}
              onBack={() => setSelectedGameId(null)}
              onOpenReview={handleOpenReview}
              onEditGame={handleOpenEditGame}
              onSelectAuthor={(uid) => handleSelectMember(uid)}
            />
          ) : activeTab === 'catalog' ? (
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
          ) : activeTab === 'feed' ? (
            <SocialFeedView
              onSelectGame={handleSelectGame}
              onSelectAuthor={(uid) => handleSelectMember(uid)}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
              onGoToCatalog={() => handleSelectTab('catalog')}
            />
          ) : activeTab === 'ranking' ? (
            <RankingView
              onSelectGame={handleSelectGame}
              onSelectMember={(uid) => handleSelectMember(uid)}
            />
          ) : activeTab === 'members' ? (
            <MembersView
              selectedMemberId={selectedMemberId}
              onSelectMember={handleSelectMember}
              onSelectGame={handleSelectGame}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
            />
          ) : (
            <ProfileView
              onSelectGame={handleSelectGame}
              onEditReview={(game, rev) => handleOpenReview(game, rev)}
            />
          )}
        </div>

        <footer className="border-t border-[#232723] mt-16">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#787D75]">
            <p className="font-serif text-sm text-[#F2F2EE]">CobraCritic</p>
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
