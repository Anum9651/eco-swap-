"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
  id: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at?: string;
}

interface NotificationsDropdownProps {
  notifications: Notification[];
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  swap_request:  { icon: "🔄", color: "bg-blue-50" },
  swap_accepted: { icon: "✅", color: "bg-green-50" },
  swap_rejected: { icon: "❌", color: "bg-red-50" },
  completed:     { icon: "🎉", color: "bg-purple-50" },
  default:       { icon: "🔔", color: "bg-gray-50" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsDropdown({ notifications }: NotificationsDropdownProps) {
  const [local, setLocal] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    setLocal(notifications.filter((n) => !n.is_read));
  }, [notifications]);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");

    const unlock = () => {
      audioRef.current?.play().catch(() => {});
      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;
      setAudioUnlocked(true);
      window.removeEventListener("click", unlock);
    };

    window.addEventListener("click", unlock);
    return () => window.removeEventListener("click", unlock);
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;

    if (local.length > prevCountRef.current) {
      audioRef.current?.play().catch(() => {});
    }

    prevCountRef.current = local.length;
  }, [local, audioUnlocked]);

  const markAsRead = async (n: Notification) => {
    setLocal((prev) => prev.filter((x) => x.id !== n.id));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", n.id);
  };

  const markAllAsRead = async () => {
    if (!local.length || markingAll) return;

    setMarkingAll(true);

    const ids = local.map((n) => n.id);

    setLocal([]);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids);

    setMarkingAll(false);
  };

  const typeConfig = (type?: string) =>
    TYPE_CONFIG[type ?? "default"] ?? TYPE_CONFIG.default;

  return (
    <div
      className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
      style={{ width: "22rem" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Notifications</span>

          {local.length > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {local.length}
            </span>
          )}
        </div>

        {local.length > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50 transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {local.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-3">
              ✔
            </div>

            <p className="text-sm font-medium text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-400 mt-0.5">No new notifications</p>
          </div>
        ) : (
          <ul>
            {local.map((n) => {
              const { icon, color } = typeConfig(n.type);

              return (
                <li key={n.id}>
                  <button
                    onClick={() => markAsRead(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${color}`}>
                      {icon}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{n.message}</p>

                      {n.created_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      )}
                    </div>

                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {local.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Click a notification to dismiss it
          </p>
        </div>
      )}
    </div>
  );
}