"use client";

import { useEffect, useRef, useState } from "react";

interface NotificationsDropdownProps {
  notifications: any[];
}

export default function NotificationsDropdown({
  notifications,
}: NotificationsDropdownProps) {

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const prevCountRef = useRef<number>(0);

  /* ================= INITIALIZE AUDIO ================= */
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      audioRef.current?.play().catch(() => {});
      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;
      setAudioUnlocked(true);
      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
    };
  }, []);

  /* ================= PLAY SOUND ONLY ON NEW NOTIFICATION ================= */
  useEffect(() => {
    if (!audioUnlocked) return;

    const currentCount = notifications.length;
    const previousCount = prevCountRef.current;

    if (currentCount > previousCount) {
      audioRef.current?.play().catch(() => {});
    }

    prevCountRef.current = currentCount;
  }, [notifications, audioUnlocked]);

  return (
    <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border p-4 z-50">

      <h3 className="font-semibold text-sm mb-3">
        Notifications
      </h3>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500">
          No notifications
        </p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className={`py-2 text-sm border-b ${
              !n.is_read ? "font-semibold" : "text-gray-500"
            }`}
          >
            {n.message}
          </div>
        ))
      )}
    </div>
  );
}