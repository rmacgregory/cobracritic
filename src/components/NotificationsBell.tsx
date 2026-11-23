import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Flag, MessageSquare, Pencil, X } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { formatTimestamp, type GameWithStats } from '../types';
import { MemberAvatar } from './MemberAvatar';

interface NotificationsBellProps {
  onSelectGame: (gameId: string) => void;
  onEditGame?: (game: GameWithStats) => void;
}

export function NotificationsBell({
  onSelectGame,
  onEditGame,
}: NotificationsBellProps) {
  const {
    isAdmin,
    gamesWithStats,
    commentNotifications,
    coverReportNotifications,
    unreadNotificationCount,
    latestLiveNotification,
    latestLiveCoverReport,
    markNotificationRead,
    markAllNotificationsRead,
    dismissLiveNotification,
    dismissLiveCoverReport,
    resolveCoverReport,
  } = useVeredito();

  const [open, setOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleOpenCommentNotification = (commentId: string, gameId: string) => {
    markNotificationRead(commentId);
    dismissLiveNotification();
    setOpen(false);
    onSelectGame(gameId);
  };

  const handleEditReportedGame = (notifId: string, gameId: string) => {
    markNotificationRead(notifId);
    dismissLiveCoverReport();
    setOpen(false);
    const targetGame = gamesWithStats.find((g) => g.id === gameId);
    if (targetGame && onEditGame) {
      onEditGame(targetGame);
    } else {
      onSelectGame(gameId);
    }
  };

  const handleOpenReportedGame = (notifId: string, gameId: string) => {
    markNotificationRead(notifId);
    dismissLiveCoverReport();
    setOpen(false);
    onSelectGame(gameId);
  };

  const handleResolveReport = async (notifId: string, reportId: string) => {
    setResolvingId(reportId);
    try {
      markNotificationRead(notifId);
      await resolveCoverReport(reportId);
      dismissLiveCoverReport();
    } finally {
      setResolvingId(null);
    }
  };

  const adminCoverReports = isAdmin ? coverReportNotifications : [];
  const totalNotifications = commentNotifications.length + adminCoverReports.length;

  return (
    <>
      <div ref={containerRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={
            unreadNotificationCount > 0
              ? `Notificações (${unreadNotificationCount} não lidas)`
              : 'Notificações'
          }
          aria-expanded={open}
          aria-haspopup="menu"
          className={`relative p-2 rounded-md border transition-colors cursor-pointer ${
            open
              ? 'bg-[#191D19] border-[#4ADE80]/60 text-[#F2F2EE]'
              : 'bg-[#141614] border-[#262A26] text-[#A8ACA5] hover:text-[#F2F2EE] hover:border-[#3A433A]'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#16A34A] text-white text-[10px] font-mono font-bold tabular-nums flex items-center justify-center border border-[#0C0D0C]"
              aria-hidden="true"
            >
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-[330px] sm:w-[390px] bg-[#141614] border border-[#2A2F2A] rounded-md shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-[#232723] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#F2F2EE]">
                  Notificações
                </span>
                {unreadNotificationCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#17271B] text-[#4ADE80] rounded">
                    {unreadNotificationCount} nova
                    {unreadNotificationCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4ADE80] hover:underline cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Marcar lidas</span>
                </button>
              )}
            </div>

            {totalNotifications === 0 ? (
              <div className="px-5 py-8 text-center space-y-2">
                <MessageSquare className="w-5 h-5 text-[#4B5148] mx-auto" />
                <p className="text-xs text-[#90968C] leading-relaxed">
                  Nenhuma notificação por enquanto. Quando outros membros comentarem
                  em uma avaliação sua, responderem um comentário seu
                  {isAdmin ? ' ou reportarem uma capa incorreta' : ''}, ela aparecerá
                  aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-[#202420]">
                {/* Admin-only Incorrect Cover Reports */}
                {adminCoverReports.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-[#1A1710] border-b border-[#332A14] flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#FBBF24] flex items-center gap-1.5">
                        <Flag className="w-3 h-3" />
                        <span>Capas reportadas · Admin ({adminCoverReports.length})</span>
                      </span>
                    </div>
                    <ul className="divide-y divide-[#232018]">
                      {adminCoverReports.slice(0, 15).map((report) => (
                        <li
                          key={report.id}
                          className={`px-4 py-3 space-y-2.5 ${
                            report.unread ? 'bg-[#1D1910]' : 'bg-[#151410]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              <MemberAvatar
                                name={report.reporterName}
                                primarySrc={report.reporterPhotoURL}
                                fallbackSrc={report.reporterFallbackPhotoURL}
                                size="sm"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs text-[#D6D3C8] leading-snug">
                                <span className="font-semibold text-[#FDE68A]">
                                  {report.reporterName}
                                </span>{' '}
                                reportou capa incorreta em{' '}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenReportedGame(report.id, report.gameId)
                                  }
                                  className="font-semibold text-[#F2F2EE] hover:text-[#4ADE80] underline decoration-[#4B5148] cursor-pointer"
                                >
                                  {report.gameTitle}
                                </button>
                              </p>
                              {report.note && (
                                <p className="text-xs text-[#A8A394] line-clamp-2 break-words">
                                  “{report.note}”
                                </p>
                              )}
                              <p className="text-[11px] text-[#7D7868]">
                                {formatTimestamp(report.createdAt)}
                              </p>
                            </div>
                            {report.unread && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#FBBF24] mt-1.5 shrink-0"
                                aria-label="Não lida"
                              />
                            )}
                          </div>

                          <div className="pl-11 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditReportedGame(report.id, report.gameId)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded hover:bg-[#FCD34D] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Ajustar capa</span>
                            </button>
                            <button
                              type="button"
                              disabled={resolvingId === report.reportId}
                              onClick={() =>
                                handleResolveReport(report.id, report.reportId)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#38362B] bg-[#0C0D0C] text-[#A8ACA5] hover:text-[#4ADE80] hover:border-[#2C5B3C] rounded transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              <span>
                                {resolvingId === report.reportId
                                  ? 'Resolvendo...'
                                  : 'Resolvido'}
                              </span>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Member Review Comment Notifications */}
                {commentNotifications.length > 0 && (
                  <ul className="divide-y divide-[#202420]">
                    {commentNotifications.slice(0, 30).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenCommentNotification(item.id, item.gameId)
                          }
                          className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                            item.unread
                              ? 'bg-[#151D17] hover:bg-[#1B261E]'
                              : 'hover:bg-[#191D19]'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <MemberAvatar
                              name={item.authorName}
                              primarySrc={item.authorPhotoURL}
                              fallbackSrc={item.authorFallbackPhotoURL}
                              size="sm"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs text-[#C8CBC4] leading-snug">
                              <span className="font-semibold text-[#F2F2EE]">
                                {item.authorName}
                              </span>{' '}
                              {item.isReply
                                ? 'respondeu ao seu comentário em'
                                : 'comentou na sua avaliação de'}{' '}
                              <span className="font-semibold text-[#F2F2EE]">
                                {item.gameTitle}
                              </span>
                            </p>
                            <p className="text-xs text-[#8C9288] line-clamp-2 break-words">
                              “{item.body}”
                            </p>
                            <p className="text-[11px] text-[#6E736B]">
                              {formatTimestamp(item.createdAt)}
                            </p>
                          </div>

                          {item.unread && (
                            <span
                              className="w-2 h-2 rounded-full bg-[#4ADE80] mt-1.5 shrink-0"
                              aria-label="Não lida"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live real-time toast for Admins when a member reports an incorrect cover */}
      {isAdmin && latestLiveCoverReport && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-[#1B1810] border border-[#5A4419] rounded-md shadow-2xl p-3.5 flex items-start gap-3"
        >
          <MemberAvatar
            name={latestLiveCoverReport.reporterName}
            primarySrc={latestLiveCoverReport.reporterPhotoURL}
            fallbackSrc={latestLiveCoverReport.reporterFallbackPhotoURL}
            size="sm"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#FBBF24] flex items-center gap-1">
              <Flag className="w-3 h-3" />
              <span>Capa incorreta reportada</span>
            </p>
            <p className="text-xs text-[#D6D3C8] leading-snug">
              <span className="font-semibold text-[#FDE68A]">
                {latestLiveCoverReport.reporterName}
              </span>{' '}
              reportou a capa de{' '}
              <span className="font-semibold text-[#F2F2EE]">
                {latestLiveCoverReport.gameTitle}
              </span>
            </p>
            {latestLiveCoverReport.note && (
              <p className="text-xs text-[#A8A394] truncate">
                “{latestLiveCoverReport.note}”
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                handleEditReportedGame(
                  latestLiveCoverReport.id,
                  latestLiveCoverReport.gameId,
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#FBBF24] text-[#0C0D0C] rounded hover:bg-[#FCD34D] cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Ajustar capa agora</span>
            </button>
          </div>
          <button
            type="button"
            onClick={dismissLiveCoverReport}
            aria-label="Fechar aviso"
            className="p-1 text-[#8C8675] hover:text-[#F2F2EE] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live real-time toast when a new comment arrives on one of your reviews */}
      {latestLiveNotification && !(isAdmin && latestLiveCoverReport) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] bg-[#141915] border border-[#2C4A34] rounded-md shadow-2xl p-3.5 flex items-start gap-3"
        >
          <MemberAvatar
            name={latestLiveNotification.authorName}
            primarySrc={latestLiveNotification.authorPhotoURL}
            fallbackSrc={latestLiveNotification.authorFallbackPhotoURL}
            size="sm"
          />
          <button
            type="button"
            onClick={() =>
              handleOpenCommentNotification(
                latestLiveNotification.id,
                latestLiveNotification.gameId,
              )
            }
            className="min-w-0 flex-1 text-left space-y-0.5 cursor-pointer"
          >
            <p className="text-xs text-[#C8CBC4] leading-snug">
              <span className="font-semibold text-[#4ADE80]">
                {latestLiveNotification.authorName}
              </span>{' '}
              {latestLiveNotification.isReply
                ? 'respondeu ao seu comentário em'
                : 'comentou na sua avaliação de'}{' '}
              <span className="font-semibold text-[#F2F2EE]">
                {latestLiveNotification.gameTitle}
              </span>
            </p>
            <p className="text-xs text-[#8C9288] truncate">
              “{latestLiveNotification.body}”
            </p>
          </button>
          <button
            type="button"
            onClick={dismissLiveNotification}
            aria-label="Fechar aviso"
            className="p-1 text-[#787D75] hover:text-[#F2F2EE] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
