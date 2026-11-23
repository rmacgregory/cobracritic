import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  Flag,
  FolderPlus,
  Lock,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  Settings2,
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

const QUICK_CATEGORY_SUGGESTIONS = [
  'Jogo do Ano',
  'Melhor RPG',
  'Melhor Indie',
  'Melhor Direção de Arte',
  'Melhor Trilha Sonora',
  'Melhor Narrativa',
  'Melhor Ação / Aventura',
  'Melhor Multiplayer',
  'Mais Aguardado',
] as const;

const CLASSIC_AWARD_PRESET = [
  'Jogo do Ano',
  'Melhor RPG',
  'Melhor Indie',
  'Melhor Direção de Arte',
  'Melhor Trilha Sonora',
  'Melhor Narrativa',
] as const;

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

function getStatusMeta(status: EventStatus): {
  shortLabel: string;
  label: string;
  textClass: string;
  badgeClass: string;
} {
  if (status === 'active') {
    return {
      shortLabel: 'Ativo',
      label: 'Ativo · Votação aberta',
      textClass: 'text-[#4ADE80]',
      badgeClass: 'bg-[#122619] border-[#245736] text-[#86EFAC]',
    };
  }
  if (status === 'closed') {
    return {
      shortLabel: 'Encerrado',
      label: 'Encerrado · Vencedores definidos',
      textClass: 'text-[#FBBF24]',
      badgeClass: 'bg-[#261E0F] border-[#5A4419] text-[#FDE68A]',
    };
  }
  return {
    shortLabel: 'Inativo',
    label: 'Inativo · Apenas admins',
    textClass: 'text-[#8C9288]',
    badgeClass: 'bg-[#1B1E1B] border-[#303530] text-[#A8ACA5]',
  };
}

function serializeDraft(
  title: string,
  description: string,
  categories: EventCategory[],
): string {
  return JSON.stringify({
    title: title.trim(),
    description: description.trim(),
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name.trim(),
      winnerNomineeId: cat.winnerNomineeId,
      nominees: cat.nominees.map((n) => ({
        id: n.id,
        gameId: n.gameId,
        title: n.title.trim(),
        coverUrl: n.coverUrl.trim(),
      })),
    })),
  });
}

interface CreateEventModalProps {
  busy: boolean;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    status: EventStatus;
    categories: EventCategory[];
  }) => Promise<void>;
}

