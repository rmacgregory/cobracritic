import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { formatReleaseDate, type GameWithStats, type Review } from '../types';
import { GameCover } from './GameCover';
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
  const { user, isAdmin, deleteGame } = useVeredito();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const myReview = user
    ? game.reviews.find((r) => r.authorId === user.uid) || null
    : null;

  const canManageGame = Boolean(user && (game.createdBy === user.uid || isAdmin));

  const handleDeleteGame = async () => {
    setDeleting(true);
    try {
      await deleteGame(game.id);
      onBack();
    } finally {
      setDeleting(false);
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

        {canManageGame && (
          <div className="flex items-center gap-4">
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
          </div>
        )}
      </div>

      {/* Editorial Game Dossier */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#232723]">
        <div className="lg:col-span-4 max-w-[280px] lg:max-w-none w-full">
          <GameCover
            title={game.title}
            developer={game.developer}
            releaseYear={game.releaseYear}
            coverUrl={game.coverUrl}
          />
        </div>

        <div className="lg:col-span-8 flex flex-col justify-between gap-8">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#8C9288]">
                Ficha CobraCritic · Cadastrado por{' '}
                <button
                  type="button"
                  onClick={() => onSelectAuthor(game.createdBy)}
                  className="text-[#4ADE80] hover:underline cursor-pointer"
                >
                  {game.createdByName}
                </button>
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#F2F2EE] mt-2 leading-[1.1]">
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
                {myReview ? 'Editar minha crítica' : 'Escrever crítica'}
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
          </div>
        </div>
      </section>

      {/* Reviews & Discussion Section */}
      <section aria-label="Críticas dos Cobras" className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#F2F2EE]">
            Críticas dos Cobras
          </h2>
          <p className="text-sm text-[#90968C] mt-1">
            Cada avaliação compõe diretamente a média do grupo e abre espaço para debate.
          </p>
        </div>

        {game.reviews.length === 0 ? (
          <div className="border border-[#262A26] bg-[#141614] px-8 py-12 text-center space-y-4">
            <p className="font-serif text-xl text-[#F2F2EE]">
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
