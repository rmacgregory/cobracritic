import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { getMemberBadgeMeta } from '../types';
import { GameCover } from './GameCover';
import { RetroEasterEggSlot } from './RetroEasterEggs';
import { ScoreBadge } from './ScoreBadge';

interface GlobalSearchBarProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (memberUid: string) => void;
}

export function GlobalSearchBar({
  onSelectGame,
  onSelectMember,
}: GlobalSearchBarProps) {
  const { user, gamesWithStats, members, reviews } = useVeredito();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const reviewCountByMember = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reviews) {
      counts[r.authorId] = (counts[r.authorId] || 0) + 1;
    }
    return counts;
  }, [reviews]);

  const trimmed = query.trim().toLowerCase();

  const matchingGames = useMemo(() => {
    if (!trimmed) return [];
    return gamesWithStats
      .filter(
        (g) =>
          g.title.toLowerCase().includes(trimmed) ||
          g.developer.toLowerCase().includes(trimmed),
      )
      .slice(0, 5);
  }, [gamesWithStats, trimmed]);

  const matchingMembers = useMemo(() => {
    if (!user || !trimmed) return [];
    return members
      .filter(
        (m) =>
          m.displayName.toLowerCase().includes(trimmed) ||
          (m.topFiveGames || []).some((g) => g.toLowerCase().includes(trimmed)),
      )
      .slice(0, 5);
  }, [user, members, trimmed]);

  const hasResults = matchingGames.length > 0 || matchingMembers.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={user ? 'Buscar jogos ou membros...' : 'Buscar jogos...'}
          aria-label={
            user ? 'Busca global por jogos ou membros' : 'Busca global por jogos'
          }
          className="w-full pl-9 pr-8 py-2 text-sm bg-[#141614] border border-[#262A26] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80] transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787D75] hover:text-[#F2F2EE] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <RetroEasterEggSlot
          slot="search-box"
          mode="corner"
          cornerOverride={query ? 'bl' : 'br'}
        />
      </div>

      {open && trimmed.length > 0 && (
        <div
          role="listbox"
          aria-label="Resultados da busca global"
          className="absolute left-0 right-0 mt-2 z-50 bg-[#141614] border border-[#2F352F] rounded-md shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
        >
          {!hasResults ? (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-[#90968C]">
                {user
                  ? `Nenhum jogo ou membro encontrado para “${query.trim()}”.`
                  : `Nenhum jogo encontrado para “${query.trim()}”.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#222622]">
              {matchingGames.length > 0 && (
                <div className="py-2">
                  <p className="px-3.5 pb-1.5 text-[11px] font-mono text-[#787D75]">
                    Jogos
                  </p>
                  <ul>
                    {matchingGames.map((game) => (
                      <li key={game.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectGame(game.id);
                            setQuery('');
                            setOpen(false);
                          }}
                          className="w-full px-3.5 py-2 hover:bg-[#1C201C] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 shrink-0">
                              <GameCover
                                title={game.title}
                                coverUrl={game.coverUrl}
                                compact
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#F2F2EE] truncate">
                                {game.title}
                              </p>
                              <p className="text-xs text-[#8C9288] truncate">
                                {game.developer} · {game.releaseYear}
                              </p>
                            </div>
                          </div>
                          <ScoreBadge score={game.averageScore} size="sm" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {matchingMembers.length > 0 && (
                <div className="py-2">
                  <p className="px-3.5 pb-1.5 text-[11px] font-mono text-[#787D75]">
                    Membros
                  </p>
                  <ul>
                    {matchingMembers.map((member) => {
                      const initials = member.displayName
                        .split(' ')
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')
                        .toUpperCase();
                      const count = reviewCountByMember[member.uid] || 0;
                      return (
                        <li key={member.uid}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectMember(member.uid);
                              setQuery('');
                              setOpen(false);
                            }}
                            className="w-full px-3.5 py-2 hover:bg-[#1C201C] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={member.displayName}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-full object-cover border border-[#2C312C] shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#222622] text-[#F2F2EE] text-xs font-semibold flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#F2F2EE] truncate">
                                  {member.displayName}
                                </p>
                                <p className="text-xs text-[#8C9288] truncate">
                                  {(member.topFiveGames || []).length > 0
                                    ? `Top 1: ${member.topFiveGames?.[0]}`
                                    : getMemberBadgeMeta(member.memberBadge).label}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs text-[#8C9288] tabular-nums shrink-0">
                              {count} {count === 1 ? 'crítica' : 'críticas'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
