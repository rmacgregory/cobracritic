import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Bookmark,
  HeartHandshake,
  Search,
  Share2,
  ShieldCheck,
  ShieldOff,
  UserCheck,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  GAME_PLAY_STATUS_LIST,
  GAME_PLAY_STATUS_META,
  GAME_PROGRESS_STATUS_LIST,
  LIMITS,
  type GamePlayStatus,
  type GameWithStats,
  type Review,
  type UserProfile,
} from '../types';
import { computeTasteAffinity, type MemberTasteAffinity } from '../utils/affinity';
import { GameCover } from './GameCover';
import { ReviewCard } from './ReviewCard';
import { ScoreBadge } from './ScoreBadge';
import { ShareCardModal } from './ShareCardModal';

interface MembersViewProps {
  selectedMemberId: string | null;
  onSelectMember: (memberUid: string | null) => void;
  onSelectGame: (gameId: string) => void;
  onEditReview: (game: GameWithStats, review: Review) => void;
}

type MemberSort = 'reviews_desc' | 'affinity_desc' | 'avg_desc' | 'avg_asc' | 'name_asc';

interface MemberWithStats extends UserProfile {
  reviewCount: number;
  averageScore: number | null;
  gamesRegistered: number;
  commentsCount: number;
  memberReviews: Review[];
  affinity: MemberTasteAffinity | null;
}

