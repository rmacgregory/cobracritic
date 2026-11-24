import React, { useMemo, useState } from 'react';
import {
  Ban,
  Check,
  Clock,
  Eraser,
  ExternalLink,
  Flag,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  LIMITS,
  formatReleaseDate,
  formatTimestamp,
  type GameWithStats,
} from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
import { ScoreBadge } from './ScoreBadge';

interface AdminPanelViewProps {
  onSelectGame: (gameId: string) => void;
  onEditGame: (game: GameWithStats) => void;
  onSelectMember: (uid: string) => void;
}

type AdminSection = 'members' | 'games' | 'covers' | 'posts';
type MemberFilter = 'all' | 'admins' | 'banned';
type PostTypeFilter = 'reviews' | 'comments';

export function AdminPanelView({
  onSelectGame,
  onEditGame,
  onSelectMember,
}: AdminPanelViewProps) {
  const {
    user,
    isAdmin,
    members,
    membersById,
    admins,
    adminUids,
    bans,
    bansByUid,
    gamesWithStats,
    reviews,
    comments,
    openCoverReports,
    accessRequests,
    pendingAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    deleteAccessRequest,
    grantAdmin,
    revokeAdmin,
    banUser,
    unbanUser,
    deleteGame,
    deleteReview,
    deleteComment,
    purgeMemberContent,
    resolveCoverReport,
    deleteCoverReport,
  } = useVeredito();

  const [section, setSection] = useState<AdminSection>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRequestHistory, setShowRequestHistory] = useState(false);

  const [gameSearch, setGameSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [postType, setPostType] = useState<PostTypeFilter>('reviews');

  const [banningUid, setBanningUid] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [confirmActionKey, setConfirmActionKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual UID admin grant (useful for granting Email/Password admin accounts)
  const [manualUid, setManualUid] = useState('');
  const [manualLabel, setManualLabel] = useState('');

  const reviewedAccessRequests = useMemo(
    () => accessRequests.filter((r) => r.status !== 'pending'),
    [accessRequests],
  );

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const memberStats = useMemo(() => {
    const revCount: Record<string, number> = {};
    const cmtCount: Record<string, number> = {};
    for (const r of reviews) {
      revCount[r.authorId] = (revCount[r.authorId] || 0) + 1;
    }
    for (const c of comments) {
      cmtCount[c.authorId] = (cmtCount[c.authorId] || 0) + 1;
    }
    return { revCount, cmtCount };
  }, [reviews, comments]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      const isMemberAdmin = adminUids.has(m.uid);
      const isMemberBanned = Boolean(bansByUid[m.uid]);

      if (memberFilter === 'admins' && !isMemberAdmin) return false;
      if (memberFilter === 'banned' && !isMemberBanned) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q)
      );
    });
  }, [members, adminUids, bansByUid, memberFilter, memberSearch]);

  const filteredGames = useMemo(() => {
    const q = gameSearch.trim().toLowerCase();
    if (!q) return gamesWithStats;
    return gamesWithStats.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.createdByName.toLowerCase().includes(q),
    );
  }, [gamesWithStats, gameSearch]);

  const filteredReviews = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const liveName = membersById[r.authorId]?.displayName || r.authorName;
      return (
        r.headline.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        r.gameTitle.toLowerCase().includes(q) ||
        liveName.toLowerCase().includes(q)
      );
    });
  }, [reviews, postSearch, membersById]);

  const filteredComments = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter((c) => {
      const liveName = membersById[c.authorId]?.displayName || c.authorName;
      return (
        c.body.toLowerCase().includes(q) ||
        liveName.toLowerCase().includes(q)
      );
    });
  }, [comments, postSearch, membersById]);

  if (!isAdmin) {
    return (
      <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-16 text-center">
        <p className="font-serif text-xl text-[#F2F2EE]">Acesso restrito</p>
        <p className="text-sm text-[#90968C] mt-2">
          Apenas administradores do CobraCritic podem acessar esta área.
        </p>
      </main>
    );
  }

  const runAction = async (
    key: string,
    fn: () => Promise<void>,
    successText: string,
  ) => {
    setBusyKey(key);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await fn();
      setFeedback(successText);
      setConfirmActionKey(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao executar ação.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleManualAdminGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim()) return;
    await runAction(
      'manual-grant',
      async () => {
        await grantAdmin(manualUid.trim(), manualLabel.trim() || 'Admin Mestre');
        setManualUid('');
        setManualLabel('');
      },
      'Privilégio de administrador concedido por UID.',
    );
  };

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#232723] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#4ADE80] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Moderação &amp; Governança</span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE] mt-1">
            Painel Admin
          </h1>
          <p className="text-sm text-[#90968C] mt-1.5 max-w-2xl">
            Conceda ou revogue privilégios de administrador, gerencie banimentos e
            modere jogos, críticas e comentários do Grupo dos Cobras.
          </p>
        </div>
      </div>

      {/* Feedback banners */}
      {feedback && (
        <div
          className="bg-[#142218] border border-[#22543D] px-4 py-3 text-sm text-[#86EFAC] flex items-center justify-between gap-4"
          role="status"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}
      {errorMsg && (
        <div
          className="bg-[#231414] border border-[#5B2121] px-4 py-3 text-sm text-[#FCA5A5] flex items-center justify-between gap-4"
          role="alert"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Access Approval Queue for New Users */}
      <section
        aria-label="Solicitações de acesso de novos usuários"
        className={`border p-5 space-y-4 transition-colors ${
          pendingAccessRequests.length > 0
            ? 'bg-[#1A1710] border-[#664C1C]'
            : 'bg-[#141614] border-[#262A26]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  pendingAccessRequests.length > 0 ? 'text-[#FBBF24]' : 'text-[#4ADE80]'
                }`}
              />
              <h2 className="font-display text-base sm:text-lg font-semibold text-[#F2F2EE]">
                Solicitações de acesso
              </h2>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border tabular-nums ${
                  pendingAccessRequests.length > 0
                    ? 'bg-[#2B2010] border-[#78571D] text-[#FDE68A]'
                    : 'bg-[#13261A] border-[#2C6B41] text-[#86EFAC]'
                }`}
              >
                {pendingAccessRequests.length === 0
                  ? 'NENHUMA PENDENTE'
                  : `${pendingAccessRequests.length} ${
                      pendingAccessRequests.length === 1 ? 'PENDENTE' : 'PENDENTES'
                    }`}
              </span>
            </div>
            <p className="text-xs text-[#A8ACA5] leading-relaxed max-w-2xl">
              Membros já cadastrados entram normalmente. Novos usuários que fizerem login
              com Google precisam da autorização de um administrador aqui antes de acessar
              como membros. O modo somente leitura segue sempre disponível na tela inicial.
            </p>
          </div>

          {reviewedAccessRequests.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRequestHistory((prev) => !prev)}
              className="text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
            >
              {showRequestHistory
                ? 'Ocultar histórico'
                : `Ver histórico (${reviewedAccessRequests.length})`}
            </button>
          )}
        </div>

        {pendingAccessRequests.length > 0 && (
          <div className="divide-y divide-[#2B2418] border border-[#3B3019] bg-[#121311] rounded-md overflow-hidden">
            {pendingAccessRequests.map((req) => (
              <div key={req.uid} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar
                      name={req.displayName}
                      primarySrc={req.photoURL}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-base font-medium text-[#F2F2EE] truncate">
                          {req.displayName}
                        </p>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2B2010] border border-[#664C1C] text-[#FDE68A]">
                          Pendente
                        </span>
                      </div>
                      <p className="text-xs text-[#8C9288] mt-0.5">
                        Solicitado {formatTimestamp(req.createdAt)} · UID:{' '}
                        <span className="font-mono text-[#6E736B]">
                          {req.uid.slice(0, 12)}…
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyKey === `approve-${req.uid}`}
                      onClick={() =>
                        runAction(
                          `approve-${req.uid}`,
                          async () => {
                            await approveAccessRequest(req);
                            if (rejectingUid === req.uid) {
                              setRejectingUid(null);
                              setRejectionReason('');
                            }
                          },
                          `Acesso autorizado para ${req.displayName}!`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#16A34A] text-white hover:bg-[#15803D] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {busyKey === `approve-${req.uid}`
                          ? 'Aprovando...'
                          : 'Autorizar acesso'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectingUid(rejectingUid === req.uid ? null : req.uid);
                        setRejectionReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#3F2222] text-[#F87171] hover:bg-[#291515] rounded-md transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>

                {rejectingUid === req.uid && (
                  <div className="bg-[#0C0D0C] border border-[#3F2222] p-3 rounded-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      maxLength={LIMITS.ACCESS_REJECTION_REASON_MAX}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Motivo da recusa (opcional, visível ao solicitante)..."
                      className="flex-1 px-3 py-2 text-xs bg-[#141614] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#F87171]"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyKey === `reject-${req.uid}`}
                        onClick={() =>
                          runAction(
                            `reject-${req.uid}`,
                            async () => {
                              await rejectAccessRequest(req.uid, rejectionReason);
                              setRejectingUid(null);
                              setRejectionReason('');
                            },
                            `Solicitação de ${req.displayName} recusada.`,
                          )
                        }
                        className="px-3.5 py-2 text-xs font-semibold bg-[#B91C1C] text-white rounded-md hover:bg-[#DC2626] cursor-pointer disabled:opacity-50"
                      >
                        Confirmar recusa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingUid(null);
                          setRejectionReason('');
                        }}
                        className="px-2.5 py-2 text-xs text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showRequestHistory && reviewedAccessRequests.length > 0 && (
          <div className="pt-2 border-t border-[#232723] space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#787D75]">
              Histórico de decisões ({reviewedAccessRequests.length})
            </p>
            <div className="divide-y divide-[#202420] border border-[#232723] bg-[#0F110F] rounded-md">
              {reviewedAccessRequests.map((req) => (
                <div
                  key={req.uid}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar
                      name={req.displayName}
                      primarySrc={req.photoURL}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#F2F2EE] truncate">
                          {req.displayName}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            req.status === 'approved'
                              ? 'bg-[#13261A] border-[#2C6B41] text-[#86EFAC]'
                              : 'bg-[#291515] border-[#5B2121] text-[#FCA5A5]'
                          }`}
                        >
                          {req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#787D75] mt-0.5">
                        {req.reviewedByName ? `Por ${req.reviewedByName} · ` : ''}
                        {formatTimestamp(req.updatedAt || req.createdAt)}
                      </p>
                      {req.status === 'rejected' && req.rejectionReason && (
                        <p className="text-[11px] text-[#FCA5A5] mt-0.5">
                          Motivo: {req.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status === 'rejected' && (
                      <button
                        type="button"
                        disabled={busyKey === `reapprove-${req.uid}`}
                        onClick={() =>
                          runAction(
                            `reapprove-${req.uid}`,
                            () => approveAccessRequest(req),
                            `Acesso autorizado para ${req.displayName}!`,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] hover:bg-[#193020] rounded cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Autorizar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyKey === `delreq-${req.uid}`}
                      onClick={() =>
                        runAction(
                          `delreq-${req.uid}`,
                          () => deleteAccessRequest(req.uid),
                          `Registro de ${req.displayName} removido do histórico.`,
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-[#8C9288] hover:text-[#F87171] border border-[#262A26] rounded cursor-pointer disabled:opacity-50"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Summary Metrics */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Membros</dt>
          <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
            {members.length}
          </dd>
        </div>
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Admins delegados</dt>
          <dd className="font-mono text-2xl font-semibold text-[#4ADE80] tabular-nums mt-1">
            {admins.length}
          </dd>
        </div>
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Banidos</dt>
          <dd className="font-mono text-2xl font-semibold text-[#F87171] tabular-nums mt-1">
            {bans.length}
          </dd>
        </div>
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Jogos</dt>
          <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
            {gamesWithStats.length}
          </dd>
        </div>
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Críticas</dt>
          <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
            {reviews.length}
          </dd>
        </div>
        <div className="bg-[#141614] border border-[#262A26] p-4">
          <dt className="text-xs text-[#8C9288]">Comentários</dt>
          <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-1">
            {comments.length}
          </dd>
        </div>
      </dl>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#232723] pb-3">
        {(
          [
            { id: 'members', label: 'Membros & Privilégios' },
            { id: 'games', label: `Jogos (${gamesWithStats.length})` },
            {
              id: 'covers',
              label: `Capas reportadas (${openCoverReports.length})`,
              highlight: openCoverReports.length > 0,
            },
            { id: 'posts', label: `Publicações (${reviews.length + comments.length})` },
          ] as { id: AdminSection; label: string; highlight?: boolean }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSection(tab.id);
              setConfirmActionKey(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              section === tab.id
                ? 'bg-[#F2F2EE] text-[#0C0D0C]'
                : tab.highlight
                  ? 'bg-[#1D1910] border border-[#5A4419] text-[#FDE68A] hover:border-[#FBBF24]'
                  : 'bg-[#141614] border border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: MEMBERS, ADMINS & BANS */}
      {section === 'members' && (
        <div className="space-y-8">
          <div className="bg-[#141614] border border-[#262A26] p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar membro por nome ou UID..."
                aria-label="Buscar membro"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'admins', label: 'Admins' },
                  { id: 'banned', label: 'Banidos' },
                ] as { id: MemberFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMemberFilter(f.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    memberFilter === f.id
                      ? 'bg-[#1D221D] border-[#4ADE80] text-[#4ADE80]'
                      : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#A8ACA5] hover:text-[#F2F2EE]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="bg-[#141614] border border-[#262A26] p-10 text-center text-sm text-[#90968C]">
              Nenhum membro encontrado com este filtro.
            </div>
          ) : (
            <div className="divide-y divide-[#232723] border border-[#262A26] bg-[#141614]">
              {filteredMembers.map((member) => {
                const isSelf = member.uid === user?.uid;
                const memberIsAdmin = adminUids.has(member.uid);
                const banRecord = bansByUid[member.uid];
                const revTotal = memberStats.revCount[member.uid] || 0;
                const cmtTotal = memberStats.cmtCount[member.uid] || 0;
                const initials = member.displayName
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase();

                return (
                  <div key={member.uid} className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-[#2C312C] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#222622] text-[#F2F2EE] text-xs font-semibold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectMember(member.uid)}
                              className="font-serif text-base font-medium text-[#F2F2EE] hover:text-[#4ADE80] transition-colors truncate cursor-pointer"
                            >
                              {member.displayName}
                            </button>
                            {isSelf && (
                              <span className="text-[11px] font-mono text-[#8C9288]">
                                (você)
                              </span>
                            )}
                            {memberIsAdmin && (
                              <span className="text-[11px] font-mono text-[#4ADE80] bg-[#16291D] border border-[#22543D] px-2 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                            {banRecord && (
                              <span className="text-[11px] font-mono text-[#FCA5A5] bg-[#291515] border border-[#5B2121] px-2 py-0.5 rounded">
                                Banido
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8C9288] mt-0.5 tabular-nums">
                            {revTotal} {revTotal === 1 ? 'crítica' : 'críticas'} · {cmtTotal}{' '}
                            {cmtTotal === 1 ? 'comentário' : 'comentários'} · UID:{' '}
                            <span className="font-mono text-[#6E736B]">
                              {member.uid.slice(0, 12)}…
                            </span>
                          </p>
                          {banRecord && (
                            <p className="text-xs text-[#F87171] mt-1">
                              Motivo: {banRecord.reason || 'Sem motivo informado'} · por{' '}
                              {banRecord.bannedByName}
                            </p>
                          )}
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Promote / Revoke Admin */}
                          {!banRecord && (
                            memberIsAdmin ? (
                              <button
                                type="button"
                                disabled={busyKey === `revoke-${member.uid}`}
                                onClick={() =>
                                  runAction(
                                    `revoke-${member.uid}`,
                                    () => revokeAdmin(member.uid),
                                    `Privilégios de admin removidos de ${member.displayName}.`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#2C312C] text-[#A8ACA5] hover:text-[#FBBF24] hover:border-[#B45309] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                                <span>Remover Admin</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busyKey === `grant-${member.uid}`}
                                onClick={() =>
                                  runAction(
                                    `grant-${member.uid}`,
                                    () => grantAdmin(member.uid, member.displayName),
                                    `${member.displayName} agora é administrador.`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] hover:bg-[#193020] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Tornar Admin</span>
                              </button>
                            )
                          )}

                          {/* Ban / Unban */}
                          {banRecord ? (
                            <button
                              type="button"
                              disabled={busyKey === `unban-${member.uid}`}
                              onClick={() =>
                                runAction(
                                  `unban-${member.uid}`,
                                  () => unbanUser(member.uid),
                                  `${member.displayName} foi desbanido.`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] hover:bg-[#193020] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Desbanir</span>
                            </button>
                          ) : (
                            !memberIsAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBanningUid(
                                    banningUid === member.uid ? null : member.uid,
                                  );
                                  setBanReason('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#3F2222] text-[#F87171] hover:bg-[#291515] rounded-md transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Banir</span>
                              </button>
                            )
                          )}

                          {/* Purge user's reviews & comments */}
                          {(revTotal > 0 || cmtTotal > 0) &&
                            (confirmActionKey === `purge-${member.uid}` ? (
                              <div className="inline-flex items-center gap-1.5 text-xs">
                                <button
                                  type="button"
                                  disabled={busyKey === `purge-${member.uid}`}
                                  onClick={() =>
                                    runAction(
                                      `purge-${member.uid}`,
                                      async () => {
                                        await purgeMemberContent(member.uid);
                                      },
                                      `Publicações de ${member.displayName} removidas.`,
                                    )
                                  }
                                  className="px-2.5 py-1.5 bg-[#B91C1C] text-white rounded-md font-medium cursor-pointer"
                                >
                                  Confirmar limpeza
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmActionKey(null)}
                                  className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer px-1"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmActionKey(`purge-${member.uid}`)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0C0D0C] border border-[#2C312C] text-[#A8ACA5] hover:text-[#F87171] hover:border-[#5B2121] rounded-md transition-colors cursor-pointer"
                                title="Apagar todas as críticas e comentários deste membro"
                              >
                                <Eraser className="w-3.5 h-3.5" />
                                <span>Limpar posts</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Inline Ban Reason Form */}
                    {banningUid === member.uid && (
                      <div className="bg-[#0C0D0C] border border-[#3F2222] p-3.5 rounded-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <input
                          type="text"
                          maxLength={LIMITS.BAN_REASON_MAX}
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Motivo do banimento (opcional, ex.: spoiler ou spam)..."
                          className="flex-1 px-3 py-2 text-xs bg-[#141614] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#F87171]"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={busyKey === `ban-${member.uid}`}
                            onClick={() =>
                              runAction(
                                `ban-${member.uid}`,
                                async () => {
                                  await banUser(
                                    member.uid,
                                    member.displayName,
                                    banReason,
                                  );
                                  setBanningUid(null);
                                  setBanReason('');
                                },
                                `${member.displayName} foi banido do CobraCritic.`,
                              )
                            }
                            className="px-3.5 py-2 text-xs font-semibold bg-[#B91C1C] text-white rounded-md hover:bg-[#DC2626] cursor-pointer disabled:opacity-50"
                          >
                            Confirmar banimento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBanningUid(null);
                              setBanReason('');
                            }}
                            className="px-2.5 py-2 text-xs text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Banned List (in case a banned UID has no profile doc yet) */}
          {bans.some((b) => !membersById[b.uid]) && (
            <div className="bg-[#141614] border border-[#3F2222] p-5 space-y-3">
              <h2 className="font-serif text-lg font-medium text-[#F2F2EE]">
                Banimentos por UID
              </h2>
              <ul className="divide-y divide-[#232723]">
                {bans
                  .filter((b) => !membersById[b.uid])
                  .map((ban) => (
                    <li
                      key={ban.uid}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#F2F2EE]">{ban.displayName}</p>
                        <p className="text-xs text-[#8C9288] font-mono">{ban.uid}</p>
                        {ban.reason && (
                          <p className="text-xs text-[#F87171] mt-0.5">{ban.reason}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            `unban-${ban.uid}`,
                            () => unbanUser(ban.uid),
                            `UID ${ban.uid} desbanido.`,
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] rounded-md cursor-pointer"
                      >
                        Desbanir
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Grant Admin by UID (for Email/Password admin accounts) */}
          <section className="bg-[#141614] border border-[#262A26] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-medium text-[#F2F2EE] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#4ADE80]" />
                  <span>Conceder Admin por UID</span>
                </h2>
                <p className="text-xs text-[#90968C] mt-1 leading-relaxed">
                  Use este campo para vincular uma conta criada diretamente no Firebase
                  Authentication como administrador do CobraCritic.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleManualAdminGrant}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <input
                type="text"
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
                placeholder="UID do Firebase Authentication"
                aria-label="UID do usuário"
                className="sm:col-span-6 px-3 py-2 text-sm font-mono bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
              <input
                type="text"
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Nome de exibição do admin"
                aria-label="Nome do administrador"
                className="sm:col-span-4 px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
              />
              <button
                type="submit"
                disabled={!manualUid.trim() || busyKey === 'manual-grant'}
                className="sm:col-span-2 px-4 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                Conceder
              </button>
            </form>

            {admins.length > 0 && (
              <div className="pt-3 border-t border-[#202420] space-y-2">
                <p className="text-[11px] font-mono text-[#787D75]">
                  Admins delegados cadastrados ({admins.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {admins.map((a) => (
                    <div
                      key={a.uid}
                      className="inline-flex items-center gap-2 bg-[#0C0D0C] border border-[#262A26] px-3 py-1.5 rounded-md text-xs"
                    >
                      <span className="text-[#F2F2EE] font-medium">{a.displayName}</span>
                      <span className="font-mono text-[#6E736B]">
                        {a.uid.slice(0, 8)}…
                      </span>
                      {a.uid !== user?.uid && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              `revoke-chip-${a.uid}`,
                              () => revokeAdmin(a.uid),
                              `Admin ${a.displayName} removido.`,
                            )
                          }
                          className="text-[#8C9288] hover:text-[#F87171] cursor-pointer ml-1"
                          title="Revogar admin"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION 2: GAMES MODERATION */}
      {section === 'games' && (
        <div className="space-y-4">
          <div className="bg-[#141614] border border-[#262A26] p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                placeholder="Buscar jogo por título, estúdio ou quem cadastrou..."
                aria-label="Buscar jogos"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="bg-[#141614] border border-[#262A26] p-10 text-center text-sm text-[#90968C]">
              Nenhum jogo encontrado.
            </div>
          ) : (
            <div className="divide-y divide-[#232723] border border-[#262A26] bg-[#141614]">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 shrink-0">
                      <GameCover
                        title={game.title}
                        coverUrl={game.coverUrl}
                        compact
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-base font-medium text-[#F2F2EE] truncate">
                        {game.title}
                      </p>
                      <p className="text-xs text-[#8C9288] truncate">
                        {game.developer} · {formatReleaseDate(game.releaseDate)} · por{' '}
                        {game.createdByName}
                      </p>
                      <p className="text-xs text-[#6E736B] mt-0.5 tabular-nums">
                        {game.reviewCount}{' '}
                        {game.reviewCount === 1 ? 'crítica' : 'críticas'} ·{' '}
                        {game.platforms.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <ScoreBadge score={game.averageScore} size="sm" />

                    <button
                      type="button"
                      onClick={() => onSelectGame(game.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#A8ACA5] hover:text-[#F2F2EE] bg-[#0C0D0C] border border-[#2A2F2A] rounded-md cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditGame(game)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#A8ACA5] hover:text-[#F2F2EE] bg-[#0C0D0C] border border-[#2A2F2A] rounded-md cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {confirmActionKey === `del-game-${game.id}` ? (
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          disabled={busyKey === `del-game-${game.id}`}
                          onClick={() =>
                            runAction(
                              `del-game-${game.id}`,
                              () => deleteGame(game.id),
                              `Jogo "${game.title}" e suas críticas foram removidos.`,
                            )
                          }
                          className="px-2.5 py-1.5 bg-[#B91C1C] text-white rounded-md font-medium cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmActionKey(null)}
                          className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer px-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmActionKey(`del-game-${game.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#F87171] hover:bg-[#291515] bg-[#0C0D0C] border border-[#3F2222] rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Apagar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2.5: REPORTED COVERS QUEUE */}
      {section === 'covers' && (
        <div className="space-y-4">
          {openCoverReports.length === 0 ? (
            <div className="bg-[#141614] border border-[#262A26] p-10 text-center space-y-2">
              <Flag className="w-6 h-6 text-[#4B5148] mx-auto" />
              <p className="text-sm text-[#90968C]">
                Nenhuma capa incorreta pendente de revisão. Quando algum membro reportar uma
                capa, ela aparecerá aqui e no sino de notificações dos administradores.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#232723] border border-[#3C331A] bg-[#141614]">
              {openCoverReports.map((report) => {
                const targetGame = gamesById.get(report.gameId) || null;
                const liveReporter = membersById[report.reporterId];
                const reporterName = liveReporter?.displayName || report.reporterName;
                const reporterPhoto = liveReporter?.photoURL || '';

                return (
                  <div
                    key={report.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 shrink-0">
                        <GameCover
                          title={targetGame?.title || report.gameTitle}
                          coverUrl={targetGame?.coverUrl ?? report.gameCoverUrl}
                          compact
                        />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectGame(report.gameId)}
                            className="font-serif text-base font-medium text-[#F2F2EE] hover:text-[#4ADE80] transition-colors text-left cursor-pointer"
                          >
                            {targetGame?.title || report.gameTitle}
                          </button>
                          <span className="text-[11px] font-mono text-[#FBBF24] bg-[#241E10] border border-[#5A4419] px-2 py-0.5 rounded">
                            Capa incorreta
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#A8ACA5]">
                          <span>Reportado por</span>
                          <button
                            type="button"
                            onClick={() => onSelectMember(report.reporterId)}
                            className="inline-flex items-center gap-1.5 font-medium text-[#F2F2EE] hover:text-[#4ADE80] cursor-pointer"
                          >
                            <MemberAvatar
                              name={reporterName}
                              primarySrc={reporterPhoto}
                              fallbackSrc={report.reporterPhotoURL}
                              size="xs"
                            />
                            <span>{reporterName}</span>
                          </button>
                          <span className="text-[#787D75]">
                            · {formatTimestamp(report.updatedAt || report.createdAt)}
                          </span>
                        </div>

                        {report.note && (
                          <p className="text-xs text-[#C8CBC4] bg-[#0C0D0C] border border-[#232723] px-3 py-2 rounded max-w-xl">
                            “{report.note}”
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {targetGame && (
                        <button
                          type="button"
                          onClick={() => onEditGame(targetGame)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded-md hover:bg-[#FCD34D] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Ajustar capa</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyKey === `res-cov-${report.id}`}
                        onClick={() =>
                          runAction(
                            `res-cov-${report.id}`,
                            () => resolveCoverReport(report.id),
                            `Reporte de capa de "${targetGame?.title || report.gameTitle}" marcado como resolvido.`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#142218] border border-[#22543D] text-[#4ADE80] hover:bg-[#193020] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `del-cov-${report.id}`}
                        onClick={() =>
                          runAction(
                            `del-cov-${report.id}`,
                            () => deleteCoverReport(report.id),
                            'Reporte de capa removido.',
                          )
                        }
                        aria-label="Excluir reporte"
                        className="p-1.5 text-[#8C9288] hover:text-[#F87171] bg-[#0C0D0C] border border-[#2A2F2A] rounded-md cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: REVIEWS & COMMENTS MODERATION */}
      {section === 'posts' && (
        <div className="space-y-4">
          <div className="bg-[#141614] border border-[#262A26] p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Buscar publicação por autor, jogo ou texto..."
                aria-label="Buscar publicações"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPostType('reviews')}
                className={`px-3 py-2 text-xs font-medium rounded-md border cursor-pointer ${
                  postType === 'reviews'
                    ? 'bg-[#1D221D] border-[#4ADE80] text-[#4ADE80]'
                    : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#A8ACA5]'
                }`}
              >
                Críticas ({reviews.length})
              </button>
              <button
                type="button"
                onClick={() => setPostType('comments')}
                className={`px-3 py-2 text-xs font-medium rounded-md border cursor-pointer ${
                  postType === 'comments'
                    ? 'bg-[#1D221D] border-[#4ADE80] text-[#4ADE80]'
                    : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#A8ACA5]'
                }`}
              >
                Comentários ({comments.length})
              </button>
            </div>
          </div>

          {postType === 'reviews' ? (
            filteredReviews.length === 0 ? (
              <div className="bg-[#141614] border border-[#262A26] p-10 text-center text-sm text-[#90968C]">
                Nenhuma crítica encontrada.
              </div>
            ) : (
              <div className="divide-y divide-[#232723] border border-[#262A26] bg-[#141614]">
                {filteredReviews.map((review) => {
                  const authorName =
                    membersById[review.authorId]?.displayName || review.authorName;
                  const gameTitle =
                    gamesById.get(review.gameId)?.title || review.gameTitle;

                  return (
                    <div
                      key={review.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8C9288]">
                          <span className="font-semibold text-[#F2F2EE]">
                            {authorName}
                          </span>
                          <span>em</span>
                          <button
                            type="button"
                            onClick={() => onSelectGame(review.gameId)}
                            className="text-[#4ADE80] hover:underline cursor-pointer"
                          >
                            {gameTitle}
                          </button>
                          <span>· {formatTimestamp(review.createdAt)}</span>
                        </div>
                        {review.ratingOnly || (!review.headline.trim() && !review.body.trim()) ? (
                          <p className="text-xs italic text-[#90968C]">
                            Optou apenas por dar nota ao jogo (sem crítica escrita).
                          </p>
                        ) : (
                          <>
                            <p className="font-serif text-base text-[#F2F2EE]">
                              {review.headline}
                            </p>
                            <p className="text-xs text-[#A8ACA5] line-clamp-2 max-w-2xl">
                              {review.body}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <ScoreBadge score={review.score} size="sm" />
                        {confirmActionKey === `del-rev-${review.id}` ? (
                          <div className="inline-flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              disabled={busyKey === `del-rev-${review.id}`}
                              onClick={() =>
                                runAction(
                                  `del-rev-${review.id}`,
                                  () => deleteReview(review.id),
                                  'Crítica removida com sucesso.',
                                )
                              }
                              className="px-2.5 py-1.5 bg-[#B91C1C] text-white rounded-md font-medium cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmActionKey(null)}
                              className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer px-1"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmActionKey(`del-rev-${review.id}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#F87171] hover:bg-[#291515] bg-[#0C0D0C] border border-[#3F2222] rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Apagar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredComments.length === 0 ? (
            <div className="bg-[#141614] border border-[#262A26] p-10 text-center text-sm text-[#90968C]">
              Nenhum comentário encontrado.
            </div>
          ) : (
            <div className="divide-y divide-[#232723] border border-[#262A26] bg-[#141614]">
              {filteredComments.map((comment) => {
                const authorName =
                  membersById[comment.authorId]?.displayName || comment.authorName;
                const gameTitle =
                  gamesById.get(comment.gameId)?.title || 'Jogo';

                return (
                  <div
                    key={comment.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8C9288]">
                        <span className="font-semibold text-[#F2F2EE]">
                          {authorName}
                        </span>
                        <span>em crítica de</span>
                        <button
                          type="button"
                          onClick={() => onSelectGame(comment.gameId)}
                          className="text-[#4ADE80] hover:underline cursor-pointer"
                        >
                          {gameTitle}
                        </button>
                        <span>· {formatTimestamp(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-[#C8CBC4] break-words max-w-2xl">
                        {comment.body}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        disabled={busyKey === `del-cmt-${comment.id}`}
                        onClick={() =>
                          runAction(
                            `del-cmt-${comment.id}`,
                            () => deleteComment(comment.id),
                            'Comentário removido.',
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#F87171] hover:bg-[#291515] bg-[#0C0D0C] border border-[#3F2222] rounded-md cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Apagar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
