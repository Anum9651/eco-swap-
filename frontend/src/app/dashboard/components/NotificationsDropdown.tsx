"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

const TYPE_ICONS: Record<string, string> = {
  swap_request:    "🔄",
  request_accepted:"✅",
  request_rejected:"❌",
  counter_offer:   "🔁",
  swap_completed:  "🎉",
  eco_report:      "🌿",
  default:         "🔔",
};

function TimeAgo({ date }: { date: string }) {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return <span>Just now</span>;
  if (mins < 60)  return <span>{mins}m ago</span>;
  if (hours < 24) return <span>{hours}h ago</span>;
  return <span>{days}d ago</span>;
}

interface NotificationsDropdownProps {
  notifications: Notification[];
}

export default function NotificationsDropdown({ notifications: initialNotifications }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [markingAll, setMarkingAll]       = useState(false);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const handleMarkRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">Notifications</p>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} disabled={markingAll}
            className="text-xs font-semibold text-green-600 hover:text-green-700 transition disabled:opacity-50">
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 15).map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 transition cursor-pointer ${
                n.is_read ? "bg-white hover:bg-gray-50" : "bg-green-50 hover:bg-green-100"
              }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                n.is_read ? "bg-gray-100" : "bg-green-100"
              }`}>
                {TYPE_ICONS[n.type] ?? TYPE_ICONS.default}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${n.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                  {n.message}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  <TimeAgo date={n.created_at} />
                </p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">{notifications.length} total notifications</p>
        </div>
      )}
    </div>
  );
}