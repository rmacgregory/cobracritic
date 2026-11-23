import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  MessageSquare,
  Pencil,
  Send,
  Star,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  LIMITS,
  formatTimestamp,
  getScoreMeta,
  type Game,
  type Review,
  type ReviewComment,
} from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
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
  const [replyingTo, setReplyingTo] = useState<{
    rootCommentId: string;
    targetAuthorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [togglingReaction, setTogglingReaction] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (replyingTo) {
      replyInputRef.current?.focus();
    }
  }, [replyingTo]);

  const { rootComments, repliesByRootId } = useMemo(() => {
    const byId = new Map<string, ReviewComment>();
    for (const c of comments) {
      byId.set(c.id, c);
    }

    const roots: ReviewComment[] = [];
    const repliesMap = new Map<string, ReviewComment[]>();

    for (const c of comments) {
      if (!c.parentCommentId || !byId.has(c.parentCommentId)) {
        // Root comment (or orphaned reply whose parent was deleted)
        roots.push(c);
        continue;
      }

      // Walk up to top-level root so discussions stay cleanly grouped under the parent comment
      let rootId = c.parentCommentId;
      const visited = new Set<string>([c.id]);
      while (rootId && byId.has(rootId) && !visited.has(rootId)) {
        visited.add(rootId);
        const parent = byId.get(rootId);
        if (parent?.parentCommentId && byId.has(parent.parentCommentId)) {
          rootId = parent.parentCommentId;
        } else {
          break;
        }
      }

      const bucket = repliesMap.get(rootId) || [];
      bucket.push(c);
      repliesMap.set(rootId, bucket);
    }

    return { rootComments: roots, repliesByRootId: repliesMap };
  }, [comments]);

  const displayTitle = game?.title || review.gameTitle;
  const displayCover = game?.coverUrl ?? review.gameCoverUrl;
  const liveAuthor = membersById[review.authorId];
  const resolvedAuthorName = liveAuthor?.displayName || review.authorName;
  const resolvedAuthorPrimaryPhoto =
    liveAuthor?.photoURL ||
    (review.authorId === user?.uid ? user?.photoURL || '' : '');
  const resolvedAuthorFallbackPhoto = review.authorPhotoURL || '';
  const scoreMeta = getScoreMeta(review.score);
  const isRatingOnly = Boolean(
    review.ratingOnly || (!review.headline.trim() && !review.body.trim()),
  );

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

  const handleOpenReply = (rootCommentId: string, targetAuthorName: string) => {
    setCommentsOpen(true);
    setCollapsedThreads((prev) => ({ ...prev, [rootCommentId]: false }));
    setReplyingTo({ rootCommentId, targetAuthorName });
    setReplyText('');
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      await addComment(review.id, review.gameId, replyText.trim(), {
        parentCommentId: replyingTo.rootCommentId,
        replyToAuthorName: replyingTo.targetAuthorName,
      });
      setReplyText('');
      setReplyingTo(null);
      setCollapsedThreads((prev) => ({ ...prev, [replyingTo.rootCommentId]: false }));
    } finally {
      setSubmittingReply(false);
    }
  };

  const toggleThreadCollapse = (rootCommentId: string) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [rootCommentId]: !prev[rootCommentId],
    }));
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
              <p className="font-display text-base font-semibold text-[#F2F2EE] group-hover:text-[#4ADE80] transition-colors truncate">
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
          <MemberAvatar
            name={resolvedAuthorName}
            primarySrc={resolvedAuthorPrimaryPhoto}
            fallbackSrc={resolvedAuthorFallbackPhoto}
            size="md"
          />
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

      {/* Critique content or Rating-only notice */}
      {isRatingOnly ? (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0F120F] border border-[#232923] text-xs text-[#A8ACA5]">
          <Star className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
          <span>
            <strong className="text-[#F2F2EE] font-medium">{resolvedAuthorName}</strong>{' '}
            optou apenas por dar nota ao jogo.
          </span>
        </div>
      ) : (
        <div className="space-y-2.5 max-w-prose">
          <h3 className="font-display text-xl font-semibold text-[#F2F2EE] leading-snug">
            {review.headline}
          </h3>
          <p className="text-[15px] text-[#C8CBC4] leading-[1.7] whitespace-pre-line">
            {review.body}
          </p>
        </div>
      )}

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
          {rootComments.length > 0 && (
            <ul className="space-y-4">
              {rootComments.map((comment) => {
                const replies = repliesByRootId.get(comment.id) || [];
                const isCollapsed = Boolean(collapsedThreads[comment.id]);
                const isReplyingHere = replyingTo?.rootCommentId === comment.id;

                const renderCommentRow = (
                  item: ReviewComment,
                  rootCommentId: string,
                  isNested: boolean,
                ) => {
                  const canDeleteComment = Boolean(
                    user && (item.authorId === user.uid || isAdmin),
                  );
                  const liveCommenter = membersById[item.authorId];
                  const commentAuthorName =
                    liveCommenter?.displayName || item.authorName;
                  const commentPrimaryPhoto =
                    liveCommenter?.photoURL ||
                    (item.authorId === user?.uid ? user?.photoURL || '' : '');
                  const commentFallbackPhoto = item.authorPhotoURL || '';
                  const showReplyTarget = Boolean(
                    item.replyToAuthorName && (isNested || item.parentCommentId),
                  );

                  const avatarNode = (
                    <MemberAvatar
                      name={commentAuthorName}
                      primarySrc={commentPrimaryPhoto}
                      fallbackSrc={commentFallbackPhoto}
                      size="xs"
                    />
                  );

                  return (
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {onSelectAuthor ? (
                          <button
                            type="button"
                            onClick={() => onSelectAuthor(item.authorId)}
                            aria-label={`Ver perfil de ${commentAuthorName}`}
                            className="mt-0.5 shrink-0 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            {avatarNode}
                          </button>
                        ) : (
                          <div className="mt-0.5 shrink-0">{avatarNode}</div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs text-[#8C9288] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {onSelectAuthor ? (
                              <button
                                type="button"
                                onClick={() => onSelectAuthor(item.authorId)}
                                className="font-semibold text-[#F2F2EE] hover:text-[#4ADE80] transition-colors cursor-pointer"
                              >
                                {commentAuthorName}
                              </button>
                            ) : (
                              <span className="font-semibold text-[#F2F2EE]">
                                {commentAuthorName}
                              </span>
                            )}
                            {showReplyTarget && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#7F9A86]">
                                <CornerDownRight className="w-3 h-3 shrink-0" />
                                <span>{item.replyToAuthorName}</span>
                              </span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{formatTimestamp(item.createdAt)}</span>
                          </p>
                          <p className="text-sm text-[#C8CBC4] leading-relaxed break-words">
                            {item.body}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-0.5">
                            {user && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenReply(rootCommentId, commentAuthorName)
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8C9288] hover:text-[#4ADE80] transition-colors cursor-pointer"
                              >
                                <CornerDownRight className="w-3 h-3" />
                                <span>Responder</span>
                              </button>
                            )}
                            {!isNested && replies.length >= 2 && (
                              <button
                                type="button"
                                onClick={() => toggleThreadCollapse(comment.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#787D75] hover:text-[#F2F2EE] transition-colors cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span className="tabular-nums">
                                  {isCollapsed
                                    ? `Ver ${replies.length} respostas`
                                    : `Ocultar ${replies.length} respostas`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {canDeleteComment && (
                        <button
                          type="button"
                          onClick={() => deleteComment(item.id)}
                          aria-label="Remover comentário"
                          className="p-1 text-[#787D75] hover:text-[#F87171] transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                };

                return (
                  <li key={comment.id} className="space-y-2.5">
                    {renderCommentRow(comment, comment.id, false)}

                    {/* Nested replies thread under parent comment */}
                    {replies.length > 0 && !isCollapsed && (
                      <ul className="ml-6 sm:ml-7 pl-3.5 border-l border-[#262D26] space-y-3 pt-0.5">
                        {replies.map((reply) => (
                          <li key={reply.id}>
                            {renderCommentRow(reply, comment.id, true)}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Inline reply composer anchored to this parent thread */}
                    {isReplyingHere && replyingTo && (
                      <div className="ml-6 sm:ml-7 pl-3.5 border-l border-[#2C4A34] space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#8C9288]">
                          <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                            <CornerDownRight className="w-3 h-3 text-[#4ADE80] shrink-0" />
                            <span className="truncate">
                              Respondendo a{' '}
                              <strong className="text-[#F2F2EE] font-medium">
                                {replyingTo.targetAuthorName}
                              </strong>
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            aria-label="Cancelar resposta"
                            className="inline-flex items-center gap-1 text-[#787D75] hover:text-[#F2F2EE] transition-colors shrink-0 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancelar</span>
                          </button>
                        </div>

                        <form
                          onSubmit={handleReplySubmit}
                          className="flex items-center gap-2"
                        >
                          <input
                            ref={replyInputRef}
                            type="text"
                            maxLength={LIMITS.COMMENT_BODY_MAX}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setReplyingTo(null);
                                setReplyText('');
                              }
                            }}
                            placeholder={`Responder a ${replyingTo.targetAuthorName}...`}
                            aria-label={`Responder a ${replyingTo.targetAuthorName}`}
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-[#0C0D0C] border border-[#2C4A34] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                          />
                          <button
                            type="submit"
                            disabled={!replyText.trim() || submittingReply}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Responder</span>
                          </button>
                        </form>
                      </div>
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
