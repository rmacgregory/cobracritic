import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Crown,
  Edit3,
  ExternalLink,
  Flag,
  Lock,
  Plus,
  Power,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  LIMITS,
  type CobraEvent,
  type EventCategory,
  type EventNominee,
  type EventStatus,
  type EventVote,
  type Game,
} from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';

interface EventsViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (uid: string) => void;
}

function createLocalId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getStatusBadge(status: EventStatus): {
  label: string;
  dotClass: string;
  containerClass: string;
} {
  if (status === 'active') {
    return {
      label: 'Ativo · Votação aberta',
      dotClass: 'bg-[#4ADE80]',
      containerClass: 'bg-[#122619] border-[#245736] text-[#86EFAC]',
    };
  }
  if (status === 'closed') {
    return {
      label: 'Encerrado · Vencedores definidos',
      dotClass: 'bg-[#FBBF24]',
      containerClass: 'bg-[#261E0F] border-[#5A4419] text-[#FDE68A]',
    };
  }
  return {
    label: 'Inativo · Visível apenas para admins',
    dotClass: 'bg-[#787D75]',
    containerClass: 'bg-[#1B1E1B] border-[#303530] text-[#A8ACA5]',
  };
}

interface AddNomineeControlsProps {
  category: EventCategory;
  games: Game[];
  busy: boolean;
  onAddNominee: (nominee: EventNominee) => Promise<void>;
}

