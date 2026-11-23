import { useMemo } from 'react';
import { useVeredito } from '../context/VereditoContext';
import { formatReleaseDate, getScoreMeta } from '../types';
import { ScoreBadge } from './ScoreBadge';

interface RankingViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (memberUid: string) => void;
}

export function RankingView({ onSelectGame, onSelectMember }: RankingViewProps) {
  const { gamesWithStats, reviews, members } = useVeredito();

  const rankedGames = useMemo(() => {
    return gamesWithStats
      .filter((g) => g.averageScore !== null && g.weightedScore !== null)
      .sort((a, b) => {
        if ((b.weightedScore ?? 0) !== (a.weightedScore ?? 0)) {
          return (b.weightedScore ?? 0) - (a.weightedScore ?? 0);
        }
        if (b.reviewCount !== a.reviewCount) {
          return b.reviewCount - a.reviewCount;
        }
        return (b.averageScore ?? 0) - (a.averageScore ?? 0);
      });
  }, [gamesWithStats]);

  const divisiveGames = useMemo(() => {
    return gamesWithStats
      .filter((g) => g.reviewCount >= 2 && g.stdDev > 0)
      .sort((a, b) => b.stdDev - a.stdDev)
      .slice(0, 4);
  }, [gamesWithStats]);

  const criticStats = useMemo(() => {
    const byAuthor = new Map<
      string,
      {
        uid: string;
        name: string;
        scores: number[];
        highestTitle: string;
        highestScore: number;
      }
    >();

    for (const member of members) {
      byAuthor.set(member.uid, {
        uid: member.uid,
        name: member.displayName,
        scores: [],
        highestTitle: '—',
        highestScore: -1,
      });
    }

    for (const rev of reviews) {
      const entry = byAuthor.get(rev.authorId) || {
        uid: rev.authorId,
        name: rev.authorName,
        scores: [],
        highestTitle: '—',
        highestScore: -1,
      };
      entry.scores.push(rev.score);
      if (rev.score > entry.highestScore) {
        entry.highestScore = rev.score;
        entry.highestTitle = rev.gameTitle;
      }
      byAuthor.set(rev.authorId, entry);
    }

    return Array.from(byAuthor.values())
      .map((item) => {
        const count = item.scores.length;
        const avg =
          count > 0
            ? Math.round(item.scores.reduce((a, b) => a + b, 0) / count)
            : null;
        return {
          ...item,
          reviewCount: count,
          averageGiven: avg,
        };
      })
      .sort((a, b) => b.reviewCount - a.reviewCount);
  }, [members, reviews]);

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-12">
      <div className="border-b border-[#232723] pb-6">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#4ADE80]">
          Pontuação média exclusiva dos Cobras
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#F2F2EE] mt-1">
          Ranking &amp; Estatísticas
        </h1>
        <p className="text-sm text-[#90968C] mt-1.5 max-w-2xl">
          Classificação balanceada pela nota média e pelo volume de avaliações do grupo,
          evitando que um jogo com apenas 1 nota supere títulos aclamados por vários Cobras.
        </p>
      </div>

      {/* Main Ranking Table */}
      <section aria-label="Melhores jogos segundo o grupo" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
            Classificação Geral (Top Jogos)
          </h2>
          <p className="text-xs text-[#787D75]">
            Ordenado pelo índice ponderado (média + peso do número de avaliações)
          </p>
        </div>

        {rankedGames.length === 0 ? (
          <div className="border border-[#262A26] bg-[#141614] p-10 text-center">
            <p className="text-sm text-[#90968C]">
              Nenhum jogo recebeu avaliações ainda. Publique a primeira crítica para inaugurar
              o ranking do grupo.
            </p>
          </div>
        ) : (
          <div className="bg-[#141614] border border-[#262A26] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262A26] text-xs font-mono text-[#8C9288]">
                  <th className="py-3.5 px-4 font-medium w-14">#</th>
                  <th className="py-3.5 px-4 font-medium">Jogo</th>
                  <th className="py-3.5 px-4 font-medium hidden md:table-cell">
                    Lançamento
                  </th>
                  <th className="py-3.5 px-4 font-medium hidden sm:table-cell">
                    Avaliações
                  </th>
                  <th className="py-3.5 px-4 font-medium hidden lg:table-cell">
                    Faixa
                  </th>
                  <th
                    className="py-3.5 px-4 font-medium text-right hidden md:table-cell"
                    title="Pontuação ponderada combinando nota média e quantidade de avaliações"
                  >
                    Índice
                  </th>
                  <th className="py-3.5 px-4 font-medium text-right">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202420] text-sm">
                {rankedGames.map((game, index) => {
                  const meta = getScoreMeta(game.averageScore);
                  return (
                    <tr
                      key={game.id}
                      onClick={() => onSelectGame(game.id)}
                      className="hover:bg-[#1A1D1A] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-[#8C9288] tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-serif text-base font-medium text-[#F2F2EE]">
                          {game.title}
                        </p>
                        <p className="text-xs text-[#8C9288] mt-0.5">
                          {game.developer} · {game.platforms.slice(0, 3).join(' / ')}
                        </p>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-[#8C9288] tabular-nums hidden md:table-cell whitespace-nowrap">
                        {formatReleaseDate(game.releaseDate)}
                      </td>
                      <td className="py-4 px-4 text-xs text-[#A8ACA5] tabular-nums hidden sm:table-cell whitespace-nowrap">
                        {game.reviewCount}{' '}
                        {game.reviewCount === 1 ? 'avaliação' : 'avaliações'} ·{' '}
                        <span className={meta.accentTextClass}>{meta.shortLabel}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-[#8C9288] tabular-nums hidden lg:table-cell whitespace-nowrap">
                        {game.minScore}–{game.maxScore}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-[#A8ACA5] tabular-nums hidden md:table-cell whitespace-nowrap">
                        {game.weightedScore !== null ? game.weightedScore.toFixed(1) : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex justify-end">
                          <ScoreBadge score={game.averageScore} size="sm" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Divisive Games & Group Critics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section aria-label="Jogos mais polêmicos" className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
              Mais Polêmicos
            </h2>
            <p className="text-xs text-[#8C9288] mt-1">
              Jogos com maior divergência de notas entre os Cobras.
            </p>
          </div>

          {divisiveGames.length === 0 ? (
            <div className="border border-[#262A26] bg-[#141614] p-6 text-xs text-[#8C9288] leading-relaxed">
              Quando um jogo receber duas ou mais notas diferentes entre amigos, a maior
              divergência de opiniões aparecerá aqui.
            </div>
          ) : (
            <div className="bg-[#141614] border border-[#262A26] divide-y divide-[#202420]">
              {divisiveGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onSelectGame(game.id)}
                  className="w-full text-left p-5 hover:bg-[#1A1D1A] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-base font-medium text-[#F2F2EE] truncate">
                      {game.title}
                    </p>
                    <p className="text-xs text-[#8C9288] mt-1 font-mono tabular-nums">
                      Menor: {game.minScore} · Maior: {game.maxScore} · Desvio:{' '}
                      {game.stdDev.toFixed(1)}
                    </p>
                  </div>
                  <ScoreBadge score={game.averageScore} size="sm" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Críticos do grupo" className="lg:col-span-7 space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
              Críticos dos Cobras
            </h2>
            <p className="text-xs text-[#8C9288] mt-1">
              Média histórica das notas dadas por cada membro.
            </p>
          </div>

          <div className="bg-[#141614] border border-[#262A26] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262A26] text-xs font-mono text-[#8C9288]">
                  <th className="py-3 px-4 font-medium">Integrante</th>
                  <th className="py-3 px-4 font-medium">Críticas</th>
                  <th className="py-3 px-4 font-medium hidden sm:table-cell">
                    Maior nota
                  </th>
                  <th className="py-3 px-4 font-medium text-right">Média dada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202420] text-sm">
                {criticStats.map((critic) => (
                  <tr
                    key={critic.uid}
                    onClick={() => onSelectMember(critic.uid)}
                    className="hover:bg-[#1A1D1A] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-medium text-[#F2F2EE]">
                      {critic.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#A8ACA5] tabular-nums">
                      {critic.reviewCount}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#8C9288] hidden sm:table-cell truncate max-w-[200px]">
                      {critic.highestScore >= 0
                        ? `${critic.highestTitle} (${critic.highestScore})`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#F2F2EE] tabular-nums">
                      {critic.averageGiven !== null ? critic.averageGiven : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
