import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { formatTimestamp, type GameWithStats, type Review } from '../types';
import { ReviewCard } from './ReviewCard';

interface SocialFeedViewProps {
  onSelectGame: (gameId: string) => void;
  onSelectAuthor: (authorUid: string) => void;
  onEditReview: (game: GameWithStats, review: Review) => void;
  onGoToCatalog: () => void;
}

type SentimentFilter = 'all' | 'positive' | 'mixed' | 'negative';

export function SocialFeedView({
  onSelectGame,
  onSelectAuthor,
  onEditReview,
  onGoToCatalog,
}: SocialFeedViewProps) {
  const { gamesWithStats, reviews, comments, members } = useVeredito();

  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [search, setSearch] = useState('');

  const gamesById = useMemo(() => {
    const map = new Map<string, GameWithStats>();
    for (const g of gamesWithStats) map.set(g.id, g);
    return map;
  }, [gamesWithStats]);

  const reviewsById = useMemo(() => {
    const map = new Map<string, Review>();
    for (const r of reviews) map.set(r.id, r);
    return map;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((rev) => {
      if (selectedAuthor !== 'all' && rev.authorId !== selectedAuthor) {
        return false;
      }
      if (sentiment === 'positive' && rev.score < 75) return false;
      if (sentiment === 'mixed' && (rev.score < 50 || rev.score >= 75)) return false;
      if (sentiment === 'negative' && rev.score >= 50) return false;

      if (q) {
        const game = gamesById.get(rev.gameId);
        const title = (game?.title || rev.gameTitle).toLowerCase();
        const inTitle = title.includes(q);
        const inHeadline = rev.headline.toLowerCase().includes(q);
        const inBody = rev.body.toLowerCase().includes(q);
        const inAuthor = rev.authorName.toLowerCase().includes(q);
        if (!inTitle && !inHeadline && !inBody && !inAuthor) return false;
      }
      return true;
    });
  }, [reviews, selectedAuthor, sentiment, search, gamesById]);

  const recentComments = useMemo(() => {
    return [...comments].reverse().slice(0, 8);
  }, [comments]);

  const groupAverage = useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / reviews.length);
  }, [reviews]);

  return (
    <main className="max-w-[1140px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="border-b border-[#232723] pb-6">
        <p className="text-xs font-medium text-[#4ADE80]">
          Conversas em tempo real
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F2EE] mt-1">
          Feed Social dos Cobras
        </h1>
        <p className="text-sm text-[#90968C] mt-1.5 max-w-2xl">
          Acompanhe as análises recém-publicadas, concorde com os vereditos e comente
          diretamente nas críticas dos amigos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Review Stream */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#141614] border border-[#262A26] p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#787D75] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por jogo, membro ou trecho..."
                aria-label="Buscar no feed"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#787D75] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              aria-label="Filtrar por membro"
              className="px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="all">Todos os membros</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName}
                </option>
              ))}
            </select>

            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as SentimentFilter)}
              aria-label="Filtrar por faixa de nota"
              className="px-3 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="all">Todas as notas</option>
              <option value="positive">Favoráveis (75–100)</option>
              <option value="mixed">Mistas (50–74)</option>
              <option value="negative">Desfavoráveis (0–49)</option>
            </select>
          </div>

          {reviews.length === 0 ? (
            <div className="border border-[#262A26] bg-[#141614] px-8 py-14 text-center space-y-4">
              <p className="font-serif text-2xl text-[#F2F2EE]">
                O feed ainda está silencioso
              </p>
              <p className="text-sm text-[#90968C] max-w-md mx-auto">
                Abra qualquer jogo no catálogo e escreva a primeira crítica para iniciar as
                discussões do grupo.
              </p>
              <button
                type="button"
                onClick={onGoToCatalog}
                className="px-5 py-2.5 text-sm font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white transition-colors cursor-pointer"
              >
                Ir para o catálogo
              </button>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="border border-[#262A26] bg-[#141614] px-8 py-12 text-center space-y-3">
              <p className="font-serif text-xl text-[#F2F2EE]">
                Nenhuma crítica encontrada com esses filtros
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedAuthor('all');
                  setSentiment('all');
                }}
                className="text-sm font-medium text-[#4ADE80] hover:underline cursor-pointer"
              >
                Limpar filtros do feed
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReviews.map((review) => {
                const game = gamesById.get(review.gameId) || null;
                return (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    game={game}
                    showGameHeader
                    defaultCommentsOpen
                    onSelectGame={onSelectGame}
                    onSelectAuthor={onSelectAuthor}
                    onEditReview={
                      game ? (rev) => onEditReview(game, rev) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#141614] border border-[#262A26] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F2F2EE]">
              Pulso dos Cobras
            </h2>
            <dl className="grid grid-cols-2 gap-4 pt-2 border-t border-[#222622]">
              <div>
                <dt className="text-xs text-[#8C9288]">Jogos</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {gamesWithStats.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Críticas</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {reviews.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Comentários</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {comments.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8C9288]">Média geral</dt>
                <dd className="font-mono text-2xl font-semibold text-[#F2F2EE] tabular-nums mt-0.5">
                  {groupAverage !== null ? groupAverage : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#141614] border border-[#262A26] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#F2F2EE]">
              Comentários Recentes
            </h2>
            {recentComments.length === 0 ? (
              <p className="text-xs text-[#8C9288] leading-relaxed">
                Quando os Cobras comentarem nas críticas uns dos outros, as últimas mensagens
                aparecerão aqui.
              </p>
            ) : (
              <ul className="divide-y divide-[#222622]">
                {recentComments.map((cmt) => {
                  const parentReview = reviewsById.get(cmt.reviewId);
                  const game = gamesById.get(cmt.gameId);
                  return (
                    <li key={cmt.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <p className="text-xs text-[#8C9288]">
                        <button
                          type="button"
                          onClick={() => onSelectAuthor(cmt.authorId)}
                          className="font-semibold text-[#F2F2EE] hover:text-[#4ADE80] cursor-pointer"
                        >
                          {cmt.authorName}
                        </button>
                        {' em '}
                        <button
                          type="button"
                          onClick={() => onSelectGame(cmt.gameId)}
                          className="font-medium text-[#4ADE80] hover:underline cursor-pointer"
                        >
                          {game?.title || parentReview?.gameTitle || 'Jogo'}
                        </button>
                      </p>
                      <p className="text-xs text-[#C8CBC4] line-clamp-2 leading-relaxed">
                        “{cmt.body}”
                      </p>
                      <p className="text-[11px] text-[#787D75]">
                        {formatTimestamp(cmt.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