function AddNomineeControls({
  category,
  games,
  busy,
  onAddNominee,
}: AddNomineeControlsProps) {
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');

  const existingGameIds = useMemo(
    () => new Set(category.nominees.map((n) => n.gameId).filter(Boolean)),
    [category.nominees],
  );
  const existingTitles = useMemo(
    () => new Set(category.nominees.map((n) => normalizeSearch(n.title))),
    [category.nominees],
  );

  const filteredGames = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    const list = q
      ? games.filter(
          (g) =>
            normalizeSearch(g.title).includes(q) ||
            normalizeSearch(g.developer).includes(q),
        )
      : games;
    return list.slice(0, 8);
  }, [games, searchQuery]);

  const isFull = category.nominees.length >= LIMITS.EVENT_NOMINEES_MAX;

  const handleSelectCatalogGame = async (game: Game) => {
    if (isFull || busy) return;
    await onAddNominee({
      id: createLocalId('nom'),
      gameId: game.id,
      title: game.title,
      coverUrl: game.coverUrl || '',
    });
    setSearchQuery('');
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = manualTitle.trim();
    if (!cleanTitle || isFull || busy) return;
    await onAddNominee({
      id: createLocalId('nom'),
      gameId: '',
      title: cleanTitle.slice(0, LIMITS.EVENT_NOMINEE_TITLE_MAX),
      coverUrl: manualCoverUrl.trim().slice(0, LIMITS.URL_MAX),
    });
    setManualTitle('');
    setManualCoverUrl('');
  };

  if (isFull) {
    return (
      <p className="text-xs text-[#8C9288] pt-2 border-t border-[#232723]">
        Limite de {LIMITS.EVENT_NOMINEES_MAX} jogos indicados atingido nesta categoria.
      </p>
    );
  }

  return (
    <div className="pt-3 border-t border-[#232723] space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-mono text-[#90968C]">
          Adicionar jogo para votação
        </p>
        <div className="inline-flex rounded-md border border-[#262B26] bg-[#0C0D0C] p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode('catalog')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'catalog'
                ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                : 'text-[#8C9288] hover:text-[#F2F2EE]'
            }`}
          >
            Do catálogo
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'manual'
                ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                : 'text-[#8C9288] hover:text-[#F2F2EE]'
            }`}
          >
            Digitar jogo
          </button>
        </div>
      </div>

      {mode === 'catalog' ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#666B63] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar jogo cadastrado no CobraCritic..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
            />
          </div>

          {filteredGames.length === 0 ? (
            <p className="text-xs text-[#787D75] py-1">
              Nenhum jogo encontrado no catálogo. Você pode usar a aba “Digitar jogo”.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredGames.map((game) => {
                const alreadyAdded =
                  existingGameIds.has(game.id) ||
                  existingTitles.has(normalizeSearch(game.title));
                return (
                  <button
                    key={game.id}
                    type="button"
                    disabled={alreadyAdded || busy}
                    onClick={() => handleSelectCatalogGame(game)}
                    className={`flex items-center gap-2.5 p-1.5 rounded-md border text-left transition-colors ${
                      alreadyAdded
                        ? 'bg-[#101210] border-[#1F231F] text-[#666B63] cursor-not-allowed'
                        : 'bg-[#0C0D0C] border-[#262B26] hover:border-[#4ADE80]/60 hover:bg-[#161916] text-[#F2F2EE] cursor-pointer'
                    }`}
                  >
                    <GameCover
                      title={game.title}
                      coverUrl={game.coverUrl}
                      compact
                      className="w-8 shrink-0 rounded-[2px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{game.title}</p>
                      <p className="text-[11px] text-[#787D75] truncate">
                        {game.releaseYear || 'Catálogo'}
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-[10px] font-mono text-[#4ADE80] px-1.5 shrink-0">
                        Na lista
                      </span>
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-[#4ADE80] shrink-0 mr-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            maxLength={LIMITS.EVENT_NOMINEE_TITLE_MAX}
            placeholder="Nome do jogo indicado..."
            className="px-3 py-2 text-xs bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
          />
          <input
            type="url"
            value={manualCoverUrl}
            onChange={(e) => setManualCoverUrl(e.target.value)}
            maxLength={LIMITS.URL_MAX}
            placeholder="URL da capa https://... (opcional)"
            className="px-3 py-2 text-xs bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
          />
          <button
            type="submit"
            disabled={!manualTitle.trim() || busy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </form>
      )}
    </div>
  );
}

interface CloseEventModalProps {
  event: CobraEvent;
  votesByCategory: Record<string, EventVote[]>;
  busy: boolean;
  onClose: () => void;
  onConfirmWinners: (winnersByCategoryId: Record<string, string>) => Promise<void>;
}

function CloseEventModal({
  event,
  votesByCategory,
  busy,
  onClose,
  onConfirmWinners,
}: CloseEventModalProps) {
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cat of event.categories) {
      if (cat.winnerNomineeId) {
        initial[cat.id] = cat.winnerNomineeId;
      }
    }
    return initial;
  });

  const categoriesWithNominees = event.categories.filter((c) => c.nominees.length > 0);
  const chosenCount = categoriesWithNominees.filter((c) => Boolean(selectedWinners[c.id])).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onConfirmWinners(selectedWinners);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-event-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#141614] border border-[#2A302A] rounded-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232723] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#FBBF24] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>
                {event.status === 'closed'
                  ? 'Editar vencedores oficiais'
                  : 'Encerrar evento e definir vencedores'}
              </span>
            </p>
            <h2
              id="close-event-modal-title"
              className="font-serif text-xl font-medium text-[#F2F2EE] mt-1"
            >
              {event.title}
            </h2>
            <p className="text-xs text-[#90968C] mt-1">
              Escolha o jogo vencedor em cada categoria. Os membros que votaram no vencedor serão
              destacados automaticamente no resultado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-5 flex-1">
            {categoriesWithNominees.length === 0 ? (
              <p className="text-sm text-[#90968C] py-6 text-center">
                Este evento ainda não possui categorias com jogos indicados.
              </p>
            ) : (
              categoriesWithNominees.map((category, idx) => {
                const catVotes = votesByCategory[category.id] || [];
                const currentWinner = selectedWinners[category.id] || '';
                return (
                  <div
                    key={category.id}
                    className="bg-[#0F110F] border border-[#232723] rounded-md p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#F2F2EE]">
                        <span className="font-mono text-xs text-[#787D75] mr-2">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {category.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[#787D75]">
                        {catVotes.length} {catVotes.length === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.nominees.map((nominee) => {
                        const isChosen = currentWinner === nominee.id;
                        const nomineeVoteCount = catVotes.filter(
                          (v) => v.nomineeId === nominee.id,
                        ).length;
                        return (
                          <button
                            key={nominee.id}
                            type="button"
                            onClick={() =>
                              setSelectedWinners((prev) => ({
                                ...prev,
                                [category.id]: isChosen ? '' : nominee.id,
                              }))
                            }
                            className={`flex items-center gap-2.5 p-2 rounded-md border text-left transition-colors cursor-pointer ${
                              isChosen
                                ? 'bg-[#1D2418] border-[#FBBF24] text-[#F2F2EE]'
                                : 'bg-[#141614] border-[#262A26] hover:border-[#3A403A] text-[#C8CBC4]'
                            }`}
                          >
                            <GameCover
                              title={nominee.title}
                              coverUrl={nominee.coverUrl}
                              compact
                              className="w-8 shrink-0 rounded-[2px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{nominee.title}</p>
                              <p className="text-[11px] text-[#787D75]">
                                {nomineeVoteCount}{' '}
                                {nomineeVoteCount === 1 ? 'palpite' : 'palpites'}
                              </p>
                            </div>
                            {isChosen && (
                              <Trophy className="w-4 h-4 text-[#FBBF24] shrink-0 mr-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-4 border-t border-[#232723] bg-[#101210] flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#90968C]">
              Vencedores escolhidos:{' '}
              <span className="font-mono text-[#F2F2EE]">
                {chosenCount}/{categoriesWithNominees.length}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-3.5 py-2 text-xs font-medium text-[#A8ACA5] border border-[#2B302B] rounded-md hover:text-[#F2F2EE] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || (categoriesWithNominees.length > 0 && chosenCount === 0)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded-md hover:bg-[#FCD34D] disabled:opacity-50 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>
                  {busy
                    ? 'Salvando...'
                    : event.status === 'closed'
                      ? 'Atualizar vencedores'
                      : 'Encerrar evento e revelar acertos'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EventsView({ onSelectGame, onSelectMember }: EventsViewProps) {
  const {
    user,
    isAdmin,
    events,
    eventVotes,
    games,
    membersById,
    createEvent,
    updateEvent,
    deleteEvent,
    castEventVote,
    removeEventVote,
  } = useVeredito();

  const visibleEvents = useMemo(
    () => (isAdmin ? events : events.filter((ev) => ev.status !== 'inactive')),
    [events, isAdmin],
  );

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  // Create event form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<EventStatus>('inactive');

  // Edit event metadata
  const [editingMeta, setEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // New / rename category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const gamesById = useMemo(() => {
    const map: Record<string, Game> = {};
    for (const g of games) map[g.id] = g;
    return map;
  }, [games]);

  // Keep selectedEventId pointing at a valid visible event
  useEffect(() => {
    if (visibleEvents.length === 0) {
      setSelectedEventId(null);
      return;
    }
    if (!selectedEventId || !visibleEvents.some((e) => e.id === selectedEventId)) {
      const firstActive = visibleEvents.find((e) => e.status === 'active');
      setSelectedEventId((firstActive || visibleEvents[0]).id);
    }
  }, [visibleEvents, selectedEventId]);

  const selectedEvent = useMemo(
    () => visibleEvents.find((e) => e.id === selectedEventId) || null,
    [visibleEvents, selectedEventId],
  );

  useEffect(() => {
    setConfirmDeleteEvent(false);
    setConfirmDeleteCategoryId(null);
    setEditingMeta(false);
    setEditingCategoryId(null);
  }, [selectedEventId]);

  const votesForSelectedEvent = useMemo(() => {
    if (!selectedEvent) return [];
    return eventVotes.filter((v) => v.eventId === selectedEvent.id);
  }, [eventVotes, selectedEvent]);

  const votesByCategory = useMemo(() => {
    const grouped: Record<string, EventVote[]> = {};
    for (const vote of votesForSelectedEvent) {
      if (!grouped[vote.categoryId]) grouped[vote.categoryId] = [];
      grouped[vote.categoryId].push(vote);
    }
    return grouped;
  }, [votesForSelectedEvent]);

  const myVoteByCategory = useMemo(() => {
    const map: Record<string, EventVote> = {};
    if (!user) return map;
    for (const vote of votesForSelectedEvent) {
      if (vote.userId === user.uid) {
        map[vote.categoryId] = vote;
      }
    }
    return map;
  }, [votesForSelectedEvent, user]);

  const uniqueVoterCount = useMemo(() => {
    const set = new Set<string>();
    for (const vote of votesForSelectedEvent) set.add(vote.userId);
    return set.size;
  }, [votesForSelectedEvent]);

  // Compute accuracy leaderboard for closed events
  const closedResults = useMemo(() => {
    if (!selectedEvent || selectedEvent.status !== 'closed') {
      return {
        categoriesWithWinnerCount: 0,
        ranking: [] as {
          userId: string;
          displayName: string;
          primaryPhoto: string;
          fallbackPhoto: string;
          correctCount: number;
          votedCount: number;
          accuracyPct: number;
          isTopScorer: boolean;
        }[],
      };
    }

    const winnerByCategory: Record<string, string> = {};
    let categoriesWithWinnerCount = 0;
    for (const cat of selectedEvent.categories) {
      if (cat.winnerNomineeId) {
        winnerByCategory[cat.id] = cat.winnerNomineeId;
        categoriesWithWinnerCount += 1;
      }
    }

    const memberStats = new Map<
      string,
      {
        userId: string;
        displayName: string;
        primaryPhoto: string;
        fallbackPhoto: string;
        correctCount: number;
        votedCount: number;
      }
    >();

    for (const vote of votesForSelectedEvent) {
      const liveMember = membersById[vote.userId];
      const existing = memberStats.get(vote.userId) || {
        userId: vote.userId,
        displayName: liveMember?.displayName || vote.userName,
        primaryPhoto:
          liveMember?.photoURL ||
          (user && vote.userId === user.uid ? user.photoURL || '' : '') ||
          vote.userPhotoURL ||
          '',
        fallbackPhoto:
          vote.userPhotoURL ||
          (user && vote.userId === user.uid ? user.photoURL || '' : ''),
        correctCount: 0,
        votedCount: 0,
      };
      existing.votedCount += 1;
      if (
        winnerByCategory[vote.categoryId] &&
        winnerByCategory[vote.categoryId] === vote.nomineeId
      ) {
        existing.correctCount += 1;
      }
      memberStats.set(vote.userId, existing);
    }

    const sorted = Array.from(memberStats.values()).sort((a, b) => {
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (b.votedCount !== a.votedCount) return b.votedCount - a.votedCount;
      return a.displayName.localeCompare(b.displayName, 'pt-BR');
    });

    const highestScore = sorted.length > 0 ? sorted[0].correctCount : 0;

    return {
      categoriesWithWinnerCount,
      ranking: sorted.map((entry) => ({
        ...entry,
        accuracyPct:
          categoriesWithWinnerCount > 0
            ? Math.round((entry.correctCount / categoriesWithWinnerCount) * 100)
            : 0,
        isTopScorer: highestScore > 0 && entry.correctCount === highestScore,
      })),
    };
  }, [selectedEvent, votesForSelectedEvent, membersById, user]);

  const showSuccess = (text: string) => {
    setFeedback({ type: 'success', text });
  };

  const showError = (err: unknown, fallback: string) => {
    const msg = err instanceof Error && err.message ? err.message : fallback;
    setFeedback({ type: 'error', text: msg });
  };

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusyAction('create-event');
    setFeedback(null);
    try {
      const id = await createEvent({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
      });
      setSelectedEventId(id);
      setNewTitle('');
      setNewDescription('');
      setNewStatus('inactive');
      setShowCreateForm(false);
      setManageMode(true);
      showSuccess('Evento criado! Agora adicione as categorias e os jogos indicados.');
    } catch (err) {
      showError(err, 'Não foi possível criar o evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const persistEventUpdate = async (
    target: CobraEvent,
    patch: Partial<{
      title: string;
      description: string;
      status: EventStatus;
      categories: EventCategory[];
    }>,
    actionKey: string,
    successMsg?: string,
  ) => {
    setBusyAction(actionKey);
    setFeedback(null);
    try {
      await updateEvent(target.id, {
        title: patch.title ?? target.title,
        description: patch.description ?? target.description,
        status: patch.status ?? target.status,
        categories: patch.categories ?? target.categories,
      });
      if (successMsg) showSuccess(successMsg);
    } catch (err) {
      showError(err, 'Não foi possível salvar a alteração do evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleActive = async (ev: CobraEvent) => {
    const nextStatus: EventStatus = ev.status === 'active' ? 'inactive' : 'active';
    await persistEventUpdate(
      ev,
      { status: nextStatus },
      'toggle-status',
      nextStatus === 'active'
        ? 'Evento ativado! Todos os membros já podem votar.'
        : 'Evento desativado e ocultado dos membros.',
    );
  };

  const handleSaveMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !editTitle.trim()) return;
    await persistEventUpdate(
      selectedEvent,
      { title: editTitle.trim(), description: editDescription.trim() },
      'save-meta',
      'Informações do evento atualizadas.',
    );
    setEditingMeta(false);
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !newCategoryName.trim()) return;
    if (selectedEvent.categories.length >= LIMITS.EVENT_CATEGORIES_MAX) {
      setFeedback({
        type: 'error',
        text: `Limite de ${LIMITS.EVENT_CATEGORIES_MAX} categorias por evento atingido.`,
      });
      return;
    }
    const nextCategory: EventCategory = {
      id: createLocalId('cat'),
      name: newCategoryName.trim().slice(0, LIMITS.EVENT_CATEGORY_NAME_MAX),
      nominees: [],
      winnerNomineeId: '',
    };
    await persistEventUpdate(
      selectedEvent,
      { categories: [...selectedEvent.categories, nextCategory] },
      'add-category',
      `Categoria “${nextCategory.name}” adicionada.`,
    );
    setNewCategoryName('');
  };

  const handleRenameCategory = async (categoryId: string) => {
    if (!selectedEvent || !editingCategoryName.trim()) return;
    const updated = selectedEvent.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            name: editingCategoryName.trim().slice(0, LIMITS.EVENT_CATEGORY_NAME_MAX),
          }
        : cat,
    );
    await persistEventUpdate(selectedEvent, { categories: updated }, `rename-${categoryId}`);
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedEvent) return;
    const updated = selectedEvent.categories.filter((c) => c.id !== categoryId);
    await persistEventUpdate(
      selectedEvent,
      { categories: updated },
      `delete-cat-${categoryId}`,
      'Categoria removida do evento.',
    );
    setConfirmDeleteCategoryId(null);
  };

  const handleAddNominee = async (categoryId: string, nominee: EventNominee) => {
    if (!selectedEvent) return;
    const updated = selectedEvent.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            nominees: [...cat.nominees, nominee],
          }
        : cat,
    );
    await persistEventUpdate(selectedEvent, { categories: updated }, `add-nom-${categoryId}`);
  };

  const handleRemoveNominee = async (categoryId: string, nomineeId: string) => {
    if (!selectedEvent) return;
    const updated = selectedEvent.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            nominees: cat.nominees.filter((n) => n.id !== nomineeId),
            winnerNomineeId: cat.winnerNomineeId === nomineeId ? '' : cat.winnerNomineeId,
          }
        : cat,
    );
    await persistEventUpdate(selectedEvent, { categories: updated }, `rm-nom-${nomineeId}`);
  };

  const handleConfirmWinners = async (winnersByCategoryId: Record<string, string>) => {
    if (!selectedEvent) return;
    const updatedCategories = selectedEvent.categories.map((cat) => ({
      ...cat,
      winnerNomineeId: winnersByCategoryId[cat.id] || '',
    }));
    await persistEventUpdate(
      selectedEvent,
      {
        status: 'closed',
        categories: updatedCategories,
      },
      'close-event',
      'Evento encerrado! Os vencedores e os membros que acertaram estão em destaque.',
    );
    setShowCloseModal(false);
    setManageMode(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setBusyAction('delete-event');
    setFeedback(null);
    try {
      await deleteEvent(selectedEvent.id);
      setConfirmDeleteEvent(false);
      setManageMode(false);
      showSuccess('Evento excluído permanentemente.');
    } catch (err) {
      showError(err, 'Não foi possível excluir o evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleVoteClick = async (category: EventCategory, nominee: EventNominee) => {
    if (!selectedEvent || selectedEvent.status !== 'active' || !user) return;
    const currentVote = myVoteByCategory[category.id];
    const actionKey = `vote-${category.id}-${nominee.id}`;
    setBusyAction(actionKey);
    setFeedback(null);
    try {
      if (currentVote && currentVote.nomineeId === nominee.id) {
        await removeEventVote(selectedEvent.id, category.id);
      } else {
        await castEventVote(selectedEvent.id, category.id, nominee);
      }
    } catch (err) {
      showError(err, 'Não foi possível registrar seu voto.');
    } finally {
      setBusyAction(null);
    }
  };

  const resolveVoterDisplay = (vote: EventVote) => {
    const liveMember = membersById[vote.userId];
    const isSelf = Boolean(user && vote.userId === user.uid);
    const name = liveMember?.displayName || vote.userName || 'Membro';
    const primarySrc =
      liveMember?.photoURL ||
      (isSelf ? user?.photoURL || '' : '') ||
      vote.userPhotoURL ||
      '';
    const fallbackSrc = vote.userPhotoURL || (isSelf ? user?.photoURL || '' : '');
    return { name, primarySrc, fallbackSrc };
  };

  const myVotedCategoriesCount = selectedEvent
    ? selectedEvent.categories.filter((cat) => Boolean(myVoteByCategory[cat.id])).length
    : 0;

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#232723] pb-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#4ADE80] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>Bolões & Premiações do Grupo</span>
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#F2F2EE]">
            Eventos dos Cobras
          </h1>
          <p className="text-sm text-[#90968C] max-w-2xl">
            Vote nos indicados de cada categoria com palpites abertos para todo o grupo e descubra
            quem mais acerta quando os vencedores oficiais forem revelados.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showCreateForm ? 'Fechar criação' : 'Novo evento'}</span>
          </button>
        )}
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md border text-xs sm:text-sm ${
            feedback.type === 'error'
              ? 'bg-[#211313] border-[#522626] text-[#FCA5A5]'
              : 'bg-[#112318] border-[#214D32] text-[#86EFAC]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dispensar aviso"
            className="opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Create Event Form */}
      {isAdmin && showCreateForm && (
        <section className="bg-[#141614] border border-[#2C332C] rounded-md p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#4ADE80]">
              Administração · Cadastrar evento
            </p>
            <h2 className="font-serif text-xl font-medium text-[#F2F2EE] mt-0.5">
              Criar novo evento de votação
            </h2>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#C8CBC4]">Nome do evento *</span>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={LIMITS.EVENT_TITLE_MAX}
                  placeholder="Ex.: The Game Awards 2026 — Bolão dos Cobras"
                  className="w-full px-3 py-2.5 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#C8CBC4] block">Status inicial</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('active')}
                    className={`px-3 py-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer text-left ${
                      newStatus === 'active'
                        ? 'bg-[#122619] border-[#4ADE80] text-[#86EFAC]'
                        : 'bg-[#0C0D0C] border-[#262B26] text-[#8C9288] hover:text-[#F2F2EE]'
                    }`}
                  >
                    Ativo (aberto agora)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('inactive')}
                    className={`px-3 py-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer text-left ${
                      newStatus === 'inactive'
                        ? 'bg-[#1D211D] border-[#8C9288] text-[#F2F2EE]'
                        : 'bg-[#0C0D0C] border-[#262B26] text-[#8C9288] hover:text-[#F2F2EE]'
                    }`}
                  >
                    Inativo (rascunho)
                  </button>
                </div>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#C8CBC4]">
                Descrição / regras (opcional)
              </span>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                maxLength={LIMITS.EVENT_DESCRIPTION_MAX}
                placeholder="Ex.: Façam seus palpites antes da cerimônia oficial. Quem acertar mais categorias leva o título do grupo."
                className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-medium text-[#A8ACA5] border border-[#2A2F2A] rounded-md hover:text-[#F2F2EE] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || busyAction === 'create-event'}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE7B7] disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {busyAction === 'create-event' ? 'Criando...' : 'Criar evento e configurar'}
                </span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Event Selector Strip */}
      {visibleEvents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {visibleEvents.map((ev) => {
            const isSelected = selectedEvent?.id === ev.id;
            const badge = getStatusBadge(ev.status);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEventId(ev.id)}
                className={`shrink-0 px-3.5 py-2.5 rounded-md border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-[#1A1F1A] border-[#4ADE80]/70 text-[#F2F2EE]'
                    : 'bg-[#141614] border-[#262A26] text-[#A8ACA5] hover:border-[#3A403A] hover:text-[#F2F2EE]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotClass}`} />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate max-w-[220px]">
                    {ev.title}
                  </p>
                  <p className="text-[11px] font-mono text-[#787D75]">
                    {ev.categories.length}{' '}
                    {ev.categories.length === 1 ? 'categoria' : 'categorias'} ·{' '}
                    {ev.status === 'active'
                      ? 'Ativo'
                      : ev.status === 'closed'
                        ? 'Encerrado'
                        : 'Inativo'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!selectedEvent ? (
        <section className="bg-[#141614] border border-[#262A26] rounded-md p-10 text-center space-y-3">
          <Trophy className="w-9 h-9 text-[#4B5148] mx-auto" strokeWidth={1.5} />
          <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
            Nenhum evento disponível no momento
          </h2>
          <p className="text-sm text-[#90968C] max-w-md mx-auto">
            {isAdmin
              ? 'Crie o primeiro evento de premiação ou bolão clicando em “Novo evento” acima, adicione categorias e escolha os jogos indicados.'
              : 'Quando um administrador ativar um evento de votação ou premiação, ele aparecerá aqui para você registrar seus palpites.'}
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Selected Event Hero & Admin Controls */}
          <section className="bg-[#141614] border border-[#262A26] rounded-md p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${
                      getStatusBadge(selectedEvent.status).containerClass
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        getStatusBadge(selectedEvent.status).dotClass
                      }`}
                    />
                    {getStatusBadge(selectedEvent.status).label}
                  </span>

                  <span className="text-xs font-mono text-[#8C9288] inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {uniqueVoterCount}{' '}
                    {uniqueVoterCount === 1 ? 'membro votou' : 'membros votaram'}
                  </span>

                  {selectedEvent.status === 'active' && selectedEvent.categories.length > 0 && (
                    <span className="text-xs font-mono text-[#4ADE80]">
                      · Seus palpites: {myVotedCategoriesCount}/{selectedEvent.categories.length}
                    </span>
                  )}
                </div>

                {editingMeta ? (
                  <form onSubmit={handleSaveMeta} className="space-y-2.5 pt-1 max-w-2xl">
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={LIMITS.EVENT_TITLE_MAX}
                      className="w-full px-3 py-2 text-base font-serif bg-[#0C0D0C] border border-[#4ADE80] rounded-md text-[#F2F2EE] focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      maxLength={LIMITS.EVENT_DESCRIPTION_MAX}
                      placeholder="Descrição do evento (opcional)"
                      className="w-full px-3 py-2 text-xs bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!editTitle.trim() || busyAction === 'save-meta'}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md cursor-pointer"
                      >
                        Salvar título
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMeta(false)}
                        className="px-3 py-1.5 text-xs text-[#A8ACA5] border border-[#2B302B] rounded-md cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#F2F2EE]">
                        {selectedEvent.title}
                      </h2>
                      {isAdmin && manageMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitle(selectedEvent.title);
                            setEditDescription(selectedEvent.description);
                            setEditingMeta(true);
                          }}
                          title="Editar nome e descrição"
                          className="p-1.5 text-[#8C9288] hover:text-[#4ADE80] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {selectedEvent.description && (
                      <p className="text-sm text-[#B8BCB4] max-w-3xl leading-relaxed">
                        {selectedEvent.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Admin Action Toolbar */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Activate / Deactivate button */}
                  {selectedEvent.status !== 'closed' ? (
                    <button
                      type="button"
                      disabled={busyAction === 'toggle-status'}
                      onClick={() => handleToggleActive(selectedEvent)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                        selectedEvent.status === 'active'
                          ? 'bg-[#1B1E1B] border-[#383E38] text-[#C8CBC4] hover:border-[#F87171]/60 hover:text-[#FCA5A5]'
                          : 'bg-[#122619] border-[#2E6B44] text-[#86EFAC] hover:bg-[#173320]'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {selectedEvent.status === 'active'
                          ? 'Desativar evento'
                          : 'Ativar evento'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction === 'toggle-status'}
                      onClick={() =>
                        persistEventUpdate(
                          selectedEvent,
                          { status: 'active' },
                          'toggle-status',
                          'Evento reaberto para votação.',
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[#303630] bg-[#181B18] text-[#C8CBC4] hover:text-[#F2F2EE] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir votação</span>
                    </button>
                  )}

                  {/* Manage Categories & Nominees */}
                  <button
                    type="button"
                    onClick={() => setManageMode((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      manageMode
                        ? 'bg-[#1D241D] border-[#4ADE80] text-[#4ADE80]'
                        : 'bg-[#0C0D0C] border-[#2B302B] text-[#C8CBC4] hover:text-[#F2F2EE]'
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>
                      {manageMode ? 'Concluir edição' : 'Gerenciar categorias e jogos'}
                    </span>
                  </button>

                  {/* Close Event & Pick Winners */}
                  {selectedEvent.categories.some((c) => c.nominees.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-[#FBBF24] text-[#0C0D0C] hover:bg-[#FCD34D] transition-colors cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>
                        {selectedEvent.status === 'closed'
                          ? 'Editar vencedores'
                          : 'Encerrar e escolher vencedores'}
                      </span>
                    </button>
                  )}

                  {/* Delete Event */}
                  {confirmDeleteEvent ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#241313] border border-[#5A2626] text-xs">
                      <span className="text-[#FCA5A5]">Excluir?</span>
                      <button
                        type="button"
                        disabled={busyAction === 'delete-event'}
                        onClick={handleDeleteEvent}
                        className="px-2 py-0.5 rounded bg-[#B91C1C] text-white font-semibold cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteEvent(false)}
                        className="px-2 py-0.5 rounded text-[#C8CBC4] hover:text-white cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteEvent(true)}
                      title="Excluir evento"
                      aria-label="Excluir evento"
                      className="p-2 rounded-md border border-[#2B302B] bg-[#0C0D0C] text-[#8C9288] hover:text-[#F87171] hover:border-[#4D2525] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Admin Add Category Bar */}
            {isAdmin && manageMode && (
              <form
                onSubmit={handleAddCategory}
                className="pt-4 border-t border-[#232723] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    maxLength={LIMITS.EVENT_CATEGORY_NAME_MAX}
                    placeholder="Nome da nova categoria (ex.: Jogo do Ano, Melhor RPG, Melhor Trilha Sonora)..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0C0D0C] border border-[#2A302A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim() || busyAction === 'add-category'}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE7B7] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar categoria</span>
                </button>
              </form>
            )}
          </section>

          {/* Closed Event Leaderboard: Placar de Acertos */}
          {selectedEvent.status === 'closed' && (
            <section className="bg-[#141713] border border-[#473B19] rounded-md p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#FBBF24] flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Resultado Final · Placar de Acertos</span>
                  </p>
                  <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#F2F2EE] mt-0.5">
                    Quem mais acertou neste evento
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#D6C79A]">
                  {closedResults.categoriesWithWinnerCount}{' '}
                  {closedResults.categoriesWithWinnerCount === 1
                    ? 'categoria premiada'
                    : 'categorias premiadas'}
                </span>
              </div>

              {closedResults.ranking.length === 0 ? (
                <p className="text-sm text-[#90968C]">
                  Nenhum membro registrou votos neste evento antes do encerramento.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {closedResults.ranking.map((entry, idx) => (
                    <button
                      key={entry.userId}
                      type="button"
                      onClick={() => onSelectMember(entry.userId)}
                      className={`p-3.5 rounded-md border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                        entry.isTopScorer
                          ? 'bg-[#1E1B11] border-[#FBBF24]/70 hover:border-[#FBBF24]'
                          : entry.correctCount > 0
                            ? 'bg-[#111913] border-[#26422F] hover:border-[#4ADE80]/60'
                            : 'bg-[#0F110F] border-[#232723] hover:border-[#343A34]'
                      }`}
                    >
                      <span
                        className={`font-mono text-xs w-6 text-center shrink-0 font-bold ${
                          entry.isTopScorer ? 'text-[#FBBF24]' : 'text-[#787D75]'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <MemberAvatar
                        name={entry.displayName}
                        primarySrc={entry.primaryPhoto}
                        fallbackSrc={entry.fallbackPhoto}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                            {entry.displayName}
                          </p>
                          {entry.isTopScorer && (
                            <Crown className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#A8ACA5] mt-0.5">
                          <span
                            className={`font-semibold ${
                              entry.isTopScorer
                                ? 'text-[#FDE68A]'
                                : entry.correctCount > 0
                                  ? 'text-[#4ADE80]'
                                  : 'text-[#8C9288]'
                            }`}
                          >
                            {entry.correctCount}{' '}
                            {entry.correctCount === 1 ? 'acerto' : 'acertos'}
                          </span>
                          {' · '}
                          <span className="font-mono text-[11px] text-[#787D75]">
                            {entry.accuracyPct}% ({entry.votedCount}{' '}
                            {entry.votedCount === 1 ? 'voto' : 'votos'})
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Inactive Notice for Admins */}
          {selectedEvent.status === 'inactive' && (
            <div className="bg-[#181A18] border border-[#2C312C] rounded-md px-4 py-3 text-xs text-[#A8ACA5] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#787D75] shrink-0" />
              <span>
                Este evento está <strong>inativo</strong>. Apenas administradores podem vê-lo e
                configurar categorias/jogos. Clique em <strong>Ativar evento</strong> quando
                quiser liberar a votação para o grupo.
              </span>
            </div>
          )}

          {/* Categories List */}
          {selectedEvent.categories.length === 0 ? (
            <section className="bg-[#141614] border border-[#262A26] rounded-md p-8 text-center space-y-2">
              <Sparkles className="w-7 h-7 text-[#4B5148] mx-auto" />
              <h3 className="font-serif text-xl text-[#F2F2EE]">
                Nenhuma categoria cadastrada ainda
              </h3>
              <p className="text-xs sm:text-sm text-[#90968C] max-w-md mx-auto">
                {isAdmin
                  ? 'Ative o modo “Gerenciar categorias e jogos” acima para criar categorias e adicionar os jogos que disputarão os votos.'
                  : 'O administrador ainda está montando as categorias deste evento.'}
              </p>
            </section>
          ) : (
            <div className="space-y-5">
              {selectedEvent.categories.map((category, categoryIdx) => {
                const catVotes = votesByCategory[category.id] || [];
                const myVote = myVoteByCategory[category.id];
                const winnerNominee = category.winnerNomineeId
                  ? category.nominees.find((n) => n.id === category.winnerNomineeId) || null
                  : null;
                const correctVoters =
                  selectedEvent.status === 'closed' && winnerNominee
                    ? catVotes.filter((v) => v.nomineeId === winnerNominee.id)
                    : [];

                return (
                  <section
                    key={category.id}
                    className="bg-[#141614] border border-[#262A26] rounded-md p-5 space-y-4"
                  >
                    {/* Category Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222622] pb-3.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="font-mono text-xs text-[#4ADE80] bg-[#122619] border border-[#224C32] px-2 py-0.5 rounded shrink-0">
                          {String(categoryIdx + 1).padStart(2, '0')}
                        </span>

                        {isAdmin && manageMode && editingCategoryId === category.id ? (
                          <div className="flex items-center gap-2 flex-1 max-w-md">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              maxLength={LIMITS.EVENT_CATEGORY_NAME_MAX}
                              className="flex-1 px-2.5 py-1 text-sm bg-[#0C0D0C] border border-[#4ADE80] rounded text-[#F2F2EE] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameCategory(category.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryId(null)}
                              className="p-1 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="font-serif text-xl font-medium text-[#F2F2EE] truncate">
                            {category.name}
                          </h3>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-[#8C9288]">
                          {catVotes.length} {catVotes.length === 1 ? 'voto' : 'votos'}
                        </span>

                        {selectedEvent.status === 'active' && myVote && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#122619] border border-[#245736] text-[11px] font-mono text-[#86EFAC]">
                            <Check className="w-3 h-3" />
                            Votado
                          </span>
                        )}

                        {isAdmin && manageMode && editingCategoryId !== category.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                              title="Renomear categoria"
                              className="p-1.5 text-[#8C9288] hover:text-[#4ADE80] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteCategoryId === category.id ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-[#241313] border border-[#5A2626] px-2 py-0.5 rounded">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="text-[#FCA5A5] font-semibold hover:text-white cursor-pointer"
                                >
                                  Remover
                                </button>
                                <span className="text-[#666B63]">/</span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCategoryId(null)}
                                  className="text-[#A8ACA5] hover:text-white cursor-pointer"
                                >
                                  Não
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCategoryId(category.id)}
                                title="Excluir categoria"
                                className="p-1.5 text-[#8C9288] hover:text-[#F87171] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Closed Category Winner + Members Who Guessed Right Highlight */}
                    {selectedEvent.status === 'closed' && winnerNominee && (
                      <div className="bg-[#111F15] border border-[#255436] rounded-md p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#FDE68A]">
                            <Trophy className="w-4 h-4 text-[#FBBF24] shrink-0" />
                            <span>
                              Vencedor oficial:{' '}
                              <strong className="text-[#F2F2EE]">{winnerNominee.title}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#86EFAC]">
                            {correctVoters.length}{' '}
                            {correctVoters.length === 1 ? 'membro acertou' : 'membros acertaram'}
                          </span>
                        </div>

                        {correctVoters.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-mono text-[#86EFAC]/90 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                              Quem acertou:
                            </span>
                            {correctVoters.map((vote) => {
                              const voter = resolveVoterDisplay(vote);
                              const isCurrentUser = Boolean(user && vote.userId === user.uid);
                              return (
                                <button
                                  key={vote.id}
                                  type="button"
                                  onClick={() => onSelectMember(vote.userId)}
                                  className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border text-xs transition-colors cursor-pointer ${
                                    isCurrentUser
                                      ? 'bg-[#173623] border-[#4ADE80] text-[#F2F2EE] font-semibold'
                                      : 'bg-[#14291C] border-[#2C6440] text-[#D1FAE5] hover:border-[#4ADE80]'
                                  }`}
                                >
                                  <MemberAvatar
                                    name={voter.name}
                                    primarySrc={voter.primarySrc}
                                    fallbackSrc={voter.fallbackSrc}
                                    size="xs"
                                  />
                                  <span>{voter.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#90968C]">
                            Nenhum membro acertou o vencedor desta categoria.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Nominees Grid */}
                    {category.nominees.length === 0 ? (
                      <p className="text-xs text-[#787D75] py-2">
                        Nenhum jogo indicado nesta categoria ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.nominees.map((nominee) => {
                          const nomineeVotes = catVotes.filter(
                            (v) => v.nomineeId === nominee.id,
                          );
                          const votePct =
                            catVotes.length > 0
                              ? Math.round((nomineeVotes.length / catVotes.length) * 100)
                              : 0;
                          const isMyChoice = myVote?.nomineeId === nominee.id;
                          const isWinner =
                            selectedEvent.status === 'closed' &&
                            category.winnerNomineeId === nominee.id;
                          const linkedGame = nominee.gameId ? gamesById[nominee.gameId] : null;
                          const voteBusy = busyAction === `vote-${category.id}-${nominee.id}`;

                          return (
                            <div
                              key={nominee.id}
                              className={`rounded-md border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                                isWinner
                                  ? 'bg-[#1A1C13] border-[#FBBF24] shadow-[0_0_0_1px_rgba(251,191,36,0.18)]'
                                  : isMyChoice
                                    ? 'bg-[#121D15] border-[#4ADE80]/80'
                                    : 'bg-[#0F110F] border-[#232723] hover:border-[#323832]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Cover Thumbnail */}
                                <button
                                  type="button"
                                  disabled={!linkedGame}
                                  onClick={() => linkedGame && onSelectGame(linkedGame.id)}
                                  className={`w-14 shrink-0 text-left ${
                                    linkedGame ? 'cursor-pointer group' : 'cursor-default'
                                  }`}
                                >
                                  <GameCover
                                    title={nominee.title}
                                    coverUrl={linkedGame?.coverUrl || nominee.coverUrl}
                                    compact
                                    className="w-full rounded-[3px]"
                                  />
                                </button>

                                {/* Info & Vote Action */}
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {isWinner && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FBBF24] text-[#0C0D0C] text-[10px] font-mono font-bold uppercase tracking-wider">
                                            <Trophy className="w-3 h-3" />
                                            Vencedor
                                          </span>
                                        )}
                                        {isWinner && isMyChoice && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#163822] border border-[#4ADE80] text-[#86EFAC] text-[10px] font-mono font-semibold">
                                            <Award className="w-3 h-3" />
                                            Você acertou!
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="font-serif text-base font-medium text-[#F2F2EE] leading-snug mt-0.5">
                                        {linkedGame ? (
                                          <button
                                            type="button"
                                            onClick={() => onSelectGame(linkedGame.id)}
                                            className="text-left hover:text-[#4ADE80] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>{nominee.title}</span>
                                            <ExternalLink className="w-3 h-3 text-[#666B63] shrink-0" />
                                          </button>
                                        ) : (
                                          nominee.title
                                        )}
                                      </h4>
                                    </div>

                                    {isAdmin && manageMode && (
                                      <button
                                        type="button"
                                        disabled={busyAction === `rm-nom-${nominee.id}`}
                                        onClick={() =>
                                          handleRemoveNominee(category.id, nominee.id)
                                        }
                                        title="Remover jogo da categoria"
                                        className="p-1 text-[#787D75] hover:text-[#F87171] cursor-pointer shrink-0"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Vote Bar + Vote Button */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                                      <span className="text-[#90968C]">
                                        {nomineeVotes.length}{' '}
                                        {nomineeVotes.length === 1 ? 'voto' : 'votos'}
                                        {catVotes.length > 0 ? ` (${votePct}%)` : ''}
                                      </span>

                                      {selectedEvent.status === 'active' && (
                                        <button
                                          type="button"
                                          disabled={voteBusy}
                                          onClick={() => handleVoteClick(category, nominee)}
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans font-semibold transition-colors cursor-pointer ${
                                            isMyChoice
                                              ? 'bg-[#4ADE80] text-[#0C0D0C] hover:bg-[#6EE7B7]'
                                              : 'bg-[#1D221D] text-[#F2F2EE] border border-[#323A32] hover:border-[#4ADE80] hover:text-[#4ADE80]'
                                          }`}
                                        >
                                          {isMyChoice && <Check className="w-3.5 h-3.5" />}
                                          <span>
                                            {voteBusy
                                              ? '...'
                                              : isMyChoice
                                                ? 'Seu voto'
                                                : 'Votar'}
                                          </span>
                                        </button>
                                      )}
                                    </div>

                                    <svg
                                      viewBox="0 0 100 6"
                                      preserveAspectRatio="none"
                                      aria-hidden="true"
                                      className="h-1.5 w-full rounded-full overflow-hidden block"
                                    >
                                      <rect width="100" height="6" className="fill-[#1C201C]" />
                                      <rect
                                        width={votePct}
                                        height="6"
                                        className={
                                          isWinner
                                            ? 'fill-[#FBBF24]'
                                            : isMyChoice
                                              ? 'fill-[#4ADE80]'
                                              : 'fill-[#4A554A]'
                                        }
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>

                              {/* Publicly Visible Member Votes */}
                              <div className="pt-2.5 border-t border-[#1E221E]">
                                {nomineeVotes.length === 0 ? (
                                  <p className="text-[11px] text-[#666B63]">
                                    Nenhum voto neste jogo ainda.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {nomineeVotes.map((vote) => {
                                      const voter = resolveVoterDisplay(vote);
                                      const isSelfVote = Boolean(
                                        user && vote.userId === user.uid,
                                      );
                                      return (
                                        <button
                                          key={vote.id}
                                          type="button"
                                          onClick={() => onSelectMember(vote.userId)}
                                          title={`Ver perfil de ${voter.name}`}
                                          className={`inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border text-[11px] transition-colors cursor-pointer ${
                                            isWinner
                                              ? 'bg-[#262011] border-[#66511D] text-[#FDE68A] hover:border-[#FBBF24]'
                                              : isSelfVote
                                                ? 'bg-[#14261B] border-[#2D6641] text-[#86EFAC] hover:border-[#4ADE80]'
                                                : 'bg-[#161916] border-[#262B26] text-[#C8CBC4] hover:border-[#4ADE80]/50 hover:text-[#F2F2EE]'
                                          }`}
                                        >
                                          <MemberAvatar
                                            name={voter.name}
                                            primarySrc={voter.primarySrc}
                                            fallbackSrc={voter.fallbackSrc}
                                            size="xs"
                                          />
                                          <span className="truncate max-w-[120px]">
                                            {voter.name}
                                          </span>
                                          {isWinner && (
                                            <Check className="w-3 h-3 text-[#4ADE80] shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Admin Add Nominee to Category */}
                    {isAdmin && manageMode && (
                      <AddNomineeControls
                        category={category}
                        games={games}
                        busy={busyAction === `add-nom-${category.id}`}
                        onAddNominee={(nominee) => handleAddNominee(category.id, nominee)}
                      />
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Close Event & Pick Winners Modal */}
      {isAdmin && showCloseModal && selectedEvent && (
        <CloseEventModal
          event={selectedEvent}
          votesByCategory={votesByCategory}
          busy={busyAction === 'close-event'}
          onClose={() => setShowCloseModal(false)}
          onConfirmWinners={handleConfirmWinners}
        />
      )}
    </main>
  );
}
