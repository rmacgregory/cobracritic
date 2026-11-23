import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Eye,
  EyeOff,
  MessageSquare,
  Pencil,
  Send,
  Share2,
  Star,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import {
  GAME_PLAY_STATUS_META,
  LIMITS,
  formatTimestamp,
  getScoreMeta,
  type Game,
  type Review,
  type ReviewComment,
  type UserProfile,
} from '../types';
import { GameCover } from './GameCover';
import { MemberAvatar } from './MemberAvatar';
import { ScoreBadge } from './ScoreBadge';
import { ShareCardModal } from './ShareCardModal';

function findActiveMention(
  text: string,
  cursorPos: number,
): { startIndex: number; query: string } | null {
  const beforeCursor = text.slice(0, cursorPos);
  const match = /(?:^|\s)@([^\s@]{0,30})$/.exec(beforeCursor);
  if (!match) return null;
  const atOffset = beforeCursor.lastIndexOf('@');
  if (atOffset < 0) return null;
  return { startIndex: atOffset, query: match[1] };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveMentionedUids(
  text: string,
  members: UserProfile[],
  selfUid?: string,
): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  const sorted = [...members].sort(
    (a, b) => b.displayName.length - a.displayName.length,
  );
  for (const m of sorted) {
    if (m.uid === selfUid) continue;
    const name = m.displayName.trim();
    if (!name) continue;
    const token = `@${name.toLowerCase()}`;
    if (lower.includes(token) && !matched.includes(m.uid)) {
      matched.push(m.uid);
      if (matched.length >= LIMITS.COMMENT_MENTIONS_MAX) break;
    }
  }
  return matched;
}

