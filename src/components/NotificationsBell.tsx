import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, MessageSquare, X } from 'lucide-react';
import { useVeredito } from '../context/VereditoContext';
import { formatTimestamp } from '../types';
import { MemberAvatar } from './MemberAvatar';

interface NotificationsBellProps {
  onSelectGame: (gameId: string) => void;
}

export function NotificationsBell({ onSelectGame }: NotificationsBellProps) {
  const {
    commentNotifications,
    unreadNotificationCount,
    latestLiveNotification,
    markNotificationRead,
    markAllNotificationsRead,
    dismissLiveNotification,
  } = useVeredito();

  const [open, setOpen] = useState(false);
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

  const handleOpenNotification = (commentId: string, gameId: string) => {
    markNotificationRead(commentId);
    dismissLiveNotification();
    setOpen(false);
    onSelectGame(gameId);
  };

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
            className="absolute right-0 mt-2 w-[320px] sm:w-[370px] bg-[#141614] border border-[#2A2F2A] rounded-md shadow-2xl overflow-hidden z-50"
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

            {commentNotifications.length === 0 ? (
              <div className="px-5 py-8 text-center space-y-2">
                <MessageSquare className="w-5 h-5 text-[#4B5148] mx-auto" />
                <p className="text-xs text-[#90968C] leading-relaxed">
                  Nenhuma notificação por enquanto. Quando outros membros comentarem
                  em uma avaliação sua, ela aparecerá aqui em tempo real.
                </p>
              </div>
            ) : (
              <ul className="max-h-[380px] overflow-y-auto divide-y divide-[#202420]">
                {commentNotifications.slice(0, 30).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(item.id, item.gameId)}
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
                          comentou na sua avaliação de{' '}
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

      {/* Live real-time toast when a new comment arrives on one of your reviews */}
      {latestLiveNotification && (
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
              handleOpenNotification(
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
              comentou na sua crítica de{' '}
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
