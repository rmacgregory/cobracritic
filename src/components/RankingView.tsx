import { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, Calculator, HelpCircle, Scale, Trophy, X } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { BAYESIAN_WEIGHT_PRIOR, formatReleaseDate, getScoreMeta } from '../types';
import { RetroEasterEggSlot } from './RetroEasterEggs';
import { ScoreBadge } from './ScoreBadge';

interface RankingViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectMember: (memberUid: string) => void;
}

export function RankingView({ onSelectGame, onSelectMember }: RankingViewProps) {
  const { user, gamesWithStats, reviews, members } = useVeredito();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!showHowItWorks) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowHowItWorks(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHowItWorks]);

  const priorBaseScore = useMemo(() => {
    if (reviews.length === 0) return 75;
    const globalMean =
      reviews.reduce((sum, rev) => sum + rev.score, 0) / reviews.length;
    return Math.min(globalMean, 75);
  }, [reviews]);

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
        <p className="text-xs font-medium text-[#4ADE80]">
          Pontuação média exclusiva dos Cobras
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE] mt-1">
          Ranking &amp; Estatísticas
        </h1>
        <p className="text-sm text-[#90968C] mt-1.5 max-w-2xl">
          Classificação balanceada pela nota média e pelo volume de avaliações do grupo,
          evitando que um jogo com apenas 1 nota supere títulos aclamados por vários Cobras.
        </p>
      </div>

      {/* Main Ranking Table */}
      <section aria-label="Melhores jogos segundo o grupo" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#F2F2EE]">
              Classificação Geral (Top Jogos)
            </h2>
            <p className="text-xs text-[#787D75] mt-1">
              Ordenado pelo índice ponderado (média + peso do número de avaliações)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#D8DCD5] bg-[#181B18] border border-[#2C322C] hover:bg-[#202420] hover:border-[#3E473E] hover:text-[#F2F2EE] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#4ADE80]" />
            Como funciona o ranking?
          </button>
        </div>

        {rankedGames.length === 0 ? (
          <div className="border border-[#262A26] bg-[#141614] p-10 text-center">
            <p className="text-sm text-[#90968C]">
              Nenhum jogo recebeu avaliações ainda. Publique a primeira crítica para inaugurar
              o ranking do grupo.
            </p>
          </div>
        ) : (
          <div className="relative bg-[#141614] border border-[#262A26] overflow-x-auto">
            <RetroEasterEggSlot slot="ranking-table" mode="corner" />
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
        <section
          aria-label="Jogos mais polêmicos"
          className={`${user ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}
        >
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
            <div className="relative bg-[#141614] border border-[#262A26] divide-y divide-[#202420]">
              <RetroEasterEggSlot slot="ranking-divisive" mode="corner" />
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

        {user && (
          <section aria-label="Críticos do grupo" className="lg:col-span-7 space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#F2F2EE]">
                Críticos dos Cobras
              </h2>
              <p className="text-xs text-[#8C9288] mt-1">
                Média histórica das notas dadas por cada membro.
              </p>
            </div>

            <div className="relative bg-[#141614] border border-[#262A26] overflow-x-auto">
              <RetroEasterEggSlot slot="ranking-critics" mode="corner" />
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
        )}
      </div>

      <div className="relative h-5">
        <RetroEasterEggSlot slot="ranking" mode="corner" cornerOverride="br" />
      </div>

      {showHowItWorks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranking-explanation-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="bg-[#141614] border border-[#2A2F2A] w-full max-w-2xl max-h-[92vh] overflow-y-auto my-auto text-[#F2F2EE]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-[#141614] border-b border-[#232723] px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#142018] border border-[#244A31] flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-[#4ADE80]" />
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80]">
                    Critério do Top Jogos
                  </p>
                  <h3
                    id="ranking-explanation-title"
                    className="font-display text-xl font-semibold text-[#F2F2EE] mt-0.5"
                  >
                    Como funciona o Ranking do CobraCritic?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                aria-label="Fechar janela de explicação"
                className="p-2 text-[#8C9288] hover:text-[#F2F2EE] hover:bg-[#1E221E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 text-sm text-[#C7CBC4] leading-relaxed">
              <p className="text-[#D8DCD5] bg-[#181B18] border border-[#252A25] p-4">
                Se o ranking olhasse apenas para a <strong className="text-[#F2F2EE]">Média simples</strong>, um jogo
                que só 1 pessoa jogou e deu nota <span className="font-mono text-[#F2F2EE]">95</span> ficaria
                acima de um jogo que 6 Cobras jogaram e teve média{' '}
                <span className="font-mono text-[#F2F2EE]">93</span>. Para evitar essa distorção, o ranking
                ordena os jogos pelo <strong className="text-[#4ADE80]">Índice (Média Ponderada)</strong> e
                não só pela nota média bruta.
              </p>

              <div className="space-y-2.5">
                <h4 className="font-serif text-base font-medium text-[#F2F2EE] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  A regra na prática
                </h4>
                <p>
                  Todo jogo começa com um <strong className="text-[#F2F2EE]">&ldquo;peso base&rdquo;</strong> de{' '}
                  <strong className="text-[#F2F2EE]">{BAYESIAN_WEIGHT_PRIOR} avaliações neutras</strong> (nota{' '}
                  <span className="font-mono text-[#F2F2EE]">75</span>).
                </p>
                <div className="space-y-2 pt-1">
                  <div className="bg-[#181B18] border-l-2 border-[#787D75] px-4 py-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-[#F2F2EE] mb-1">
                      Poucas avaliações (1 ou 2 críticas)
                    </p>
                    <p className="text-xs sm:text-sm text-[#A8ACA5]">
                      Como ainda há poucas opiniões do grupo, o Índice puxa a nota do jogo levemente em
                      direção a <span className="font-mono text-[#F2F2EE]">75</span> (por segurança).
                    </p>
                  </div>
                  <div className="bg-[#142018] border-l-2 border-[#4ADE80] px-4 py-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-[#4ADE80] mb-1">
                      Muitas avaliações (3, 4, 5+ críticas)
                    </p>
                    <p className="text-xs sm:text-sm text-[#C7CBC4]">
                      Quanto mais Cobras avaliam o jogo, mais o &ldquo;peso neutro&rdquo; desaparece e o
                      Índice se aproxima da Média real que o grupo deu.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-serif text-base font-medium text-[#F2F2EE] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  Exemplo prático
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#191C19] border border-[#262B26] p-4 space-y-1.5">
                    <p className="text-xs font-mono text-[#8C9288]">
                      JOGO A · 1 AVALIAÇÃO COM NOTA 95
                    </p>
                    <p className="text-sm text-[#D8DCD5]">
                      Média = <span className="font-mono font-semibold text-[#F2F2EE]">95</span>, mas o Índice ={' '}
                      <span className="font-mono font-semibold text-[#F2F2EE]">80.0</span>
                    </p>
                    <p className="text-xs text-[#787D75]">(porque só 1 pessoa avaliou)</p>
                  </div>
                  <div className="bg-[#142018] border border-[#244A31] p-4 space-y-1.5">
                    <p className="text-xs font-mono text-[#4ADE80]">
                      JOGO B · 5 AVALIAÇÕES COM MÉDIA 90
                    </p>
                    <p className="text-sm text-[#E5E8E3]">
                      Média = <span className="font-mono font-semibold text-[#F2F2EE]">90</span>, e o Índice ={' '}
                      <span className="font-mono font-semibold text-[#4ADE80]">84.4</span>
                    </p>
                    <p className="text-xs text-[#94A899]">(consenso real do grupo)</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#D8DCD5] bg-[#181B18] border border-[#252A25] px-4 py-3">
                  <strong className="text-[#4ADE80]">Resultado:</strong> O Jogo B fica na frente no Ranking
                  porque foi aclamado por vários membros, mesmo tendo média bruta 90 contra 95.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-base font-medium text-[#F2F2EE] flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  Como a fórmula calcula o Índice
                </h4>
                <div className="bg-[#101210] border border-[#232723] p-4 space-y-2">
                  <p className="font-mono text-xs sm:text-sm text-[#F2F2EE] break-words">
                    Índice = ((Nº de avaliações × Média do jogo) + ({BAYESIAN_WEIGHT_PRIOR} × Base)) ÷ (Nº de
                    avaliações + {BAYESIAN_WEIGHT_PRIOR})
                  </p>
                  <p className="text-xs text-[#8C9288]">
                    Atualmente, Base ={' '}
                    <span className="font-mono text-[#4ADE80]">{priorBaseScore.toFixed(1)}</span> (mínimo
                    entre 75 e a média global das críticas do grupo).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-base font-medium text-[#F2F2EE] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  Critérios de desempate
                </h4>
                <p className="text-xs sm:text-sm text-[#A8ACA5]">
                  Se dois jogos tiverem exatamente o mesmo Índice, fica na frente:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[#C7CBC4]">
                  <li>
                    O jogo com <strong className="text-[#F2F2EE] font-medium">maior número de avaliações</strong>;
                  </li>
                  <li>
                    Persistindo o empate, o que tiver a{' '}
                    <strong className="text-[#F2F2EE] font-medium">maior Média simples</strong>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="border-t border-[#232723] px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="px-4 py-2 text-xs font-medium bg-[#4ADE80] text-[#0D130E] hover:bg-[#38C96D] transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
