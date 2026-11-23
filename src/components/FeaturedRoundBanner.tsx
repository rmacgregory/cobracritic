import { useMemo, useState } from 'react';
import { ArrowRight, Check, Gamepad2, Pin, PinOff, Star } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import type { GameWithStats } from '../types';
import { GameCover } from './GameCover';
import { ScoreBadge } from './ScoreBadge';

interface FeaturedRoundBannerProps {
  onSelectGame: (gameId: string) => void;
  onOpenReview?: (game: GameWithStats) => void;
}

export function FeaturedRoundBanner({
  onSelectGame,
  onOpenReview,
}: FeaturedRoundBannerProps) {
  const {
    user,
    isAdmin,
    featuredRound,
    gamesWithStats,
    userStatusesByGame,
    myStatusByGame,
    setGamePlayStatus,
    clearGamePlayStatus,
    unpinFeaturedRound,
  } = useVeredito();

  const [busy, setBusy] = useState(false);

  const linkedGame = useMemo(() => {
    if (!featuredRound?.gameId) return null;
    return gamesWithStats.find((g) => g.id === featuredRound.gameId) || null;
  }, [featuredRound, gamesWithStats]);

  if (!featuredRound) return null;

  const statusesForGame = linkedGame ? userStatusesByGame[linkedGame.id] || [] : [];
  const playingCount = statusesForGame.filter((s) => s.status === 'playing').length;
  const finishedCount = statusesForGame.filter(
    (s) => s.status === 'completed' || s.status === 'platinum',
  ).length;
  const myStatus = linkedGame ? myStatusByGame[linkedGame.id] : undefined;
  const isPlaying = myStatus === 'playing';

  const handleTogglePlaying = async () => {
    if (!linkedGame || busy) return;
    setBusy(true);
    try {
      if (isPlaying) {
        await clearGamePlayStatus(linkedGame.id);
      } else {
        await setGamePlayStatus(linkedGame.id, 'playing');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnpin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await unpinFeaturedRound();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Jogo da Rodada Atual"
      className="bg-[#131914] border border-[#244D32] rounded-md p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <button
            type="button"
            disabled={!linkedGame}
            onClick={() => linkedGame && onSelectGame(linkedGame.id)}
            className={`w-14 sm:w-16 shrink-0 text-left ${linkedGame ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <GameCover
              title={featuredRound.title}
              coverUrl={linkedGame?.coverUrl || featuredRound.coverUrl}
              compact
              className="w-full rounded-[3px]"
            />
          </button>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-[#4ADE80]">
                <Pin className="w-3.5 h-3.5" />
                <span>Jogo da Rodada</span>
              </span>
              <span className="text-[#4B5148]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#A8ACA5] truncate">{featuredRound.roundLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {linkedGame ? (
                <button
                  type="button"
                  onClick={() => onSelectGame(linkedGame.id)}
                  className="font-display text-lg sm:text-xl font-bold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors text-left cursor-pointer truncate"
                >
                  {featuredRound.title}
                </button>
              ) : (
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#F2F2EE] truncate">
                  {featuredRound.title}
                </h2>
              )}
              {linkedGame && linkedGame.averageScore !== null && (
                <ScoreBadge score={linkedGame.averageScore} size="xs" />
              )}
            </div>

            {featuredRound.note && (
              <p className="text-xs text-[#A8ACA5] line-clamp-2 max-w-xl">
                {featuredRound.note}
              </p>
            )}

            {linkedGame && (
              <p className="text-xs text-[#8C9288] flex flex-wrap items-center gap-x-2.5 gap-y-0.5 tabular-nums pt-0.5">
                <span>
                  <strong className="text-[#F2F2EE]">{playingCount}</strong> jogando agora
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-[#F2F2EE]">{finishedCount}</strong>{' '}
                  {finishedCount === 1 ? 'zerou' : 'zeraram'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-[#F2F2EE]">{linkedGame.reviewCount}</strong>{' '}
                  {linkedGame.reviewCount === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {user && linkedGame && (
            <button
              type="button"
              disabled={busy}
              onClick={handleTogglePlaying}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                isPlaying
                  ? 'bg-[#173322] border-[#4ADE80] text-[#86EFAC]'
                  : 'bg-[#0C0D0C] border-[#2C342C] text-[#C8CBC4] hover:text-[#4ADE80] hover:border-[#4ADE80]/60'
              }`}
            >
              {isPlaying ? <Check className="w-3.5 h-3.5" /> : <Gamepad2 className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Estou jogando' : 'Marcar jogando'}</span>
            </button>
          )}

          {user && linkedGame && onOpenReview && (
            <button
              type="button"
              onClick={() => onOpenReview(linkedGame)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Avaliar</span>
            </button>
          )}

          {linkedGame && (
            <button
              type="button"
              onClick={() => onSelectGame(linkedGame.id)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[#2C342C] bg-[#141614] text-[#F2F2EE] rounded-md hover:border-[#4ADE80]/60 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Ver ficha</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              disabled={busy}
              onClick={handleUnpin}
              title="Desafixar Jogo da Rodada"
              aria-label="Desafixar Jogo da Rodada"
              className="p-2 rounded-md border border-[#2A2F2A] bg-[#0C0D0C] text-[#8C9288] hover:text-[#F87171] hover:border-[#522626] transition-colors cursor-pointer"
            >
              <PinOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
