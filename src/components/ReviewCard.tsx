import React, { useState } from 'react';
import { MessageSquare, Pencil, Send, ThumbsUp, Trash2 } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  LIMITS,
  formatTimestamp,
  getScoreMeta,
  type Game,
  type Review,
} from '../types';
import { GameCover } from './GameCover';
import { ScoreBadge } from './ScoreBadge';

interface ReviewCardProps {
  review: Review;
  game?: Game | null;
  showGameHeader?: boolean;
  defaultCommentsOpen?: boolean;
  onSelectGame?: (gameId: string) => void;
  onSelectAuthor?: (authorUid: string) => void;
  onEditReview?: (review: Review) => void;
}

export function ReviewCard({
  review,
  game,
  showGameHeader = false,
  defaultCommentsOpen = true,
  onSelectGame,
  onSelectAuthor,
  onEditReview,
}: ReviewCardProps) {
  const {
    user,
    isAdmin,
    adminUids,
    membersById,
    commentsByReview,
    reactionsByReview,
    addComment,
    deleteComment,
    deleteReview,
    toggleReaction,
  } = useVeredito();

  const comments = commentsByReview[review.id] || [];
  const reactions = reactionsByReview[review.id] || [];
  const hasAgreed = Boolean(user && reactions.some((r) => r.userId === user.uid));
  const canModifyReview = Boolean(
    user && (review.authorId === user.uid || isAdmin),
  );

  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);

  const displayTitle = game?.title || review.gameTitle;
  const displayCover = game?.coverUrl ?? review.gameCoverUrl;
  const liveAuthor = membersById[review.authorId];
  const resolvedAuthorName = liveAuthor?.displayName || review.authorName;
  const resolvedAuthorPhoto = liveAuthor?.photoURL || review.authorPhotoURL;
  const scoreMeta = getScoreMeta(review.score);

  const initials = resolvedAuthorName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addComment(review.id, review.gameId, commentText.trim());
      setCommentText('');
      setCommentsOpen(true);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleAgree = async () => {
    if (togglingReaction) return;
    setTogglingReaction(true);
    try {
      await toggleReaction(review.id);
    } finally {
      setTogglingReaction(false);
    }
  };

  return (
    <article className="bg-[#141614] border border-[#262A26] p-6 space-y-5">
      {/* Optional game context bar for Social Feed */}
      {showGameHeader && (
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#222622]">
          <button
            type="button"
            onClick={() => onSelectGame?.(review.gameId)}
            className="flex items-center gap-3.5 text-left group min-w-0 cursor-pointer"
          >
            <div className="w-11 shrink-0">
              <GameCover title={displayTitle} coverUrl={displayCover} compact />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-base font-semibold text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors truncate">
                {displayTitle}
              </p>
              <p className="text-xs text-[#8C9288] mt-0.5 truncate">
                {game ? `${game.developer} · ${game.releaseYear}` : 'Ver ficha do jogo'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`hidden sm:inline text-xs font-medium ${scoreMeta.accentTextClass}`}>
              {scoreMeta.shortLabel}
            </span>
            <ScoreBadge score={review.score} size="md" />
          </div>
        </div>
      )}

      {/* Reviewer header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {resolvedAuthorPhoto ? (
            <img
              src={resolvedAuthorPhoto}
              alt={resolvedAuthorName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-[#2C312C] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#222622] text-[#F2F2EE] text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {onSelectAuthor ? (
                <button
                  type="button"
                  onClick={() => onSelectAuthor(review.authorId)}
                  className="text-sm font-semibold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors truncate block cursor-pointer"
                >
                  {resolvedAuthorName}
                </button>
              ) : (
                <p className="text-sm font-semibold text-[#F2F2EE] truncate">
                  {resolvedAuthorName}
                </p>
              )}
              {adminUids.has(review.authorId) && (
                <span className="text-[10px] font-mono text-[#4ADE80] shrink-0">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-[#8C9288] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span>{formatTimestamp(review.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{review.platformPlayed}</span>
              {review.hoursPlayed > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{review.hoursPlayed}h jogadas</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!showGameHeader && (
            <div className="flex items-center gap-2.5">
              <span className={`hidden sm:inline text-xs font-medium ${scoreMeta.accentTextClass}`}>
                {scoreMeta.shortLabel}
              </span>
              <ScoreBadge score={review.score} size="md" />
            </div>
          )}
          {canModifyReview && (
            <div className="flex items-center gap-1">
              {onEditReview && review.authorId === user?.uid && (
                <button
                  type="button"
                  onClick={() => onEditReview(review)}
                  aria-label="Editar crítica"
                  className="p-2 text-[#8C9288] hover:text-[#F2F2EE] transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {confirmDeleteReview ? (
                <div className="inline-flex items-center gap-1.5 text-xs pl-1">
                  <button
                    type="button"
                    onClick={() => deleteReview(review.id)}
                    className="px-2 py-1 bg-[#B91C1C] text-white rounded font-medium cursor-pointer"
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteReview(false)}
                    className="text-[#8C9288] hover:text-[#F2F2EE] cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteReview(true)}
                  aria-label="Excluir crítica"
                  className="p-2 text-[#8C9288] hover:text-[#F87171] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Critique content */}
      <div className="space-y-2.5 max-w-prose">
        <h3 className="font-serif text-xl font-medium text-[#F2F2EE] leading-snug">
          {review.headline}
        </h3>
        <p className="text-[15px] text-[#C8CBC4] leading-[1.7] whitespace-pre-line">
          {review.body}
        </p>
      </div>

      {/* Actions footer */}
      <div className="pt-3 border-t border-[#222622] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleToggleAgree}
            disabled={togglingReaction}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
              hasAgreed
                ? 'text-[#4ADE80]'
                : 'text-[#90968C] hover:text-[#F2F2EE]'
            }`}
          >
            <ThumbsUp
              className="w-4 h-4"
              fill={hasAgreed ? 'currentColor' : 'none'}
              strokeWidth={1.75}
            />
            <span className="tabular-nums">
              {hasAgreed ? 'Concordou' : 'Concordar'}
              {reactions.length > 0 ? ` (${reactions.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#90968C] hover:text-[#F2F2EE] transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
            <span className="tabular-nums">
              {comments.length === 0
                ? 'Comentar'
                : comments.length === 1
                  ? '1 comentário'
                  : `${comments.length} comentários`}
            </span>
          </button>
        </div>

        {reactions.length > 0 && (
          <p className="text-xs text-[#787D75] truncate max-w-xs">
            Concordaram: {reactions.map((r) => r.userName.split(' ')[0]).join(', ')}
          </p>
        )}
      </div>

      {/* Social Comments Thread */}
      {commentsOpen && (
        <div className="pt-4 border-t border-[#222622] space-y-4">
          {comments.length > 0 && (
            <ul className="space-y-3">
              {comments.map((comment) => {
                const canDeleteComment = Boolean(
                  user && (comment.authorId === user.uid || isAdmin),
                );
                return (
                  <li
                    key={comment.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-[#8C9288]">
                        {onSelectAuthor ? (
                          <button
                            type="button"
                            onClick={() => onSelectAuthor(comment.authorId)}
                            className="font-semibold text-[#F2F2EE] hover:text-[#4ADE80] cursor-pointer"
                          >
                            {comment.authorName}
                          </button>
                        ) : (
                          <span className="font-semibold text-[#F2F2EE]">
                            {comment.authorName}
                          </span>
                        )}
                        <span aria-hidden="true"> · </span>
                        <span>{formatTimestamp(comment.createdAt)}</span>
                      </p>
                      <p className="text-sm text-[#C8CBC4] leading-relaxed break-words">
                        {comment.body}
                      </p>
                    </div>
                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        aria-label="Remover comentário"
                        className="p-1 text-[#787D75] hover:text-[#F87171] transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              maxLength={LIMITS.COMMENT_BODY_MAX}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário sobre esta crítica..."
              aria-label="Adicionar comentário"
              className="flex-1 px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