export function MembersView({
  selectedMemberId,
  onSelectMember,
  onSelectGame,
  onEditReview,
}: MembersViewProps) {
  const {
    user,
    isAdmin,
    adminUids,
    bansByUid,
    members,
    gamesWithStats,
    reviews,
    comments,
    userGameStatuses,
    grantAdmin,
    revokeAdmin,
    banUser,
    unbanUser,
  } = useVeredito();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<MemberSort>('reviews_desc');
  const [showBanInput, setShowBanInput] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [modBusy, setModBusy] = useState(false);
  const [shelfStatus, setShelfStatus] = useState<GamePlayStatus>('playing');
  const [showShareTop5, setShowShareTop5] = useState(false);

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const gameByLowerTitle = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.title.toLowerCase(), g);
    return map;
  }, [gamesWithStats]);

  const membersWithStats = useMemo<MemberWithStats[]>(() => {
    return members.map((member) => {
      const memberReviews = reviews.filter((r) => r.authorId === member.uid);
      const count = memberReviews.length;
      const avg =
        count > 0
          ? Math.round(
              memberReviews.reduce((sum, r) => sum + r.score, 0) / count,
            )
          : null;
      const gamesRegistered = gamesWithStats.filter(
        (g) => g.createdBy === member.uid,
      ).length;
      const commentsCount = comments.filter(
        (c) => c.authorId === member.uid,
      ).length;

      const affinity = computeTasteAffinity(
        user?.uid,
        member.uid,
        reviews,
        gamesById,
      );

      return {
        ...member,
        reviewCount: count,
        averageScore: avg,
        gamesRegistered,
        commentsCount,
        memberReviews,
        affinity,
      };
    });
  }, [members, reviews, gamesWithStats, comments, user?.uid, gamesById]);

  const activeMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return membersWithStats.find((m) => m.uid === selectedMemberId) || null;
  }, [membersWithStats, selectedMemberId]);

  const activeMemberShelf = useMemo(() => {
    const grouped: Record<GamePlayStatus, GameWithStats[]> = {
      playing: [],
      completed: [],
      platinum: [],
      wishlist: [],
      dropped: [],
    };
    if (!activeMember) return grouped;
    for (const entry of userGameStatuses) {
      if (entry.userId !== activeMember.uid) continue;
      const g = gamesById.get(entry.gameId);
      if (g) grouped[entry.status].push(g);
    }
    return grouped;
  }, [activeMember, userGameStatuses, gamesById]);

  const activeMemberShelfTotal = useMemo(
    () =>
      GAME_PLAY_STATUS_LIST.reduce(
        (sum, st) => sum + activeMemberShelf[st].length,
        0,
      ),
    [activeMemberShelf],
  );

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = membersWithStats.filter((m) => {
      if (!q) return true;
      const topMatches = (m.topFiveGames || []).some((t) =>
        t.toLowerCase().includes(q),
      );
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.bio.toLowerCase().includes(q) ||
        topMatches
      );
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'reviews_desc':
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return a.displayName.localeCompare(b.displayName, 'pt-BR');
        case 'affinity_desc':
          return (b.affinity?.affinityPct ?? -1) - (a.affinity?.affinityPct ?? -1);
        case 'avg_desc':
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        case 'avg_asc':
          return (a.averageScore ?? 999) - (b.averageScore ?? 999);
        case 'name_asc':
          return a.displayName.localeCompare(b.displayName, 'pt-BR');
        default:
          return 0;
      }
    });
  }, [membersWithStats, search, sortBy]);

  if (activeMember) {
    const initials = activeMember.displayName
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
    const topFive = activeMember.topFiveGames || [];

    return (
      <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-10">
        <button
          type="button"
          onClick={() => onSelectMember(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para todos os membros</span>
        </button>

        <section className="bg-[#141614] border border-[#262A26] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-start gap-5 min-w-0">
            {activeMember.photoURL ? (
              <img
                src={activeMember.photoURL}
                alt={activeMember.displayName}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#2F352F] shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#222622] border-2 border-[#2F352F] text-[#F2F2EE] text-xl font-semibold flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-mono text-[#4ADE80]">
                  Membro dos Cobras
                </p>
                {adminUids.has(activeMember.uid) && (
                  <span className="text-[11px] font-mono text-[#4ADE80] bg-[#16291D] border border-[#22543D] px-2 py-0.5 rounded">
                    Admin
                  </span>
                )}
                {bansByUid[activeMember.uid] && (
                  <span className="text-[11px] font-mono text-[#FCA5A5] bg-[#291515] border border-[#5B2121] px-2 py-0.5 rounded">
                    Banido
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl font-semibold text-[#F2F2EE]">
                {activeMember.displayName}
              </h1>
              {activeMember.bio && (
                <p className="text-sm text-[#A8ACA5] leading-relaxed max-w-xl">
                  {activeMember.bio}
                </p>
              )}

              {isAdmin && user?.uid !== activeMember.uid && (
                <div className="pt-2 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {!bansByUid[activeMember.uid] && (
                      adminUids.has(activeMember.uid) ? (
                        <button
                          type="button"
                          disabled={modBusy}
                          onClick={async () => {
                            setModBusy(true);
                            try {
                              await revokeAdmin(activeMember.uid);
                            } finally {
                              setModBusy(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#2C312C] text-[#A8ACA5] hover:text-[#FBBF24] rounded-md cursor-pointer disabled:opacity-50"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          <span>Remover Admin</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={modBusy}
                          onClick={async () => {
                            setModBusy(true);
                            try {
                              await grantAdmin(activeMember.uid, activeMember.displayName);
                            } finally {
                              setModBusy(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] rounded-md cursor-pointer disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Tornar Admin</span>
                        </button>
                      )
                    )}

                    {bansByUid[activeMember.uid] ? (
                      <button
                        type="button"
                        disabled={modBusy}
                        onClick={async () => {
                          setModBusy(true);
                          try {
                            await unbanUser(activeMember.uid);
                          } finally {
                            setModBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] rounded-md cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Desbanir membro</span>
                      </button>
                    ) : (
                      !adminUids.has(activeMember.uid) && (
                        <button
                          type="button"
                          onClick={() => setShowBanInput((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#3F2222] text-[#F87171] hover:bg-[#291515] rounded-md cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Banir membro</span>
                        </button>
                      )
                    )}
                  </div>

                  {showBanInput && !bansByUid[activeMember.uid] && (
                    <div className="flex flex-wrap items-center gap-2 max-w-lg">
                      <input
                        type="text"
                        maxLength={LIMITS.BAN_REASON_MAX}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Motivo do banimento (opcional)..."
                        className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-[#0C0D0C] border border-[#3F2222] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#F87171]"
                      />
                      <button
                        type="button"
                        disabled={modBusy}
                        onClick={async () => {
                          setModBusy(true);
                          try {
                            await banUser(
                              activeMember.uid,
                              activeMember.displayName,
                              banReason,
                            );
                            setShowBanInput(false);
                            setBanReason('');
                          } finally {
                            setModBusy(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#B91C1C] text-white rounded-md cursor-pointer disabled:opacity-50"
                      >
                        Confirmar ban
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-x-8 gap-y-4 shrink-0 border-t md:border-t-0 md:border-l border-[#232723] pt-4 md:pt-0 md:pl-8">
            <div>
              <dt className="text-xs text-[#8C9288]">Críticas</dt>
              <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums">
                {activeMember.reviewCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#8C9288]">Média dada</dt>
              <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums">
                {activeMember.averageScore !== null ? activeMember.averageScore : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#8C9288]">Jogos cad.</dt>
              <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums">
                {activeMember.gamesRegistered}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#8C9288]">Comentários</dt>
              <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums">
                {activeMember.commentsCount}
              </dd>
            </div>
          </dl>
        </section>

        {/* Taste Affinity Panel (when viewing another member) */}
        {user && activeMember.uid !== user.uid && (
          <section className="bg-[#141614] border border-[#262A26] p-6 space-y-4 max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Afinidade de gosto com você</span>
                </p>
                {activeMember.affinity ? (
                  <p className="text-sm text-[#A8ACA5] tabular-nums">
                    Calculada sobre{' '}
                    <strong className="text-[#F2F2EE]">
                      {activeMember.affinity.commonCount}{' '}
                      {activeMember.affinity.commonCount === 1
                        ? 'jogo avaliado em comum'
                        : 'jogos avaliados em comum'}
                    </strong>{' '}
                    (diferença média de {activeMember.affinity.avgDiff} pts).
                  </p>
                ) : (
                  <p className="text-sm text-[#90968C]">
                    Vocês ainda não avaliaram nenhum jogo em comum para calcular a afinidade.
                  </p>
                )}
              </div>

              {activeMember.affinity && (
                <div className="text-right shrink-0">
                  <p
                    className={`font-mono text-3xl sm:text-4xl font-bold tabular-nums leading-none ${activeMember.affinity.accentClass}`}
                  >
                    {activeMember.affinity.affinityPct}%
                  </p>
                  <p className="text-xs font-medium text-[#C8CBC4] mt-1">
                    {activeMember.affinity.label}
                  </p>
                </div>
              )}
            </div>

            {activeMember.affinity && (
              <>
                <div className="h-2 w-full bg-[#202420] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${activeMember.affinity.barClass}`}
                    style={{ width: `${activeMember.affinity.affinityPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {activeMember.affinity.closestGame && (
                    <button
                      type="button"
                      onClick={() =>
                        activeMember.affinity?.closestGame &&
                        onSelectGame(activeMember.affinity.closestGame.gameId)
                      }
                      className="p-3.5 rounded-md bg-[#0C0D0C] border border-[#232923] hover:border-[#4ADE80]/60 text-left space-y-1 transition-colors cursor-pointer"
                    >
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80]">
                        Maior sintonia
                      </p>
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {activeMember.affinity.closestGame.gameTitle}
                      </p>
                      <p className="text-xs text-[#90968C] font-mono tabular-nums">
                        Você: <strong className="text-[#F2F2EE]">{activeMember.affinity.closestGame.myScore}</strong>
                        {' · '}
                        {activeMember.displayName.split(' ')[0]}:{' '}
                        <strong className="text-[#F2F2EE]">{activeMember.affinity.closestGame.theirScore}</strong>
                      </p>
                    </button>
                  )}

                  {activeMember.affinity.mostDivergentGame && (
                    <button
                      type="button"
                      onClick={() =>
                        activeMember.affinity?.mostDivergentGame &&
                        onSelectGame(activeMember.affinity.mostDivergentGame.gameId)
                      }
                      className="p-3.5 rounded-md bg-[#0C0D0C] border border-[#2A261E] hover:border-[#FBBF24]/60 text-left space-y-1 transition-colors cursor-pointer"
                    >
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#FBBF24]">
                        Maior divergência
                      </p>
                      <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                        {activeMember.affinity.mostDivergentGame.gameTitle}
                      </p>
                      <p className="text-xs text-[#90968C] font-mono tabular-nums">
                        Você: <strong className="text-[#F2F2EE]">{activeMember.affinity.mostDivergentGame.myScore}</strong>
                        {' · '}
                        {activeMember.displayName.split(' ')[0]}:{' '}
                        <strong className="text-[#F2F2EE]">{activeMember.affinity.mostDivergentGame.theirScore}</strong>
                      </p>
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Member's TOP 5 Jogos da Vida */}
        {topFive.length > 0 && (
          <section className="bg-[#141614] border border-[#262A26] p-6 space-y-4 max-w-4xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#F2F2EE]">
                  TOP 5 Jogos da Vida
                </h2>
                <span className="text-xs font-mono text-[#787D75]">
                  Favoritos de {activeMember.displayName.split(' ')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowShareTop5(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-[#2A2F2A] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#4ADE80] hover:border-[#4ADE80]/60 rounded-md transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartilhar</span>
              </button>
            </div>
            <ol className="divide-y divide-[#202420]">
              {topFive.map((title, idx) => {
                const catalogMatch = gameByLowerTitle.get(title.toLowerCase());
                return (
                  <li
                    key={`${title}-${idx}`}
                    className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-baseline gap-3.5 min-w-0">
                      <span className="font-mono text-sm font-semibold text-[#4ADE80] tabular-nums w-6 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {catalogMatch ? (
                        <button
                          type="button"
                          onClick={() => onSelectGame(catalogMatch.id)}
                          className="font-display text-base font-medium text-[#F2F2EE] hover:text-[#4ADE80] truncate text-left cursor-pointer"
                        >
                          {title}
                        </button>
                      ) : (
                        <span className="font-display text-base font-medium text-[#F2F2EE] truncate">
                          {title}
                        </span>
                      )}
                    </div>
                    {catalogMatch && (
                      <span className="text-xs font-mono text-[#8C9288] shrink-0">
                        Ver ficha
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Member's Estante de Jogos */}
        {activeMemberShelfTotal > 0 && (
          <section className="bg-[#141614] border border-[#262A26] p-6 space-y-4 max-w-4xl">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-[#F2F2EE]">
                Estante de Jogos
              </h2>
              <span className="text-xs font-mono text-[#787D75] tabular-nums">
                {activeMemberShelfTotal}{' '}
                {activeMemberShelfTotal === 1 ? 'jogo marcado' : 'jogos marcados'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {GAME_PROGRESS_STATUS_LIST.map((st) => {
                const meta = GAME_PLAY_STATUS_META[st];
                const count = activeMemberShelf[st].length;
                const active = shelfStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setShelfStatus(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors tabular-nums cursor-pointer ${
                      active
                        ? meta.activeClass
                        : 'bg-[#0C0D0C] border-[#262B26] text-[#90968C] hover:text-[#F2F2EE]'
                    }`}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}

              <span
                aria-hidden="true"
                className="hidden sm:inline-block w-px h-5 bg-[#262B26] mx-0.5"
              />

              <button
                type="button"
                onClick={() => setShelfStatus('wishlist')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors tabular-nums cursor-pointer ${
                  shelfStatus === 'wishlist'
                    ? GAME_PLAY_STATUS_META.wishlist.activeClass
                    : 'bg-[#0C0D0C] border-[#262B26] text-[#C084FC]/90 hover:border-[#533378] hover:text-[#E9D5FF]'
                }`}
              >
                <Bookmark
                  className="w-3.5 h-3.5 shrink-0"
                  fill={shelfStatus === 'wishlist' ? 'currentColor' : 'none'}
                />
                <span>
                  {GAME_PLAY_STATUS_META.wishlist.label} ({activeMemberShelf.wishlist.length})
                </span>
              </button>
            </div>

            {activeMemberShelf[shelfStatus].length === 0 ? (
              <p className="text-xs text-[#8C9288] py-2">
                Nenhum jogo marcado como “{GAME_PLAY_STATUS_META[shelfStatus].label}”.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeMemberShelf[shelfStatus].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectGame(g.id)}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-[#0C0D0C] border border-[#232823] hover:border-[#4ADE80]/60 transition-colors text-left cursor-pointer"
                  >
                    <GameCover
                      title={g.title}
                      coverUrl={g.coverUrl}
                      compact
                      className="w-10 shrink-0 rounded-[2px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F2F2EE] truncate">
                        {g.title}
                      </p>
                      <p className="text-[11px] text-[#8C9288] truncate">
                        {g.releaseYear}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-[#F2F2EE]">
            Críticas de {activeMember.displayName}
          </h2>

          {activeMember.memberReviews.length === 0 ? (
            <div className="bg-[#141614] border border-[#262A26] p-10 text-center">
              <p className="text-sm text-[#90968C]">
                Este membro ainda não publicou nenhuma crítica.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl">
              {activeMember.memberReviews.map((review) => {
                const game = gamesById.get(review.gameId) || null;
                return (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    game={game}
                    showGameHeader
                    defaultCommentsOpen={false}
                    onSelectGame={onSelectGame}
                    onSelectAuthor={(uid) => onSelectMember(uid)}
                    onEditReview={
                      game ? (rev) => onEditReview(game, rev) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
        {showShareTop5 && topFive.length > 0 && (
          <ShareCardModal
            payload={{
              kind: 'top5',
              memberName: activeMember.displayName,
              bio: activeMember.bio,
              averageScore: activeMember.averageScore,
              reviewCount: activeMember.reviewCount,
              topFiveGames: topFive,
            }}
            onClose={() => setShowShareTop5(false)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="border-b border-[#232723] pb-6">
        <p className="text-xs font-medium text-[#4ADE80]">
          Grupo dos Cobras
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE] mt-1">
          Membros &amp; Críticos
        </h1>
        <p className="text-sm text-[#90968C] mt-1.5 max-w-2xl">
          Busque integrantes do grupo, confira o TOP 5 jogos da vida de cada Cobra e
          explore todas as reviews publicadas.
        </p>
      </div>

      {/* Member Search & Sort */}
      <div className="bg-[#141614] border border-[#262A26] p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro por nome, bio ou jogo do Top 5..."
            aria-label="Buscar membros"
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as MemberSort)}
          aria-label="Ordenar membros"
          className="px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
        >
          <option value="reviews_desc">Mais críticas</option>
          <option value="affinity_desc">Maior afinidade comigo</option>
          <option value="avg_desc">Maior média dada</option>
          <option value="avg_asc">Mais exigentes (menor média)</option>
          <option value="name_asc">Ordem alfabética</option>
        </select>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="bg-[#141614] border border-[#262A26] p-12 text-center space-y-3">
          <p className="font-serif text-xl text-[#F2F2EE]">
            Nenhum membro encontrado para “{search}”
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-sm font-medium text-[#4ADE80] hover:underline cursor-pointer"
          >
            Limpar busca de membros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const initials = member.displayName
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase();
            const topFive = member.topFiveGames || [];

            return (
              <button
                key={member.uid}
                type="button"
                onClick={() => onSelectMember(member.uid)}
                className="text-left bg-[#141614] border border-[#262A26] hover:border-[#3A413A] p-5 transition-colors flex flex-col justify-between gap-5 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.displayName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border border-[#2C312C] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#222622] text-[#F2F2EE] text-sm font-semibold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-serif text-lg font-medium text-[#F2F2EE] truncate">
                            {member.displayName}
                          </p>
                          {adminUids.has(member.uid) && (
                            <span className="text-[10px] font-mono text-[#4ADE80] shrink-0">
                              ADMIN
                            </span>
                          )}
                          {bansByUid[member.uid] && (
                            <span className="text-[10px] font-mono text-[#F87171] shrink-0">
                              BANIDO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8C9288] truncate">
                          {topFive.length > 0
                            ? `Top 1: ${topFive[0]}`
                            : 'Membro dos Cobras'}
                        </p>
                      </div>
                    </div>
                    <ScoreBadge score={member.averageScore} size="sm" />
                  </div>

                  {member.bio ? (
                    <p className="text-xs text-[#A8ACA5] leading-relaxed line-clamp-2">
                      {member.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-[#6E736B] italic">
                      Sem bio cadastrada.
                    </p>
                  )}
                  {member.affinity && (
                    <div className="flex items-center justify-between gap-2 text-xs pt-1 tabular-nums">
                      <span className={`font-medium ${member.affinity.accentClass}`}>
                        {member.affinity.affinityPct}% afinidade · {member.affinity.label}
                      </span>
                      <span className="text-[11px] text-[#787D75]">
                        {member.affinity.commonCount} em comum
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#202420] flex items-center justify-between text-xs text-[#90968C] tabular-nums">
                  <span>
                    {member.reviewCount}{' '}
                    {member.reviewCount === 1 ? 'crítica' : 'críticas'} ·{' '}
                    {topFive.length}/5 Top jogos
                  </span>
                  <span className="text-[#F2F2EE] font-medium">Ver perfil</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
