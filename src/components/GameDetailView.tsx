import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Flag, Pencil, Pin, PinOff, Trash2, X } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  GAME_PLAY_STATUS_LIST,
  GAME_PLAY_STATUS_META,
  LIMITS,
  formatReleaseDate,
  type GamePlayStatus,
  type GameWithStats,
  type Review,
} from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
import { ReviewCard } from './ReviewCard';
import { ScoreBadge } from './ScoreBadge';

interface GameDetailViewProps {
  game: GameWithStats;
  onBack: () => void;
  onOpenReview: (game: GameWithStats, existing?: Review | null) => void;
  onEditGame: (game: GameWithStats) => void;
  onSelectAuthor: (authorUid: string) => void;
}

export function GameDetailView({
  game,
  onBack,
  onOpenReview,
  onEditGame,
  onSelectAuthor,
}: GameDetailViewProps) {
  const {
    user,
    isAdmin,
    membersById,
    myOpenCoverReportGameIds,
    userStatusesByGame,
    myStatusByGame,
    featuredRound,
    deleteGame,
    reportIncorrectCover,
    setGamePlayStatus,
    clearGamePlayStatus,
    pinFeaturedRound,
    unpinFeaturedRound,
  } = useVeredito();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCoverReportForm, setShowCoverReportForm] = useState(false);
  const [coverReportNote, setCoverReportNote] = useState('');
  const [submittingCoverReport, setSubmittingCoverReport] = useState(false);
  const [coverReportFeedback, setCoverReportFeedback] = useState<string | null>(null);
  const [coverReportError, setCoverReportError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinRoundLabel, setPinRoundLabel] = useState('Rodada atual');
  const [pinNote, setPinNote] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  const alreadyReportedCover = myOpenCoverReportGameIds.has(game.id);
  const myStatus = myStatusByGame[game.id];
  const gameStatuses = userStatusesByGame[game.id] || [];
  const isPinnedAsRound = featuredRound?.gameId === game.id;

  const myReview = user
    ? game.reviews.find((r) => r.authorId === user.uid) || null
    : null;

  const canManageGame = Boolean(user && (game.createdBy === user.uid || isAdmin));

  const handleTogglePlayStatus = async (status: GamePlayStatus) => {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      if (myStatus === status) {
        await clearGamePlayStatus(game.id);
      } else {
        await setGamePlayStatus(game.id, status);
      }
    } finally {
      setStatusBusy(false);
    }
  };

  const handlePinFeaturedRound = async (e: FormEvent) => {
    e.preventDefault();
    if (pinBusy) return;
    setPinBusy(true);
    try {
      await pinFeaturedRound({
        gameId: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        roundLabel: pinRoundLabel.trim() || 'Rodada atual',
        note: pinNote.trim(),
      });
      setShowPinForm(false);
    } finally {
      setPinBusy(false);
    }
  };

  const handleUnpinFeaturedRound = async () => {
    if (pinBusy) return;
    setPinBusy(true);
    try {
      await unpinFeaturedRound();
    } finally {
      setPinBusy(false);
    }
  };

  const handleDeleteGame = async () => {
    setDeleting(true);
    try {
      await deleteGame(game.id);
      onBack();
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitCoverReport = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingCoverReport) return;
    setSubmittingCoverReport(true);
    setCoverReportError(null);
    setCoverReportFeedback(null);
    try {
      await reportIncorrectCover(game, coverReportNote);
      setCoverReportNote('');
      setShowCoverReportForm(false);
      setCoverReportFeedback('Capa reportada! Os administradores foram notificados.');
    } catch (err) {
      setCoverReportError(
        err instanceof Error ? err.message : 'Não foi possível enviar o reporte.',
      );
    } finally {
      setSubmittingCoverReport(false);
    }
  };

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-12">
      {/* Back navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao catálogo</span>
        </button>

        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
            isPinnedAsRound ? (
              <button
                type="button"
                disabled={pinBusy}
                onClick={handleUnpinFeaturedRound}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4ADE80] hover:text-[#F87171] transition-colors cursor-pointer"
              >
                <PinOff className="w-3.5 h-3.5" />
                <span>Jogo da Rodada fixado · Desafixar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPinForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A8ACA5] hover:text-[#4ADE80] transition-colors cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>Fixar como Jogo da Rodada</span>
              </button>
            )
          )}

          {canManageGame && (
            <>
              <button
                type="button"
                onClick={() => onEditGame(game)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar ficha</span>
              </button>

              {confirmingDelete ? (
                <div className="inline-flex items-center gap-2 text-xs">
                  <span className="text-[#F87171] font-medium">Confirmar exclusão?</span>
                  <button
                    type="button"
                    onClick={handleDeleteGame}
                    disabled={deleting}
                    className="px-2.5 py-1 bg-[#B91C1C] text-white rounded-md font-medium cursor-pointer"
                  >
                    {deleting ? 'Removendo...' : 'Sim, excluir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C9288] hover:text-[#F87171] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover jogo</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isAdmin && showPinForm && !isPinnedAsRound && (
        <form
          onSubmit={handlePinFeaturedRound}
          className="bg-[#131914] border border-[#244D32] rounded-md p-4 flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label
              htmlFor="pin-round-label"
              className="block text-[11px] font-medium text-[#A8ACA5] mb-1"
            >
              Rótulo da rodada
            </label>
            <input
              id="pin-round-label"
              type="text"
              maxLength={LIMITS.FEATURED_ROUND_LABEL_MAX}
              value={pinRoundLabel}
              onChange={(e) => setPinRoundLabel(e.target.value)}
              placeholder="Ex.: Rodada de Maio · Votação do Grupo"
              className="w-full px-3 py-2 text-xs bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="pin-round-note"
              className="block text-[11px] font-medium text-[#A8ACA5] mb-1"
            >
              Observação opcional
            </label>
            <input
              id="pin-round-note"
              type="text"
              maxLength={LIMITS.FEATURED_ROUND_NOTE_MAX}
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              placeholder="Ex.: Meta de zerar até domingo para o bate-papo!"
              className="w-full px-3 py-2 text-xs bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPinForm(false)}
              className="px-3 py-2 text-xs text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pinBusy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-50 cursor-pointer"
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{pinBusy ? 'Fixando...' : 'Fixar no topo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Editorial Game Dossier */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#232723]">
        <div className="lg:col-span-4 max-w-[280px] lg:max-w-none w-full space-y-3">
          <GameCover
            title={game.title}
            developer={game.developer}
            releaseYear={game.releaseYear}
            coverUrl={game.coverUrl}
          />

          {/* Report Incorrect Cover Control */}
          <div className="space-y-2">
            {alreadyReportedCover && !showCoverReportForm ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#131F16] border border-[#244E33] text-xs text-[#86EFAC]">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Capa reportada aos admins</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoverReportForm(true);
                    setCoverReportFeedback(null);
                    setCoverReportError(null);
                  }}
                  className="text-[11px] underline text-[#A8ACA5] hover:text-[#F2F2EE] shrink-0 cursor-pointer"
                >
                  Editar nota
                </button>
              </div>
            ) : !showCoverReportForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowCoverReportForm(true);
                  setCoverReportFeedback(null);
                  setCoverReportError(null);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[#262B26] bg-[#141614] text-[#90968C] hover:text-[#FBBF24] hover:border-[#5A4419] transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Reportar capa incorreta</span>
              </button>
            ) : (
              <form
                onSubmit={handleSubmitCoverReport}
                className="bg-[#141614] border border-[#3C331A] rounded-md p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#FDE68A] flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span>Reportar capa aos admins</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCoverReportForm(false)}
                    aria-label="Fechar reporte de capa"
                    className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  maxLength={LIMITS.COVER_REPORT_NOTE_MAX}
                  value={coverReportNote}
                  onChange={(e) => setCoverReportNote(e.target.value)}
                  placeholder="Detalhe opcional (ex.: capa horizontal, jogo errado ou imagem quebrada)..."
                  className="w-full px-2.5 py-2 text-xs bg-[#0C0D0C] border border-[#2A2F2A] rounded text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#FBBF24]"
                />
                {coverReportError && (
                  <p className="text-[11px] text-[#F87171]" role="alert">
                    {coverReportError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCoverReportForm(false)}
                    className="px-2.5 py-1.5 text-xs text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCoverReport}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded hover:bg-[#FCD34D] disabled:opacity-50 cursor-pointer"
                  >
                    {submittingCoverReport ? 'Enviando...' : 'Notificar admins'}
                  </button>
                </div>
              </form>
            )}

            {coverReportFeedback && (
              <p className="text-[11px] text-[#86EFAC]" role="status">
                {coverReportFeedback}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <div>
              <p className="text-xs text-[#8C9288]">
                Ficha CobraCritic · Cadastrado por{' '}
                <button
                  type="button"
                  onClick={() => onSelectAuthor(game.createdBy)}
                  className="text-[#4ADE80] font-medium hover:underline cursor-pointer"
                >
                  {game.createdByName}
                </button>
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F2EE] mt-2 leading-[1.08]">
                {game.title}
              </h1>
            </div>

            <p className="text-[15px] sm:text-base text-[#C8CBC4] leading-[1.7] max-w-2xl">
              {game.synopsis}
            </p>

            {/* Metadata Definition List */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-[#222622] text-sm">
              <div>
                <dt className="text-xs text-[#8C9288]">Estúdio / Desenvolvedora</dt>
                <dd className="font-medium text-[#F2F2EE] mt-0.5">{game.developer}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Data de lançamento</dt>
                <dd className="font-mono text-[#F2F2EE] mt-0.5 tabular-nums">
                  {formatReleaseDate(game.releaseDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Plataformas</dt>
                <dd className="font-medium text-[#F2F2EE] mt-0.5">
                  {game.platforms.join(' · ')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Gêneros</dt>
                <dd className="font-medium text-[#F2F2EE] mt-0.5">
                  {game.genres.join(' · ')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Group Score Panel */}
          <div className="bg-[#141614] border border-[#262A26] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <ScoreBadge
                score={game.averageScore}
                size="lg"
                showLabel
                reviewCount={game.reviewCount}
              />

              <button
                type="button"
                onClick={() => onOpenReview(game, myReview)}
                className="px-5 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {myReview ? 'Editar minha avaliação' : 'Avaliar jogo'}
              </button>
            </div>

            {game.reviewCount > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#222622]">
                <div className="h-2.5 w-full bg-[#222622] overflow-hidden flex">
                  {game.positiveCount > 0 && (
                    <div
                      className="bg-[#16A34A] h-full"
                      style={{
                        width: `${(game.positiveCount / game.reviewCount) * 100}%`,
                      }}
                    />
                  )}
                  {game.mixedCount > 0 && (
                    <div
                      className="bg-[#D97706] h-full"
                      style={{
                        width: `${(game.mixedCount / game.reviewCount) * 100}%`,
                      }}
                    />
                  )}
                  {game.negativeCount > 0 && (
                    <div
                      className="bg-[#DC2626] h-full"
                      style={{
                        width: `${(game.negativeCount / game.reviewCount) * 100}%`,
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#90968C] tabular-nums">
                  <span>
                    Positivas (75–100): <strong className="text-[#F2F2EE]">{game.positiveCount}</strong>
                    {' · '}
                    Mistas (50–74): <strong className="text-[#F2F2EE]">{game.mixedCount}</strong>
                    {' · '}
                    Desfavoráveis (0–49): <strong className="text-[#F2F2EE]">{game.negativeCount}</strong>
                  </span>
                  {game.minScore !== null && game.maxScore !== null && (
                    <span className="font-mono">
                      Faixa: {game.minScore}–{game.maxScore}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Personal Play Status Selector & Group Activity */}
            <div className="space-y-4 pt-4 border-t border-[#222622]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#A8ACA5]">
                    Meu status neste jogo
                  </span>
                  {myStatus && (
                    <button
                      type="button"
                      disabled={statusBusy}
                      onClick={() => handleTogglePlayStatus(myStatus)}
                      className="text-[11px] text-[#8C9288] hover:text-[#F87171] cursor-pointer"
                    >
                      Limpar status
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {GAME_PLAY_STATUS_LIST.map((st) => {
                    const meta = GAME_PLAY_STATUS_META[st];
                    const active = myStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={statusBusy}
                        onClick={() => handleTogglePlayStatus(st)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          active
                            ? meta.activeClass
                            : 'bg-[#0C0D0C] border-[#262B26] text-[#90968C] hover:text-[#F2F2EE] hover:border-[#3A433A]'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {gameStatuses.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-[#1E221E]">
                  <p className="text-xs font-medium text-[#8C9288]">
                    Atividade dos Cobras ({gameStatuses.length})
                  </p>
                  <div className="space-y-2">
                    {GAME_PLAY_STATUS_LIST.map((st) => {
                      const entries = gameStatuses.filter((item) => item.status === st);
                      if (entries.length === 0) return null;
                      const meta = GAME_PLAY_STATUS_META[st];
                      return (
                        <div
                          key={st}
                          className="flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className={`font-medium w-24 shrink-0 ${meta.colorClass}`}>
                            {meta.label} ({entries.length})
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {entries.map((entry) => {
                              const liveMember = membersById[entry.userId];
                              const name = liveMember?.displayName || entry.userName;
                              return (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => onSelectAuthor(entry.userId)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#0C0D0C] border border-[#232823] text-[#C8CBC4] hover:border-[#4ADE80]/60 hover:text-[#F2F2EE] transition-colors cursor-pointer"
                                >
                                  <MemberAvatar
                                    name={name}
                                    primarySrc={liveMember?.photoURL || ''}
                                    fallbackSrc={entry.userPhotoURL}
                                    size="xs"
                                  />
                                  <span className="max-w-[120px] truncate">
                                    {name.split(' ')[0]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews & Discussion Section */}
      <section aria-label="Críticas dos Cobras" className="space-y-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F2EE]">
            Críticas dos Cobras
          </h2>
          <p className="text-sm text-[#90968C] mt-1">
            Cada avaliação compõe diretamente a média do grupo e abre espaço para debate.
          </p>
        </div>

        {game.reviews.length === 0 ? (
          <div className="border border-[#262A26] bg-[#141614] px-8 py-12 text-center space-y-4">
            <p className="font-display text-xl font-semibold text-[#F2F2EE]">
              Seja o primeiro Cobra a avaliar {game.title}
            </p>
            <p className="text-sm text-[#90968C] max-w-md mx-auto">
              Dê uma nota de 0 a 100 e compartilhe sua análise para abrir a pontuação média.
            </p>
            <button
              type="button"
              onClick={() => onOpenReview(game, null)}
              className="px-5 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
            >
              Publicar primeira crítica
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {game.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                game={game}
                defaultCommentsOpen
                onSelectAuthor={onSelectAuthor}
                onEditReview={(rev) => onOpenReview(game, rev)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
