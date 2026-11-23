import { getScoreMeta } from '../types';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  reviewCount?: number;
}

export function ScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  reviewCount,
}: ScoreBadgeProps) {
  const meta = getScoreMeta(score);
  const displayValue = score === null ? '—' : String(Math.round(score));

  const boxSizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }[size];

  return (
    <div className="inline-flex items-center gap-3 shrink-0">
      <div
        className={`${boxSizeClasses} ${meta.bgClass} ${meta.textClass} font-mono tabular-nums font-semibold rounded-[4px] flex items-center justify-center shrink-0 select-none`}
        aria-label={
          score === null
            ? 'Sem nota do grupo'
            : `Nota ${Math.round(score)} de 100 — ${meta.label}`
        }
      >
        {displayValue}
      </div>
      {showLabel && (
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-tight ${meta.accentTextClass}`}>
            {meta.label}
          </p>
          {typeof reviewCount === 'number' && (
            <p className="text-xs text-[#90968C] mt-0.5 tabular-nums">
              {reviewCount === 0
                ? 'Nenhuma crítica registrada'
                : reviewCount === 1
                  ? 'Baseado em 1 crítica dos Cobras'
                  : `Baseado em ${reviewCount} críticas dos Cobras`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