function CreateEventModal({ busy, onClose, onCreate }: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EventStatus>('inactive');
  const [preset, setPreset] = useState<'blank' | 'classic'>('classic');
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    const initialCategories: EventCategory[] =
      preset === 'classic'
        ? CLASSIC_AWARD_PRESET.map((name) => ({
            id: createLocalId('cat'),
            name,
            nominees: [],
            winnerNomineeId: '',
          }))
        : [];
    await onCreate({
      title: title.trim(),
      description: description.trim(),
      status,
      categories: initialCategories,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
    >
      <div className="w-full max-w-xl bg-[#141614] border border-[#2A302A] rounded-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#232723] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#4ADE80]">Administração de eventos</p>
            <h2
              id="create-event-modal-title"
              className="font-display text-xl font-semibold text-[#F2F2EE] mt-0.5"
            >
              Novo evento de votação
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar janela"
            className="p-1.5 text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#C8CBC4]">Nome do evento *</span>
            <input
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={LIMITS.EVENT_TITLE_MAX}
              placeholder="Ex.: The Game Awards 2026 — Bolão dos Cobras"
              className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#C8CBC4]">
              Descrição ou regras (opcional)
            </span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={LIMITS.EVENT_DESCRIPTION_MAX}
              placeholder="Ex.: Palpites abertos até a cerimônia. Quem acertar mais categorias vence."
              className="w-full px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-[#C8CBC4] block">
              Estrutura inicial de categorias
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPreset('classic')}
                className={`p-3 rounded-md border text-left transition-colors cursor-pointer space-y-1 ${
                  preset === 'classic'
                    ? 'bg-[#132218] border-[#4ADE80] text-[#F2F2EE]'
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#90968C] hover:text-[#F2F2EE]'
                }`}
              >
                <p className="text-xs font-semibold">Premiação clássica (6 categorias)</p>
                <p className="text-[11px] text-[#8C9288] leading-snug">
                  Já cria Jogo do Ano, RPG, Indie, Arte, Trilha e Narrativa.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPreset('blank')}
                className={`p-3 rounded-md border text-left transition-colors cursor-pointer space-y-1 ${
                  preset === 'blank'
                    ? 'bg-[#132218] border-[#4ADE80] text-[#F2F2EE]'
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#90968C] hover:text-[#F2F2EE]'
                }`}
              >
                <p className="text-xs font-semibold">Começar em branco</p>
                <p className="text-[11px] text-[#8C9288] leading-snug">
                  Monte suas próprias categorias personalizadas do zero.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-[#C8CBC4] block">Visibilidade inicial</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`px-3.5 py-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer text-left ${
                  status === 'inactive'
                    ? 'bg-[#1D211D] border-[#8C9288] text-[#F2F2EE]'
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#8C9288] hover:text-[#F2F2EE]'
                }`}
              >
                Inativo (configurar antes)
              </button>
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`px-3.5 py-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer text-left ${
                  status === 'active'
                    ? 'bg-[#122619] border-[#4ADE80] text-[#86EFAC]'
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#8C9288] hover:text-[#F2F2EE]'
                }`}
              >
                Ativo (abrir votação já)
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#232723] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-[#A8ACA5] border border-[#2A2F2A] rounded-md hover:text-[#F2F2EE] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{busy ? 'Criando...' : 'Criar e configurar categorias'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CloseEventModalProps {
  eventTitle: string;
  eventStatus: EventStatus;
  categories: EventCategory[];
  votesByCategory: Record<string, EventVote[]>;
  busy: boolean;
  onClose: () => void;
  onConfirmWinners: (winnersByCategoryId: Record<string, string>) => Promise<void>;
}

function CloseEventModal({
  eventTitle,
  eventStatus,
  categories,
  votesByCategory,
  busy,
  onClose,
  onConfirmWinners,
}: CloseEventModalProps) {
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cat of categories) {
      if (cat.winnerNomineeId) {
        initial[cat.id] = cat.winnerNomineeId;
      }
    }
    return initial;
  });

  const categoriesWithNominees = categories.filter((c) => c.nominees.length > 0);
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
        <div className="px-6 py-4 border-b border-[#232723] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#FBBF24] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>
                {eventStatus === 'closed'
                  ? 'Editar vencedores oficiais'
                  : 'Encerrar evento e definir vencedores'}
              </span>
            </p>
            <h2
              id="close-event-modal-title"
              className="font-display text-xl font-semibold text-[#F2F2EE] mt-0.5"
            >
              {eventTitle}
            </h2>
            <p className="text-xs text-[#90968C] mt-1">
              Selecione o jogo vencedor de cada categoria. Os membros que acertaram serão
              destacados automaticamente no placar final.
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
          <div className="p-6 space-y-4 flex-1">
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
                      <h3 className="font-display text-sm font-semibold text-[#F2F2EE]">
                        <span className="font-mono text-xs text-[#787D75] mr-2 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {category.name}
                      </h3>
                      <span className="text-xs font-mono text-[#787D75] tabular-nums">
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
                              <p className="text-xs font-semibold truncate">{nominee.title}</p>
                              <p className="text-[11px] text-[#787D75] tabular-nums">
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

          <div className="px-6 py-4 border-t border-[#232723] bg-[#101210] flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#90968C]">
              Vencedores definidos:{' '}
              <span className="font-mono text-[#F2F2EE] tabular-nums">
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
                    : eventStatus === 'closed'
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
  const [viewMode, setViewMode] = useState<'public' | 'builder'>('public');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);

  // Admin Builder local draft state (zero-lag instant category & nominee editing)
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftCategories, setDraftCategories] = useState<EventCategory[]>([]);
  const [activeBuilderCategoryId, setActiveBuilderCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingCategoryValue, setRenamingCategoryValue] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [pickerTab, setPickerTab] = useState<'catalog' | 'manual'>('catalog');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [pendingSwitchAction, setPendingSwitchAction] = useState<(() => void) | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const newCategoryInputRef = useRef<HTMLInputElement | null>(null);

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

  // Sync draft when switching selectedEvent or entering builder fresh
  const syncDraftFromEvent = useCallback((ev: CobraEvent | null) => {
    if (!ev) {
      setDraftTitle('');
      setDraftDescription('');
      setDraftCategories([]);
      setActiveBuilderCategoryId(null);
      return;
    }
    setDraftTitle(ev.title);
    setDraftDescription(ev.description);
    setDraftCategories(
      ev.categories.map((cat) => ({
        ...cat,
        nominees: cat.nominees.map((n) => ({ ...n })),
      })),
    );
    setActiveBuilderCategoryId((prev) =>
      prev && ev.categories.some((c) => c.id === prev)
        ? prev
        : ev.categories[0]?.id || null,
    );
  }, []);

  useEffect(() => {
    syncDraftFromEvent(selectedEvent);
    setConfirmDeleteEvent(false);
    setRenamingCategoryId(null);
    setPendingSwitchAction(null);
  }, [selectedEvent?.id, syncDraftFromEvent]);

  // Keep activeBuilderCategoryId valid while editing draft
  useEffect(() => {
    if (draftCategories.length === 0) {
      if (activeBuilderCategoryId !== null) setActiveBuilderCategoryId(null);
      return;
    }
    if (
      !activeBuilderCategoryId ||
      !draftCategories.some((c) => c.id === activeBuilderCategoryId)
    ) {
      setActiveBuilderCategoryId(draftCategories[0].id);
    }
  }, [draftCategories, activeBuilderCategoryId]);

  const isDraftDirty = useMemo(() => {
    if (!selectedEvent || !isAdmin || viewMode !== 'builder') return false;
    return (
      serializeDraft(draftTitle, draftDescription, draftCategories) !==
      serializeDraft(
        selectedEvent.title,
        selectedEvent.description,
        selectedEvent.categories,
      )
    );
  }, [selectedEvent, isAdmin, viewMode, draftTitle, draftDescription, draftCategories]);

  const activeBuilderCategory = useMemo(
    () => draftCategories.find((c) => c.id === activeBuilderCategoryId) || null,
    [draftCategories, activeBuilderCategoryId],
  );

  const activeBuilderCategoryIndex = useMemo(
    () => draftCategories.findIndex((c) => c.id === activeBuilderCategoryId),
    [draftCategories, activeBuilderCategoryId],
  );

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

  const showSuccess = (text: string) => setFeedback({ type: 'success', text });
  const showError = (err: unknown, fallback: string) => {
    const msg = err instanceof Error && err.message ? err.message : fallback;
    setFeedback({ type: 'error', text: msg });
  };

  const handleSaveDraft = useCallback(
    async (overrideStatus?: EventStatus, customSuccessMsg?: string): Promise<boolean> => {
      if (!selectedEvent) return false;
      const cleanTitle = draftTitle.trim();
      if (!cleanTitle) {
        setFeedback({ type: 'error', text: 'Informe o nome do evento antes de salvar.' });
        return false;
      }
      setBusyAction('save-draft');
      setFeedback(null);
      try {
        await updateEvent(selectedEvent.id, {
          title: cleanTitle,
          description: draftDescription.trim(),
          status: overrideStatus ?? selectedEvent.status,
          categories: draftCategories,
        });
        showSuccess(customSuccessMsg || 'Alterações do evento salvas com sucesso.');
        return true;
      } catch (err) {
        showError(err, 'Não foi possível salvar as alterações do evento.');
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [selectedEvent, draftTitle, draftDescription, draftCategories, updateEvent],
  );

  // Ctrl+S / Cmd+S shortcut inside Builder
  useEffect(() => {
    if (viewMode !== 'builder' || !isAdmin || !isDraftDirty) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveDraft();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, isAdmin, isDraftDirty, handleSaveDraft]);

  const guardUnsavedAndRun = (action: () => void) => {
    if (isDraftDirty) {
      setPendingSwitchAction(() => action);
    } else {
      action();
    }
  };

  const handleCreateEvent = async (input: {
    title: string;
    description: string;
    status: EventStatus;
    categories: EventCategory[];
  }) => {
    setBusyAction('create-event');
    setFeedback(null);
    try {
      const id = await createEvent(input);
      setSelectedEventId(id);
      setShowCreateModal(false);
      setViewMode('builder');
      showSuccess(
        input.categories.length > 0
          ? 'Evento criado com categorias iniciais! Agora selecione os jogos de cada categoria e salve.'
          : 'Evento criado! Adicione as categorias à esquerda e clique nos jogos do catálogo à direita.',
      );
    } catch (err) {
      showError(err, 'Não foi possível criar o evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleActive = async (ev: CobraEvent) => {
    const nextStatus: EventStatus = ev.status === 'active' ? 'inactive' : 'active';
    const msg =
      nextStatus === 'active'
        ? 'Evento ativado! Todos os membros já podem registrar seus votos.'
        : 'Evento desativado e visível apenas para administradores.';
    if (viewMode === 'builder' && isDraftDirty) {
      await handleSaveDraft(nextStatus, msg);
      return;
    }
    setBusyAction('toggle-status');
    setFeedback(null);
    try {
      await updateEvent(ev.id, {
        title: ev.title,
        description: ev.description,
        status: nextStatus,
        categories: ev.categories,
      });
      showSuccess(msg);
    } catch (err) {
      showError(err, 'Não foi possível alterar o status do evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReopenVoting = async (ev: CobraEvent) => {
    setBusyAction('toggle-status');
    setFeedback(null);
    try {
      await updateEvent(ev.id, {
        title: viewMode === 'builder' && draftTitle.trim() ? draftTitle.trim() : ev.title,
        description: viewMode === 'builder' ? draftDescription.trim() : ev.description,
        status: 'active',
        categories: viewMode === 'builder' ? draftCategories : ev.categories,
      });
      showSuccess('Evento reaberto para votação.');
    } catch (err) {
      showError(err, 'Não foi possível reabrir o evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmWinners = async (winnersByCategoryId: Record<string, string>) => {
    if (!selectedEvent) return;
    const baseCategories = viewMode === 'builder' ? draftCategories : selectedEvent.categories;
    const updatedCategories = baseCategories.map((cat) => ({
      ...cat,
      winnerNomineeId: winnersByCategoryId[cat.id] || '',
    }));
    setBusyAction('close-event');
    setFeedback(null);
    try {
      await updateEvent(selectedEvent.id, {
        title: viewMode === 'builder' && draftTitle.trim() ? draftTitle.trim() : selectedEvent.title,
        description: viewMode === 'builder' ? draftDescription.trim() : selectedEvent.description,
        status: 'closed',
        categories: updatedCategories,
      });
      setDraftCategories(updatedCategories);
      setShowCloseModal(false);
      setViewMode('public');
      showSuccess('Evento encerrado! Os vencedores e quem acertou estão em destaque.');
    } catch (err) {
      showError(err, 'Não foi possível encerrar o evento.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setBusyAction('delete-event');
    setFeedback(null);
    try {
      await deleteEvent(selectedEvent.id);
      setConfirmDeleteEvent(false);
      setViewMode('public');
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

  // --- Instant Local Draft Mutators (Zero Latency!) ---
  const addDraftCategory = (rawName: string) => {
    const cleanName = rawName.trim().slice(0, LIMITS.EVENT_CATEGORY_NAME_MAX);
    if (!cleanName) return;
    if (draftCategories.length >= LIMITS.EVENT_CATEGORIES_MAX) {
      setFeedback({
        type: 'error',
        text: `Limite de ${LIMITS.EVENT_CATEGORIES_MAX} categorias por evento atingido.`,
      });
      return;
    }
    const nextCat: EventCategory = {
      id: createLocalId('cat'),
      name: cleanName,
      nominees: [],
      winnerNomineeId: '',
    };
    setDraftCategories((prev) => [...prev, nextCat]);
    setActiveBuilderCategoryId(nextCat.id);
    setNewCategoryName('');
    setFeedback(null);
  };

  const handleAddCategorySubmit = (e: FormEvent) => {
    e.preventDefault();
    addDraftCategory(newCategoryName);
    newCategoryInputRef.current?.focus();
  };

  const moveDraftCategory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftCategories.length) return;
    setDraftCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const commitRenameDraftCategory = (categoryId: string) => {
    const clean = renamingCategoryValue.trim().slice(0, LIMITS.EVENT_CATEGORY_NAME_MAX);
    if (clean) {
      setDraftCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, name: clean } : c)),
      );
    }
    setRenamingCategoryId(null);
    setRenamingCategoryValue('');
  };

  const removeDraftCategory = (categoryId: string) => {
    setDraftCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  const toggleCatalogGameInActiveCategory = (game: Game) => {
    if (!activeBuilderCategory) return;
    const normTitle = normalizeSearch(game.title);
    const existing = activeBuilderCategory.nominees.find(
      (n) => n.gameId === game.id || normalizeSearch(n.title) === normTitle,
    );

    if (existing) {
      setDraftCategories((prev) =>
        prev.map((cat) =>
          cat.id === activeBuilderCategory.id
            ? {
                ...cat,
                nominees: cat.nominees.filter((n) => n.id !== existing.id),
                winnerNomineeId:
                  cat.winnerNomineeId === existing.id ? '' : cat.winnerNomineeId,
              }
            : cat,
        ),
      );
      return;
    }

    if (activeBuilderCategory.nominees.length >= LIMITS.EVENT_NOMINEES_MAX) {
      setFeedback({
        type: 'error',
        text: `Limite de ${LIMITS.EVENT_NOMINEES_MAX} jogos indicados nesta categoria.`,
      });
      return;
    }

    const nextNominee: EventNominee = {
      id: createLocalId('nom'),
      gameId: game.id,
      title: game.title,
      coverUrl: game.coverUrl || '',
    };
    setDraftCategories((prev) =>
      prev.map((cat) =>
        cat.id === activeBuilderCategory.id
          ? { ...cat, nominees: [...cat.nominees, nextNominee] }
          : cat,
      ),
    );
    setFeedback(null);
  };

  const handleAddManualNominee = (e: FormEvent) => {
    e.preventDefault();
    if (!activeBuilderCategory) return;
    const cleanTitle = manualTitle.trim().slice(0, LIMITS.EVENT_NOMINEE_TITLE_MAX);
    if (!cleanTitle) return;
    if (activeBuilderCategory.nominees.length >= LIMITS.EVENT_NOMINEES_MAX) {
      setFeedback({
        type: 'error',
        text: `Limite de ${LIMITS.EVENT_NOMINEES_MAX} jogos indicados nesta categoria.`,
      });
      return;
    }
    const nextNominee: EventNominee = {
      id: createLocalId('nom'),
      gameId: '',
      title: cleanTitle,
      coverUrl: manualCoverUrl.trim().slice(0, LIMITS.URL_MAX),
    };
    setDraftCategories((prev) =>
      prev.map((cat) =>
        cat.id === activeBuilderCategory.id
          ? { ...cat, nominees: [...cat.nominees, nextNominee] }
          : cat,
      ),
    );
    setManualTitle('');
    setManualCoverUrl('');
    setFeedback(null);
  };

  const removeNomineeFromActiveCategory = (nomineeId: string) => {
    if (!activeBuilderCategory) return;
    setDraftCategories((prev) =>
      prev.map((cat) =>
        cat.id === activeBuilderCategory.id
          ? {
              ...cat,
              nominees: cat.nominees.filter((n) => n.id !== nomineeId),
              winnerNomineeId: cat.winnerNomineeId === nomineeId ? '' : cat.winnerNomineeId,
            }
          : cat,
      ),
    );
  };

  const filteredCatalogGames = useMemo(() => {
    const q = normalizeSearch(catalogSearch);
    const list = q
      ? games.filter(
          (g) =>
            normalizeSearch(g.title).includes(q) ||
            normalizeSearch(g.developer).includes(q) ||
            String(g.releaseYear).includes(q),
        )
      : games;
    return list.slice(0, 30);
  }, [games, catalogSearch]);

  const availableQuickSuggestions = useMemo(() => {
    const existingNames = new Set(draftCategories.map((c) => normalizeSearch(c.name)));
    return QUICK_CATEGORY_SUGGESTIONS.filter(
      (name) => !existingNames.has(normalizeSearch(name)),
    );
  }, [draftCategories]);

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

  const modalCategories = viewMode === 'builder' ? draftCategories : selectedEvent?.categories || [];
  const hasAnyNomineesForClose = modalCategories.some((c) => c.nominees.length > 0);

  return (
    <main className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#232723] pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>Bolões e Premiações do Grupo</span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE]">
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
            onClick={() =>
              guardUnsavedAndRun(() => {
                setShowCreateModal(true);
                setFeedback(null);
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo evento</span>
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
            className="opacity-75 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unsaved Changes Guard Banner */}
      {pendingSwitchAction && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-md border border-[#5A4419] bg-[#1F1A0F] text-xs sm:text-sm text-[#FDE68A]"
        >
          <span>Você tem alterações não salvas neste evento. Deseja salvar antes de continuar?</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const ok = await handleSaveDraft();
                if (ok) {
                  const fn = pendingSwitchAction;
                  setPendingSwitchAction(null);
                  fn();
                }
              }}
              className="px-3 py-1.5 rounded-md bg-[#4ADE80] text-[#0C0D0C] font-semibold text-xs cursor-pointer"
            >
              Salvar e continuar
            </button>
            <button
              type="button"
              onClick={() => {
                syncDraftFromEvent(selectedEvent);
                const fn = pendingSwitchAction;
                setPendingSwitchAction(null);
                fn();
              }}
              className="px-3 py-1.5 rounded-md border border-[#5A4419] text-[#FDE68A] hover:text-white text-xs cursor-pointer"
            >
              Descartar alterações
            </button>
            <button
              type="button"
              onClick={() => setPendingSwitchAction(null)}
              className="p-1 text-[#A8A394] hover:text-white cursor-pointer"
              aria-label="Permanecer editando"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Event Selector Strip */}
      {visibleEvents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {visibleEvents.map((ev) => {
            const isSelected = selectedEvent?.id === ev.id;
            const meta = getStatusMeta(ev.status);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  if (ev.id === selectedEvent?.id) return;
                  guardUnsavedAndRun(() => setSelectedEventId(ev.id));
                }}
                className={`shrink-0 px-4 py-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#191F19] border-[#4ADE80]/70 text-[#F2F2EE]'
                    : 'bg-[#141614] border-[#262A26] text-[#A8ACA5] hover:border-[#3A403A] hover:text-[#F2F2EE]'
                }`}
              >
                <p className="font-display text-sm font-semibold truncate max-w-[230px]">
                  {ev.title}
                </p>
                <p className="text-[11px] text-[#8C9288] mt-0.5 flex items-center gap-1.5 tabular-nums">
                  <span className={meta.textClass}>{meta.shortLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {ev.categories.length}{' '}
                    {ev.categories.length === 1 ? 'categoria' : 'categorias'}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!selectedEvent ? (
        <section className="bg-[#141614] border border-[#262A26] rounded-md p-10 text-center space-y-3">
          <Trophy className="w-9 h-9 text-[#4B5148] mx-auto" strokeWidth={1.5} />
          <h2 className="font-display text-2xl font-semibold text-[#F2F2EE]">
            Nenhum evento disponível no momento
          </h2>
          <p className="text-sm text-[#90968C] max-w-md mx-auto">
            {isAdmin
              ? 'Crie o primeiro evento de premiação ou bolão clicando em “Novo evento” acima, monte as categorias e escolha os jogos do catálogo.'
              : 'Quando um administrador ativar um evento de votação ou premiação, ele aparecerá aqui para você registrar seus palpites.'}
          </p>
          {isAdmin && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar primeiro evento</span>
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {/* Event Header & Mode Bar */}
          <section className="bg-[#141614] border border-[#262A26] rounded-md p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8C9288]">
                  <span className={`font-semibold ${getStatusMeta(selectedEvent.status).textClass}`}>
                    {getStatusMeta(selectedEvent.status).label}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="w-3.5 h-3.5" />
                    {uniqueVoterCount}{' '}
                    {uniqueVoterCount === 1 ? 'membro votou' : 'membros votaram'}
                  </span>
                  {selectedEvent.status === 'active' && selectedEvent.categories.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#4ADE80] font-medium tabular-nums">
                        Seus palpites: {myVotedCategoriesCount}/{selectedEvent.categories.length}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F2EE]">
                  {viewMode === 'builder' && draftTitle.trim() ? draftTitle : selectedEvent.title}
                </h2>

                {(viewMode === 'builder' ? draftDescription : selectedEvent.description) && (
                  <p className="text-sm text-[#A8ACA5] max-w-3xl leading-relaxed">
                    {viewMode === 'builder' ? draftDescription : selectedEvent.description}
                  </p>
                )}
              </div>

              {/* Admin Toolbar */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* View Mode Segmented Switch: Votação vs Configurar */}
                  <div
                    role="tablist"
                    aria-label="Modo de visualização do evento"
                    className="inline-flex items-center p-0.5 rounded-md bg-[#0C0D0C] border border-[#2A2F2A]"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'public'}
                      onClick={() => {
                        if (viewMode === 'public') return;
                        guardUnsavedAndRun(() => setViewMode('public'));
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        viewMode === 'public'
                          ? 'bg-[#1E241E] text-[#F2F2EE]'
                          : 'text-[#8C9288] hover:text-[#F2F2EE]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Votação</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'builder'}
                      onClick={() => {
                        if (viewMode === 'builder') return;
                        syncDraftFromEvent(selectedEvent);
                        setViewMode('builder');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        viewMode === 'builder'
                          ? 'bg-[#17281C] text-[#4ADE80]'
                          : 'text-[#8C9288] hover:text-[#F2F2EE]'
                      }`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Configurar</span>
                    </button>
                  </div>

                  {/* Activate / Deactivate / Reopen */}
                  {selectedEvent.status !== 'closed' ? (
                    <button
                      type="button"
                      disabled={busyAction === 'toggle-status' || busyAction === 'save-draft'}
                      onClick={() => handleToggleActive(selectedEvent)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                        selectedEvent.status === 'active'
                          ? 'bg-[#181B18] border-[#343A34] text-[#C8CBC4] hover:border-[#F87171]/60 hover:text-[#FCA5A5]'
                          : 'bg-[#122619] border-[#2E6B44] text-[#86EFAC] hover:bg-[#173320]'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {selectedEvent.status === 'active' ? 'Desativar' : 'Ativar evento'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction === 'toggle-status'}
                      onClick={() => handleReopenVoting(selectedEvent)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[#303630] bg-[#181B18] text-[#C8CBC4] hover:text-[#F2F2EE] whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reabrir votação</span>
                    </button>
                  )}

                  {/* Close Event & Pick Winners */}
                  {hasAnyNomineesForClose && (
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-[#FBBF24] text-[#0C0D0C] hover:bg-[#FCD34D] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>
                        {selectedEvent.status === 'closed'
                          ? 'Editar vencedores'
                          : 'Encerrar e premiar'}
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

            {selectedEvent.status === 'inactive' && viewMode === 'public' && (
              <div className="pt-3 border-t border-[#222622] text-xs text-[#A8ACA5] flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#787D75] shrink-0" />
                  <span>
                    Evento em rascunho (visível apenas para admins). Configure as categorias e
                    clique em <strong className="text-[#F2F2EE]">Ativar evento</strong> para abrir a
                    votação.
                  </span>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      syncDraftFromEvent(selectedEvent);
                      setViewMode('builder');
                    }}
                    className="text-[#4ADE80] font-semibold hover:underline cursor-pointer"
                  >
                    Abrir configurador →
                  </button>
                )}
              </div>
            )}
          </section>

          {/* =============================================================== */}
          {/* ADMIN STUDIO MODE: Fast 2-Column Master-Detail Category Builder */}
          {/* =============================================================== */}
          {isAdmin && viewMode === 'builder' ? (
            <div className="space-y-5">
              {/* Save Bar */}
              <div
                className={`rounded-md border px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                  isDraftDirty
                    ? 'bg-[#122217] border-[#2E6B44]'
                    : 'bg-[#141614] border-[#262A26]'
                }`}
              >
                <div className="text-xs sm:text-sm">
                  {isDraftDirty ? (
                    <span className="text-[#86EFAC] font-medium">
                      Alterações prontas para salvar ·{' '}
                      <span className="text-[#A8ACA5] font-normal">
                        {draftCategories.length}{' '}
                        {draftCategories.length === 1 ? 'categoria' : 'categorias'} no rascunho
                      </span>
                    </span>
                  ) : (
                    <span className="text-[#90968C]">
                      Todas as alterações estão sincronizadas. Edite categorias à esquerda e clique
                      nos jogos à direita.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDraftDirty && (
                    <button
                      type="button"
                      disabled={busyAction === 'save-draft'}
                      onClick={() => syncDraftFromEvent(selectedEvent)}
                      className="px-3 py-1.5 text-xs font-medium text-[#A8ACA5] border border-[#2E342E] bg-[#0C0D0C] rounded-md hover:text-[#F2F2EE] cursor-pointer"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!isDraftDirty || busyAction === 'save-draft'}
                    onClick={() => void handleSaveDraft()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {busyAction === 'save-draft' ? 'Salvando...' : 'Salvar alterações'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Event Name & Description Inline Fields */}
              <section className="bg-[#141614] border border-[#262A26] rounded-md p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-[#A8ACA5]">Nome do evento</span>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      maxLength={LIMITS.EVENT_TITLE_MAX}
                      placeholder="Nome do evento..."
                      className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-[#A8ACA5]">
                      Descrição / regras (opcional)
                    </span>
                    <input
                      type="text"
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      maxLength={LIMITS.EVENT_DESCRIPTION_MAX}
                      placeholder="Regras ou contexto do evento..."
                      className="w-full px-3 py-2 text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                    />
                  </label>
                </div>
              </section>

              {/* Master-Detail 2-Column Category & Nominee Studio */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN: Categories List + Instant Creator */}
                <section className="lg:col-span-5 bg-[#141614] border border-[#262A26] rounded-md p-5 space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-[#F2F2EE]">
                      1. Categorias
                    </h3>
                    <span className="text-xs font-mono text-[#787D75] tabular-nums">
                      {draftCategories.length}/{LIMITS.EVENT_CATEGORIES_MAX}
                    </span>
                  </div>

                  {/* Quick Add Category Input */}
                  <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-2">
                    <input
                      ref={newCategoryInputRef}
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      maxLength={LIMITS.EVENT_CATEGORY_NAME_MAX}
                      placeholder="Nova categoria + Enter..."
                      className="flex-1 px-3 py-2 text-xs sm:text-sm bg-[#0C0D0C] border border-[#2A302A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                    />
                    <button
                      type="submit"
                      disabled={!newCategoryName.trim()}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar</span>
                    </button>
                  </form>

                  {/* 1-Click Category Suggestions */}
                  {availableQuickSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-[#787D75]">Sugestões rápidas (1 clique):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableQuickSuggestions.slice(0, 6).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => addDraftCategory(suggestion)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#A8ACA5] hover:border-[#4ADE80]/60 hover:text-[#4ADE80] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Category Rows */}
                  {draftCategories.length === 0 ? (
                    <div className="py-8 px-4 border border-dashed border-[#262B26] rounded-md text-center space-y-1.5">
                      <FolderPlus className="w-6 h-6 text-[#4B5148] mx-auto" />
                      <p className="text-xs font-medium text-[#C8CBC4]">
                        Nenhuma categoria criada ainda
                      </p>
                      <p className="text-[11px] text-[#787D75]">
                        Digite um nome acima ou clique em uma sugestão rápida.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
                      {draftCategories.map((cat, idx) => {
                        const isSelected = cat.id === activeBuilderCategory?.id;
                        const isRenaming = renamingCategoryId === cat.id;

                        return (
                          <li
                            key={cat.id}
                            className={`rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-[#17231A] border-[#4ADE80]/70'
                                : 'bg-[#0E100E] border-[#232723] hover:border-[#343A34]'
                            }`}
                          >
                            {isRenaming ? (
                              <div className="p-2 flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={renamingCategoryValue}
                                  onChange={(e) => setRenamingCategoryValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      commitRenameDraftCategory(cat.id);
                                    } else if (e.key === 'Escape') {
                                      setRenamingCategoryId(null);
                                    }
                                  }}
                                  maxLength={LIMITS.EVENT_CATEGORY_NAME_MAX}
                                  className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-[#0C0D0C] border border-[#4ADE80] rounded text-[#F2F2EE] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => commitRenameDraftCategory(cat.id)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded cursor-pointer"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingCategoryId(null)}
                                  className="p-1 text-[#8C9288] hover:text-white cursor-pointer"
                                  aria-label="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveBuilderCategoryId(cat.id)}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <span
                                    className={`font-mono text-[11px] tabular-nums shrink-0 ${
                                      isSelected ? 'text-[#4ADE80] font-semibold' : 'text-[#6E736B]'
                                    }`}
                                  >
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium text-[#F2F2EE] truncate">
                                      {cat.name}
                                    </p>
                                    <p
                                      className={`text-[11px] tabular-nums ${
                                        cat.nominees.length === 0
                                          ? 'text-[#D97706]'
                                          : 'text-[#8C9288]'
                                      }`}
                                    >
                                      {cat.nominees.length === 0
                                        ? 'Sem jogos indicados'
                                        : `${cat.nominees.length} ${
                                            cat.nominees.length === 1 ? 'jogo' : 'jogos'
                                          }`}
                                    </p>
                                  </div>
                                </button>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveDraftCategory(idx, -1)}
                                    title="Mover para cima"
                                    aria-label="Mover categoria para cima"
                                    className="p-1 text-[#787D75] hover:text-[#F2F2EE] disabled:opacity-25 cursor-pointer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === draftCategories.length - 1}
                                    onClick={() => moveDraftCategory(idx, 1)}
                                    title="Mover para baixo"
                                    aria-label="Mover categoria para baixo"
                                    className="p-1 text-[#787D75] hover:text-[#F2F2EE] disabled:opacity-25 cursor-pointer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenamingCategoryId(cat.id);
                                      setRenamingCategoryValue(cat.name);
                                    }}
                                    title="Renomear categoria"
                                    aria-label="Renomear categoria"
                                    className="p-1 text-[#787D75] hover:text-[#4ADE80] cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDraftCategory(cat.id)}
                                    title="Remover categoria"
                                    aria-label="Remover categoria"
                                    className="p-1 text-[#787D75] hover:text-[#F87171] cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* RIGHT COLUMN: Nominees & Fast Multi-Select Game Picker */}
                <section className="lg:col-span-7 bg-[#141614] border border-[#262A26] rounded-md p-5 space-y-5">
                  {!activeBuilderCategory ? (
                    <div className="py-16 text-center space-y-2">
                      <Trophy className="w-8 h-8 text-[#3E443E] mx-auto" strokeWidth={1.5} />
                      <h3 className="font-display text-lg font-semibold text-[#F2F2EE]">
                        Selecione ou crie uma categoria
                      </h3>
                      <p className="text-xs sm:text-sm text-[#8C9288] max-w-sm mx-auto">
                        Crie sua primeira categoria na coluna à esquerda para começar a marcar os
                        jogos indicados com um clique.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Active Category Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#222622]">
                        <div className="min-w-0">
                          <p className="text-xs text-[#4ADE80] font-medium tabular-nums">
                            2. Jogos da categoria{' '}
                            {String(activeBuilderCategoryIndex + 1).padStart(2, '0')} de{' '}
                            {String(draftCategories.length).padStart(2, '0')}
                          </p>
                          <h3 className="font-display text-xl font-semibold text-[#F2F2EE] truncate mt-0.5">
                            {activeBuilderCategory.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono text-[#8C9288] tabular-nums">
                            {activeBuilderCategory.nominees.length}/{LIMITS.EVENT_NOMINEES_MAX}{' '}
                            jogos
                          </span>
                          {activeBuilderCategoryIndex >= 0 &&
                            activeBuilderCategoryIndex < draftCategories.length - 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveBuilderCategoryId(
                                    draftCategories[activeBuilderCategoryIndex + 1].id,
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#1A1E1A] border border-[#2D342D] rounded-md text-[#F2F2EE] hover:border-[#4ADE80]/60 hover:text-[#4ADE80] transition-colors cursor-pointer"
                              >
                                <span>Próxima</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </div>

                      {/* Currently Selected Nominees */}
                      <div className="space-y-2.5">
                        <p className="text-xs font-medium text-[#A8ACA5]">
                          Indicados nesta categoria ({activeBuilderCategory.nominees.length})
                        </p>
                        {activeBuilderCategory.nominees.length === 0 ? (
                          <p className="text-xs text-[#787D75] py-3 px-3.5 bg-[#0E100E] border border-dashed border-[#252A25] rounded-md">
                            Nenhum jogo selecionado ainda. Clique nos jogos abaixo para adicionar
                            instantaneamente.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeBuilderCategory.nominees.map((nom) => {
                              const linked = nom.gameId ? gamesById[nom.gameId] : null;
                              return (
                                <div
                                  key={nom.id}
                                  className="flex items-center gap-2.5 p-2 rounded-md bg-[#101812] border border-[#244730]"
                                >
                                  <GameCover
                                    title={nom.title}
                                    coverUrl={linked?.coverUrl || nom.coverUrl}
                                    compact
                                    className="w-8 shrink-0 rounded-[2px]"
                                  />
                                  <span className="text-xs font-medium text-[#F2F2EE] truncate flex-1">
                                    {nom.title}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeNomineeFromActiveCategory(nom.id)}
                                    title="Remover indicado"
                                    aria-label={`Remover ${nom.title}`}
                                    className="p-1 text-[#8C9288] hover:text-[#F87171] cursor-pointer shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Fast 1-Click Catalog / Manual Picker */}
                      <div className="pt-4 border-t border-[#222622] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-[#C8CBC4]">
                            Marcar jogos para votação (clique para adicionar ou remover)
                          </p>
                          <div className="inline-flex rounded-md border border-[#262B26] bg-[#0C0D0C] p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setPickerTab('catalog')}
                              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                pickerTab === 'catalog'
                                  ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                                  : 'text-[#8C9288] hover:text-[#F2F2EE]'
                              }`}
                            >
                              Catálogo ({games.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerTab('manual')}
                              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                pickerTab === 'manual'
                                  ? 'bg-[#1D221D] text-[#4ADE80] font-medium'
                                  : 'text-[#8C9288] hover:text-[#F2F2EE]'
                              }`}
                            >
                              Digitar outro jogo
                            </button>
                          </div>
                        </div>

                        {pickerTab === 'catalog' ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-[#666B63] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                placeholder="Filtrar jogos por título, estúdio ou ano..."
                                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[#0C0D0C] border border-[#262B26] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                              />
                              {catalogSearch && (
                                <button
                                  type="button"
                                  onClick={() => setCatalogSearch('')}
                                  aria-label="Limpar busca"
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787D75] hover:text-[#F2F2EE] cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {filteredCatalogGames.length === 0 ? (
                              <p className="text-xs text-[#787D75] py-3">
                                Nenhum jogo encontrado no catálogo. Use a aba “Digitar outro jogo”
                                para indicar qualquer título.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-0.5">
                                {filteredCatalogGames.map((game) => {
                                  const normTitle = normalizeSearch(game.title);
                                  const isAdded = activeBuilderCategory.nominees.some(
                                    (n) =>
                                      n.gameId === game.id ||
                                      normalizeSearch(n.title) === normTitle,
                                  );
                                  return (
                                    <button
                                      key={game.id}
                                      type="button"
                                      onClick={() => toggleCatalogGameInActiveCategory(game)}
                                      className={`flex items-center gap-2.5 p-2 rounded-md border text-left transition-colors cursor-pointer ${
                                        isAdded
                                          ? 'bg-[#122419] border-[#4ADE80]/70 text-[#F2F2EE]'
                                          : 'bg-[#0C0D0C] border-[#262B26] hover:border-[#3E473E] hover:bg-[#161916] text-[#C8CBC4]'
                                      }`}
                                    >
                                      <GameCover
                                        title={game.title}
                                        coverUrl={game.coverUrl}
                                        compact
                                        className="w-8 shrink-0 rounded-[2px]"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-[#F2F2EE] truncate">
                                          {game.title}
                                        </p>
                                        <p className="text-[11px] text-[#787D75] truncate tabular-nums">
                                          {game.releaseYear} · {game.developer}
                                        </p>
                                      </div>
                                      <span
                                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                                          isAdded
                                            ? 'bg-[#4ADE80] text-[#0C0D0C]'
                                            : 'border border-[#343A34] text-[#6E736B]'
                                        }`}
                                      >
                                        {isAdded ? (
                                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        ) : (
                                          <Plus className="w-3 h-3" />
                                        )}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <form
                            onSubmit={handleAddManualNominee}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
                          >
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
                              disabled={!manualTitle.trim()}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* PUBLIC VOTING & RESULTS MODE                                  */
            /* ============================================================= */
            <div className="space-y-6">
              {/* Closed Event Leaderboard: Placar de Acertos */}
              {selectedEvent.status === 'closed' && (
                <section className="bg-[#141713] border border-[#473B19] rounded-md p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#FBBF24] flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Resultado final · Placar de acertos</span>
                      </p>
                      <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#F2F2EE] mt-0.5">
                        Quem mais acertou neste evento
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-[#D6C79A] tabular-nums">
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
                            className={`font-mono text-xs w-6 text-center shrink-0 font-bold tabular-nums ${
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
                            <p className="text-xs text-[#A8ACA5] mt-0.5 tabular-nums">
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

              {/* Quick Category Jump Bar when event has multiple categories */}
              {selectedEvent.categories.length >= 3 && (
                <nav
                  aria-label="Atalhos das categorias"
                  className="flex items-center gap-1.5 overflow-x-auto pb-1"
                >
                  {selectedEvent.categories.map((cat, idx) => {
                    const votedHere = Boolean(myVoteByCategory[cat.id]);
                    return (
                      <a
                        key={cat.id}
                        href={`#event-cat-${cat.id}`}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                          votedHere
                            ? 'bg-[#122017] border-[#265034] text-[#86EFAC]'
                            : 'bg-[#141614] border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#3A403A]'
                        }`}
                      >
                        <span className="font-mono text-[11px] opacity-70 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="whitespace-nowrap">{cat.name}</span>
                        {votedHere && <Check className="w-3 h-3 text-[#4ADE80]" />}
                      </a>
                    );
                  })}
                </nav>
              )}

              {/* Categories List */}
              {selectedEvent.categories.length === 0 ? (
                <section className="bg-[#141614] border border-[#262A26] rounded-md p-8 text-center space-y-3">
                  <Trophy className="w-7 h-7 text-[#4B5148] mx-auto" strokeWidth={1.5} />
                  <h3 className="font-display text-xl font-semibold text-[#F2F2EE]">
                    Nenhuma categoria cadastrada ainda
                  </h3>
                  <p className="text-xs sm:text-sm text-[#90968C] max-w-md mx-auto">
                    {isAdmin
                      ? 'Clique em “Configurar” acima para criar categorias e selecionar os jogos indicados com um clique.'
                      : 'O administrador ainda está montando as categorias deste evento.'}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        syncDraftFromEvent(selectedEvent);
                        setViewMode('builder');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] cursor-pointer"
                    >
                      <span>Configurar categorias agora</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                        id={`event-cat-${category.id}`}
                        key={category.id}
                        className="bg-[#141614] border border-[#262A26] rounded-md p-5 space-y-4 scroll-mt-20"
                      >
                        {/* Category Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222622] pb-3.5">
                          <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
                            <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums shrink-0">
                              {String(categoryIdx + 1).padStart(2, '0')}
                            </span>
                            <h3 className="font-display text-xl font-semibold text-[#F2F2EE] truncate">
                              {category.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#8C9288] shrink-0">
                            <span className="font-mono tabular-nums">
                              {catVotes.length} {catVotes.length === 1 ? 'voto' : 'votos'}
                            </span>
                            {selectedEvent.status === 'active' && myVote && (
                              <span className="inline-flex items-center gap-1 text-[#4ADE80] font-medium">
                                <Check className="w-3.5 h-3.5" />
                                Votado
                              </span>
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
                              <span className="text-xs font-mono text-[#86EFAC] tabular-nums">
                                {correctVoters.length}{' '}
                                {correctVoters.length === 1
                                  ? 'membro acertou'
                                  : 'membros acertaram'}
                              </span>
                            </div>

                            {correctVoters.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-[#86EFAC]/90 flex items-center gap-1">
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
                                      ? 'bg-[#1A1C13] border-[#FBBF24]'
                                      : isMyChoice
                                        ? 'bg-[#121D15] border-[#4ADE80]/80'
                                        : 'bg-[#0F110F] border-[#232723] hover:border-[#323832]'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
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

                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="min-w-0">
                                        {(isWinner || (isWinner && isMyChoice)) && (
                                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold mb-0.5">
                                            {isWinner && (
                                              <span className="inline-flex items-center gap-1 text-[#FBBF24]">
                                                <Trophy className="w-3 h-3" />
                                                Vencedor
                                              </span>
                                            )}
                                            {isWinner && isMyChoice && (
                                              <span className="inline-flex items-center gap-1 text-[#4ADE80]">
                                                <Award className="w-3 h-3" />
                                                Você acertou!
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        <h4 className="font-display text-base font-semibold text-[#F2F2EE] leading-snug">
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

                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                          <span className="font-mono text-[11px] text-[#90968C] tabular-nums">
                                            {nomineeVotes.length}{' '}
                                            {nomineeVotes.length === 1 ? 'voto' : 'votos'}
                                            {catVotes.length > 0 ? ` (${votePct}%)` : ''}
                                          </span>

                                          {selectedEvent.status === 'active' && (
                                            <button
                                              type="button"
                                              disabled={voteBusy}
                                              onClick={() => handleVoteClick(category, nominee)}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                                isMyChoice
                                                  ? 'bg-[#4ADE80] text-[#0C0D0C] hover:bg-[#6EE79E]'
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
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {isAdmin && showCreateModal && (
        <CreateEventModal
          busy={busyAction === 'create-event'}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEvent}
        />
      )}

      {/* Close Event & Pick Winners Modal */}
      {isAdmin && showCloseModal && selectedEvent && (
        <CloseEventModal
          eventTitle={viewMode === 'builder' && draftTitle.trim() ? draftTitle : selectedEvent.title}
          eventStatus={selectedEvent.status}
          categories={modalCategories}
          votesByCategory={votesByCategory}
          busy={busyAction === 'close-event'}
          onClose={() => setShowCloseModal(false)}
          onConfirmWinners={handleConfirmWinners}
        />
      )}
    </main>
  );
}
