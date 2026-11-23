import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  LIMITS,
  PLATFORMS,
  getScoreMeta,
  type Game,
  type Review,
  type ReviewInput,
} from '../types';
import { ScoreBadge } from './ScoreBadge';

interface ReviewFormModalProps {
  game: Game;
  existingReview?: Review | null;
  onClose: () => void;
  onSubmit: (input: ReviewInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ReviewFormModal({
  game,
  existingReview,
  onClose,
  onSubmit,
  onDelete,
}: ReviewFormModalProps) {
  const availablePlatforms =
    game.platforms.length > 0 ? game.platforms : [...PLATFORMS];

  const [score, setScore] = useState<number>(existingReview?.score ?? 80);
  const [ratingOnly, setRatingOnly] = useState<boolean>(
    Boolean(
      existingReview?.ratingOnly ||
        (existingReview && !existingReview.headline.trim() && !existingReview.body.trim()),
    ),
  );
  const [headline, setHeadline] = useState(existingReview?.headline || '');
  const [body, setBody] = useState(existingReview?.body || '');
  const [platformPlayed, setPlatformPlayed] = useState(
    existingReview?.platformPlayed || availablePlatforms[0] || 'PC',
  );
  const [hoursPlayed, setHoursPlayed] = useState<string>(
    existingReview ? String(existingReview.hoursPlayed) : '',
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreMeta = getScoreMeta(score);

  const handleScoreNumberChange = (raw: string) => {
    if (raw === '') {
      setScore(0);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      setScore(Math.min(100, Math.max(0, parsed)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ratingOnly) {
      if (headline.trim().length < LIMITS.HEADLINE_MIN) {
        setError('Escreva um título curto para o seu veredito (mín. 2 caracteres) ou marque "Dar apenas nota".');
        return;
      }
      if (body.trim().length < LIMITS.REVIEW_BODY_MIN) {
        setError('Escreva uma crítica com pelo menos 10 caracteres ou marque "Dar apenas nota".');
        return;
      }
    }

    const parsedHours = hoursPlayed.trim() === '' ? 0 : Number(hoursPlayed);
    if (Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > LIMITS.HOURS_MAX) {
      setError(`Horas jogadas deve ser um número entre 0 e ${LIMITS.HOURS_MAX}.`);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        score,
        ratingOnly,
        headline: ratingOnly ? '' : headline.trim(),
        body: ratingOnly ? '' : body.trim(),
        platformPlayed,
        hoursPlayed: parsedHours,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar sua avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir crítica.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-[#141614] border border-[#2A2F2A] w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto text-[#F2F2EE]">
        <div className="sticky top-0 z-10 bg-[#141614] border-b border-[#232723] px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono text-[#8C9288] truncate">{game.title}</p>
            <h2
              id="review-modal-title"
              className="font-serif text-xl font-semibold text-[#F2F2EE]"
            >
              {existingReview ? 'Editar minha avaliação' : 'Publicar nota e crítica'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 text-[#8C9288] hover:text-[#F2F2EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Score Picker */}
          <div className="bg-[#0C0D0C] border border-[#262A26] p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#A8ACA5]">Sua nota (0 a 100)</p>
                <p className={`text-sm font-semibold mt-1 ${scoreMeta.accentTextClass}`}>
                  {scoreMeta.label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => handleScoreNumberChange(e.target.value)}
                  aria-label="Nota numérica de 0 a 100"
                  className="w-20 px-3 py-2 text-center font-mono text-lg font-semibold tabular-nums bg-[#141614] border border-[#2F352F] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
                />
                <ScoreBadge score={score} size="md" />
              </div>
            </div>

            <div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full accent-[#4ADE80] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#787D75] mt-1 tabular-nums">
                <span>0 · Rejeição</span>
                <span>50 · Misto</span>
                <span>75 · Favorável</span>
                <span>100 · Obra-prima</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="review-platform"
                className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
              >
                Plataforma jogada
              </label>
              <select
                id="review-platform"
                value={platformPlayed}
                onChange={(e) => setPlatformPlayed(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
              >
                {availablePlatforms.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="review-hours"
                className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
              >
                Horas jogadas (opcional)
              </label>
              <input
                id="review-hours"
                type="number"
                min={0}
                max={LIMITS.HOURS_MAX}
                step="0.5"
                value={hoursPlayed}
                onChange={(e) => setHoursPlayed(e.target.value)}
                placeholder="Ex.: 42"
                className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] font-mono tabular-nums focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
          </div>

          {/* Option: Rating Only */}
          <label
            htmlFor="review-rating-only"
            className={`flex items-start gap-3 p-3.5 rounded-md border transition-colors cursor-pointer select-none ${
              ratingOnly
                ? 'bg-[#122117] border-[#2C613D]'
                : 'bg-[#0C0D0C] border-[#262A26] hover:border-[#3A403A]'
            }`}
          >
            <input
              id="review-rating-only"
              type="checkbox"
              checked={ratingOnly}
              onChange={(e) => {
                setRatingOnly(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 w-4 h-4 rounded accent-[#4ADE80] cursor-pointer shrink-0"
            />
            <div className="space-y-0.5">
              <span className="block text-sm font-medium text-[#F2F2EE]">
                Dar apenas nota
              </span>
              <span className="block text-xs text-[#90968C] leading-relaxed">
                Publique somente sua pontuação de 0 a 100 sem precisar escrever uma crítica.
                A ficha exibirá que você optou apenas por dar nota ao jogo.
              </span>
            </div>
          </label>

          {!ratingOnly && (
            <>
              <div>
                <label
                  htmlFor="review-headline"
                  className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                >
                  Título da crítica ({headline.length}/{LIMITS.HEADLINE_MAX})
                </label>
                <input
                  id="review-headline"
                  type="text"
                  required
                  minLength={LIMITS.HEADLINE_MIN}
                  maxLength={LIMITS.HEADLINE_MAX}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex.: Combate impecável, mas o ato final perde o ritmo"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <div>
                <label
                  htmlFor="review-body"
                  className="block text-xs font-medium text-[#A8ACA5] mb-1.5"
                >
                  Crítica completa ({body.length}/{LIMITS.REVIEW_BODY_MAX})
                </label>
                <textarea
                  id="review-body"
                  required
                  rows={6}
                  minLength={LIMITS.REVIEW_BODY_MIN}
                  maxLength={LIMITS.REVIEW_BODY_MAX}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Conte aos Cobras o que funcionou, o que decepcionou e se vale a pena jogar..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0C0D0C] border border-[#2C312C] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] leading-relaxed focus:outline-none focus:border-[#4ADE80]"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-[#F87171]" role="alert">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-[#232723] flex items-center justify-between gap-3">
            <div>
              {existingReview && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F87171] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? 'Excluindo...' : 'Excluir crítica'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#A8ACA5] hover:text-[#F2F2EE] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving
                  ? 'Publicando...'
                  : existingReview
                    ? ratingOnly
                      ? 'Atualizar nota'
                      : 'Atualizar crítica'
                    : ratingOnly
                      ? 'Publicar nota'
                      : 'Publicar crítica'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
