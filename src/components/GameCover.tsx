import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface GameCoverProps {
  title: string;
  developer?: string;
  releaseYear?: number;
  coverUrl?: string;
  className?: string;
  compact?: boolean;
}

export function GameCover({
  title,
  developer,
  releaseYear,
  coverUrl,
  className = '',
  compact = false,
}: GameCoverProps) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(coverUrl && coverUrl.trim().length > 0 && !failed);

  return (
    <div
      className={`relative overflow-hidden bg-[#181A18] aspect-[3/4] select-none border border-[#262A26] ${className}`}
    >
      {hasImage ? (
        <img
          src={coverUrl}
          alt={`Capa do jogo ${title}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-[#1C201C] via-[#151715] to-[#0E100E] text-[#F2F2EE]">
          <div className="flex items-center justify-between text-[#8C9288]">
            <Gamepad2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={1.5} />
            {releaseYear && !compact && (
              <span className="font-mono text-[11px] tabular-nums">{releaseYear}</span>
            )}
          </div>
          <div className="my-auto py-2">
            <p
              className={`font-serif font-medium leading-snug text-[#F2F2EE] line-clamp-3 ${
                compact ? 'text-xs' : 'text-lg'
              }`}
            >
              {title}
            </p>
            {developer && !compact && (
              <p className="text-xs text-[#90968C] mt-1.5 truncate">{developer}</p>
            )}
          </div>
          {!compact && (
            <div className="pt-2 border-t border-white/10 text-[10px] font-mono tracking-wider text-[#787D75]">
              CobraCritic
            </div>
          )}
        </div>
      )}
    </div>
  );
}