function renderCommentTextWithMentions(
  body: string,
  members: UserProfile[],
  onSelectAuthor?: (uid: string) => void,
): React.ReactNode {
  if (!body.includes('@') || members.length === 0) return body;

  const sorted = [...members]
    .filter((m) => m.displayName.trim().length > 0)
    .sort((a, b) => b.displayName.length - a.displayName.length);

  if (sorted.length === 0) return body;

  const byLowerName = new Map<string, UserProfile>();
  for (const m of sorted) {
    const key = m.displayName.trim().toLowerCase();
    if (!byLowerName.has(key)) byLowerName.set(key, m);
  }

  const pattern = new RegExp(
    `@(${sorted.map((m) => escapeRegExp(m.displayName.trim())).join('|')})(?=$|[\\s.,!?;:)])`,
    'gi',
  );

  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(body.slice(lastIdx, match.index));
    }
    const matchedName = match[1];
    const member = byLowerName.get(matchedName.toLowerCase());
    if (member && onSelectAuthor) {
      nodes.push(
        <button
          key={`mention-${keyIdx++}`}
          type="button"
          onClick={() => onSelectAuthor(member.uid)}
          className="text-[#4ADE80] font-medium hover:underline cursor-pointer"
        >
          @{member.displayName}
        </button>,
      );
    } else {
      nodes.push(
        <span key={`mention-${keyIdx++}`} className="text-[#4ADE80] font-medium">
          {match[0]}
        </span>,
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < body.length) {
    nodes.push(body.slice(lastIdx));
  }

  return nodes.length > 0 ? nodes : body;
}

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
    members,
    membersById,
    commentsByReview,
    reactionsByReview,
    userStatusesByGame,
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
  const [commentSpoiler, setCommentSpoiler] = useState(false);
  const [commentMention, setCommentMention] = useState<{
    startIndex: number;
    query: string;
    highlightIdx: number;
  } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    rootCommentId: string;
    targetAuthorName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [replyMention, setReplyMention] = useState<{
    startIndex: number;
    query: string;
    highlightIdx: number;
  } | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [reviewSpoilerRevealed, setReviewSpoilerRevealed] = useState(false);
  const [revealedCommentIds, setRevealedCommentIds] = useState<Record<string, boolean>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (replyingTo) {
      replyInputRef.current?.focus();
    }
  }, [replyingTo]);

  const mentionCandidates = useMemo(() => {
    return members.filter((m) => m.uid !== user?.uid);
  }, [members, user?.uid]);

  const commentMentionMatches = useMemo(() => {
    if (!commentMention) return [];
    const q = commentMention.query.toLowerCase();
    return mentionCandidates
      .filter((m) => m.displayName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [commentMention, mentionCandidates]);

  const replyMentionMatches = useMemo(() => {
    if (!replyMention) return [];
    const q = replyMention.query.toLowerCase();
    return mentionCandidates
      .filter((m) => m.displayName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [replyMention, mentionCandidates]);

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
  const authorStatusEntry = (userStatusesByGame[review.gameId] || []).find(
    (item) => item.userId === review.authorId,
  );
  const authorPlayStatus =
    authorStatusEntry && authorStatusEntry.status !== 'wishlist'
      ? authorStatusEntry.status
      : null;

  const handleInsertMention = (
    target: 'comment' | 'reply',
    member: UserProfile,
  ) => {
    const active = target === 'comment' ? commentMention : replyMention;
    const text = target === 'comment' ? commentText : replyText;
    const input = target === 'comment' ? commentInputRef.current : replyInputRef.current;
    if (!active) return;

    const cursorPos = input?.selectionStart ?? text.length;
    const before = text.slice(0, active.startIndex);
    const after = text.slice(cursorPos);
    const inserted = `@${member.displayName} `;
    const nextText = `${before}${inserted}${after}`.slice(0, LIMITS.COMMENT_BODY_MAX);

    if (target === 'comment') {
      setCommentText(nextText);
      setCommentMention(null);
    } else {
      setReplyText(nextText);
      setReplyMention(null);
    }

    const nextCaret = (before + inserted).length;
    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        input.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

  const handleCommentInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'comment' | 'reply',
  ) => {
    const val = e.target.value;
    const caret = e.target.selectionStart ?? val.length;
    const detected = findActiveMention(val, caret);
    if (target === 'comment') {
      setCommentText(val);
      setCommentMention(detected ? { ...detected, highlightIdx: 0 } : null);
    } else {
      setReplyText(val);
      setReplyMention(detected ? { ...detected, highlightIdx: 0 } : null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const trimmed = commentText.trim();
      const mentionedUserIds = resolveMentionedUids(trimmed, members, user?.uid);
      await addComment(review.id, review.gameId, trimmed, {
        hasSpoiler: commentSpoiler,
        mentionedUserIds,
      });
      setCommentText('');
      setCommentSpoiler(false);
      setCommentMention(null);
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
    setReplySpoiler(false);
    setReplyMention(null);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const trimmed = replyText.trim();
      const mentionedUserIds = resolveMentionedUids(trimmed, members, user?.uid);
      await addComment(review.id, review.gameId, trimmed, {
        parentCommentId: replyingTo.rootCommentId,
        replyToAuthorName: replyingTo.targetAuthorName,
        hasSpoiler: replySpoiler,
        mentionedUserIds,
      });
      setReplyText('');
      setReplySpoiler(false);
      setReplyMention(null);
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
            <div className="flex flex-wrap items-center gap-2 min-w-0">
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
              {authorPlayStatus && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border shrink-0 ${GAME_PLAY_STATUS_META[authorPlayStatus].activeClass}`}
                >
                  {GAME_PLAY_STATUS_META[authorPlayStatus].label}
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
      ) : review.hasSpoiler && !reviewSpoilerRevealed ? (
        <div className="bg-[#181611] border border-[#4D3D19] rounded-md p-5 space-y-3 max-w-prose">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-[#FBBF24]">
            <EyeOff className="w-3.5 h-3.5 shrink-0" />
            <span>Aviso de spoiler</span>
          </div>
          <p className="font-display text-lg font-semibold text-[#F2F2EE] leading-snug">
            {review.headline}
          </p>
          <p className="text-xs text-[#A8A394] leading-relaxed">
            {resolvedAuthorName} marcou esta crítica como contendo spoilers de história ou
            momentos-chave do jogo.
          </p>
          <button
            type="button"
            onClick={() => setReviewSpoilerRevealed(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded-md hover:bg-[#FCD34D] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Revelar crítica com spoiler</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 max-w-prose">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-[#F2F2EE] leading-snug">
              {review.headline}
            </h3>
            {review.hasSpoiler && (
              <button
                type="button"
                onClick={() => setReviewSpoilerRevealed(false)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FBBF24] hover:underline cursor-pointer"
              >
                <EyeOff className="w-3 h-3" />
                <span>Ocultar spoiler</span>
              </button>
            )}
          </div>
          <p className="text-[15px] text-[#C8CBC4] leading-[1.7] whitespace-pre-line">
            {review.body}
          </p>
        </div>
      )}

      {/* Actions footer */}
      <div className="pt-3 border-t border-[#222622] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          {user ? (
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
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#787D75]">
              <ThumbsUp className="w-4 h-4" fill="none" strokeWidth={1.75} />
              <span className="tabular-nums">
                {reactions.length === 0
                  ? '0 concordâncias'
                  : reactions.length === 1
                    ? '1 concordância'
                    : `${reactions.length} concordâncias`}
              </span>
            </span>
          )}

          {user || comments.length > 0 ? (
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
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#787D75]">
              <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
              <span className="tabular-nums">0 comentários</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#90968C] hover:text-[#4ADE80] transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Compartilhar</span>
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
                            {item.hasSpoiler && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[11px] font-medium text-[#FBBF24]">
                                  Spoiler
                                </span>
                              </>
                            )}
                          </p>
                          {item.hasSpoiler && !revealedCommentIds[item.id] ? (
                            <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded bg-[#181611] border border-[#4D3D19] text-xs">
                              <EyeOff className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                              <span className="text-[#C8C0AA]">
                                Comentário oculto por conter spoiler
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedCommentIds((prev) => ({
                                    ...prev,
                                    [item.id]: true,
                                  }))
                                }
                                className="font-semibold text-[#FBBF24] hover:underline cursor-pointer"
                              >
                                Revelar
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-[#C8CBC4] leading-relaxed break-words">
                              {renderCommentTextWithMentions(
                                item.body,
                                members,
                                onSelectAuthor,
                              )}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 pt-0.5">
                            {item.hasSpoiler && revealedCommentIds[item.id] && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedCommentIds((prev) => ({
                                    ...prev,
                                    [item.id]: false,
                                  }))
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FBBF24] hover:underline cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Ocultar spoiler</span>
                              </button>
                            )}
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
                          className="relative space-y-2"
                        >
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <input
                              ref={replyInputRef}
                              type="text"
                              maxLength={LIMITS.COMMENT_BODY_MAX}
                              value={replyText}
                              onChange={(e) => handleCommentInputChange(e, 'reply')}
                              onKeyDown={(e) => {
                                if (replyMention && replyMentionMatches.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setReplyMention((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            highlightIdx:
                                              (prev.highlightIdx + 1) %
                                              replyMentionMatches.length,
                                          }
                                        : null,
                                    );
                                    return;
                                  }
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setReplyMention((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            highlightIdx:
                                              (prev.highlightIdx -
                                                1 +
                                                replyMentionMatches.length) %
                                              replyMentionMatches.length,
                                          }
                                        : null,
                                    );
                                    return;
                                  }
                                  if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    const chosen =
                                      replyMentionMatches[replyMention.highlightIdx] ||
                                      replyMentionMatches[0];
                                    if (chosen) handleInsertMention('reply', chosen);
                                    return;
                                  }
                                }
                                if (e.key === 'Escape') {
                                  if (replyMention) {
                                    setReplyMention(null);
                                  } else {
                                    setReplyingTo(null);
                                    setReplyText('');
                                    setReplySpoiler(false);
                                  }
                                }
                              }}
                              placeholder={`Responder a ${replyingTo.targetAuthorName}... (use @ para mencionar)`}
                              aria-label={`Responder a ${replyingTo.targetAuthorName}`}
                              className="flex-1 min-w-[180px] px-3 py-1.5 text-xs sm:text-sm bg-[#0C0D0C] border border-[#2C4A34] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                            />
                            <button
                              type="button"
                              onClick={() => setReplySpoiler((prev) => !prev)}
                              aria-pressed={replySpoiler}
                              title="Marcar resposta como spoiler"
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                replySpoiler
                                  ? 'bg-[#261E0F] border-[#66511D] text-[#FBBF24]'
                                  : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#8C9288] hover:text-[#F2F2EE]'
                              }`}
                            >
                              <EyeOff className="w-3 h-3" />
                              <span>Spoiler</span>
                            </button>
                            <button
                              type="submit"
                              disabled={!replyText.trim() || submittingReply}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#4ADE80] text-[#0C0D0C] rounded-md hover:bg-[#6EE79E] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Responder</span>
                            </button>
                          </div>

                          {replyMention && replyMentionMatches.length > 0 && (
                            <ul className="absolute left-0 right-0 bottom-full mb-1.5 z-30 bg-[#181B18] border border-[#2F352F] rounded-md shadow-2xl overflow-hidden divide-y divide-[#222622]">
                              {replyMentionMatches.map((m, idx) => (
                                <li key={m.uid}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleInsertMention('reply', m);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 cursor-pointer ${
                                      idx === replyMention.highlightIdx
                                        ? 'bg-[#222A22] text-[#4ADE80]'
                                        : 'text-[#F2F2EE] hover:bg-[#1F241F]'
                                    }`}
                                  >
                                    <MemberAvatar
                                      name={m.displayName}
                                      primarySrc={m.photoURL}
                                      size="xs"
                                    />
                                    <span className="font-medium truncate">
                                      {m.displayName}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {user && (
            <form onSubmit={handleCommentSubmit} className="relative space-y-1.5">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  maxLength={LIMITS.COMMENT_BODY_MAX}
                  value={commentText}
                  onChange={(e) => handleCommentInputChange(e, 'comment')}
                  onKeyDown={(e) => {
                    if (commentMention && commentMentionMatches.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setCommentMention((prev) =>
                          prev
                            ? {
                                ...prev,
                                highlightIdx:
                                  (prev.highlightIdx + 1) %
                                  commentMentionMatches.length,
                              }
                            : null,
                        );
                        return;
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setCommentMention((prev) =>
                          prev
                            ? {
                                ...prev,
                                highlightIdx:
                                  (prev.highlightIdx -
                                    1 +
                                    commentMentionMatches.length) %
                                  commentMentionMatches.length,
                              }
                            : null,
                        );
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        const chosen =
                          commentMentionMatches[commentMention.highlightIdx] ||
                          commentMentionMatches[0];
                        if (chosen) handleInsertMention('comment', chosen);
                        return;
                      }
                      if (e.key === 'Escape') {
                        setCommentMention(null);
                      }
                    }
                  }}
                  placeholder="Escreva um comentário... (digite @ para mencionar um Cobra)"
                  aria-label="Adicionar comentário"
                  className="flex-1 min-w-[200px] px-3.5 py-2 text-sm bg-[#0C0D0C] border border-[#2A2F2A] rounded-md text-[#F2F2EE] placeholder:text-[#666B63] focus:outline-none focus:border-[#4ADE80]"
                />
                <button
                  type="button"
                  onClick={() => setCommentSpoiler((prev) => !prev)}
                  aria-pressed={commentSpoiler}
                  title="Marcar comentário como spoiler"
                  className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    commentSpoiler
                      ? 'bg-[#261E0F] border-[#66511D] text-[#FBBF24]'
                      : 'bg-[#0C0D0C] border-[#2A2F2A] text-[#8C9288] hover:text-[#F2F2EE]'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Spoiler</span>
                </button>
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F2F2EE] text-[#0C0D0C] rounded-md hover:bg-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>

              {commentMention && commentMentionMatches.length > 0 && (
                <ul className="absolute left-0 right-0 bottom-full mb-1.5 z-30 bg-[#181B18] border border-[#2F352F] rounded-md shadow-2xl overflow-hidden divide-y divide-[#222622]">
                  <li className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#787D75] flex items-center gap-1.5 bg-[#121512]">
                    <AtSign className="w-3 h-3 text-[#4ADE80]" />
                    <span>Mencionar membro dos Cobras</span>
                  </li>
                  {commentMentionMatches.map((m, idx) => (
                    <li key={m.uid}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleInsertMention('comment', m);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 cursor-pointer ${
                          idx === commentMention.highlightIdx
                            ? 'bg-[#222A22] text-[#4ADE80]'
                            : 'text-[#F2F2EE] hover:bg-[#1F241F]'
                        }`}
                      >
                        <MemberAvatar
                          name={m.displayName}
                          primarySrc={m.photoURL}
                          size="xs"
                        />
                        <span className="font-medium truncate">{m.displayName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          )}
        </div>
      )}

      {showShareModal && (
        <ShareCardModal
          payload={{
            kind: 'review',
            gameTitle: displayTitle,
            developer: game?.developer || 'Grupo dos Cobras',
            releaseYear: game?.releaseYear,
            coverUrl: displayCover,
            score: review.score,
            authorName: resolvedAuthorName,
            platformPlayed: review.platformPlayed,
            hoursPlayed: review.hoursPlayed,
            playStatusLabel: authorPlayStatus
              ? GAME_PLAY_STATUS_META[authorPlayStatus].label
              : undefined,
            ratingOnly: isRatingOnly,
            hasSpoiler: Boolean(review.hasSpoiler),
            headline: review.headline,
            body: review.body,
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </article>
  );
}
