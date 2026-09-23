import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  FolderKanban,
  GitCommit,
  Image as ImageIcon,
  Library,
  Sparkles,
  Key,
  ExternalLink,
  X
} from 'lucide-react';
import { cn } from '@canopy/ui';
import { formatRelativeTime } from '../../workspace/services/workspaceData.js';

export function NotificationPopover({ hook, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const popoverRef = useRef(null);

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = hook;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const displayedNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  const handleNotificationClick = async (notif) => {
    if (!notif.read_at) {
      await markAsRead(notif.id);
    }
    if (notif.entity_type === 'project' && notif.entity_id) {
      onNavigate?.({ name: 'project-home', projectId: notif.entity_id });
      setOpen(false);
    } else if (notif.entity_type === 'version' && notif.metadata?.project_id) {
      onNavigate?.({ name: 'project-home', projectId: notif.metadata.project_id });
      setOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project_activity':
        return <FolderKanban className="h-4 w-4 text-canopy-green" />;
      case 'version_activity':
        return <GitCommit className="h-4 w-4 text-emerald-400" />;
      case 'asset_activity':
        return <ImageIcon className="h-4 w-4 text-sky-400" />;
      case 'memory_activity':
        return <Library className="h-4 w-4 text-amber-400" />;
      case 'ai_activity':
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case 'developer_activity':
        return <Key className="h-4 w-4 text-orange-400" />;
      default:
        return <Bell className="h-4 w-4 text-canopy-green" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button with Badge */}
      <button
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-canopy-surface transition hover:border-canopy-green hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-green',
          open ? 'border-canopy-green text-white bg-canopy-elevated' : 'border-canopy-border text-canopy-secondary'
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-canopy-green px-1 text-[10px] font-bold text-black shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-canopy-border bg-canopy-surface p-0 shadow-2xl overflow-hidden backdrop-blur-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-canopy-border/80 px-4 py-3 bg-canopy-surface/90">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-canopy-green/10 border border-canopy-green/30 px-2 py-0.5 text-[11px] font-mono font-medium text-canopy-green">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 text-xs text-canopy-secondary hover:text-canopy-green transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex border-b border-canopy-border/60 bg-canopy-elevated/40 px-3 py-1.5 gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition',
                filter === 'all'
                  ? 'bg-canopy-surface text-white border border-canopy-border shadow-sm'
                  : 'text-canopy-secondary hover:text-white'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md font-medium transition',
                filter === 'unread'
                  ? 'bg-canopy-surface text-white border border-canopy-border shadow-sm'
                  : 'text-canopy-secondary hover:text-white'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-canopy-border/40">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-canopy-muted">Loading notifications...</div>
            ) : displayedNotifications.length > 0 ? (
              displayedNotifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'group flex items-start gap-3 p-3.5 transition cursor-pointer hover:bg-canopy-elevated/70',
                      isUnread ? 'bg-canopy-green/[0.04]' : ''
                    )}
                  >
                    <div className="mt-0.5 shrink-0 rounded-lg border border-canopy-border/60 bg-canopy-surface p-2 shadow-inner">
                      {getIcon(n.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn('text-xs font-semibold truncate', isUnread ? 'text-white' : 'text-canopy-secondary')}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-canopy-green shadow-sm" />
                        )}
                      </div>

                      {n.message && (
                        <p className="mt-0.5 text-xs text-canopy-secondary leading-snug line-clamp-2">
                          {n.message}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-canopy-muted">
                        <span className="font-mono">{formatRelativeTime(n.created_at)}</span>

                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-canopy-muted hover:text-canopy-green transition"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center">
                <Bell className="mx-auto h-8 w-8 text-canopy-muted/40 mb-2" />
                <p className="text-sm font-medium text-white">No new notifications</p>
                <p className="mt-1 text-xs text-canopy-secondary">
                  {filter === 'unread' ? 'All caught up! No unread alerts.' : 'Events and activity will appear here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
