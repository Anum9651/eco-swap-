"use client";

import { useState } from "react";
import NotificationsDropdown from "./NotificationsDropdown";

interface HeaderProps {
  ecoPoints: number;
  notifications: any[];
  onLogout: () => void;
}

export default function Header({
  ecoPoints,
  notifications,
  onLogout,
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const getEcoLevel = (points: number) => {
    if (points >= 100)
      return { label: "Platinum", color: "text-purple-600" };
    if (points >= 50)
      return { label: "Gold", color: "text-yellow-500" };
    if (points >= 20)
      return { label: "Silver", color: "text-gray-500" };
    return { label: "Bronze", color: "text-orange-600" };
  };

  const ecoLevel = getEcoLevel(ecoPoints);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex justify-between items-center mb-10">
      <div>
        <h1 className="text-3xl font-bold text-green-700">
          🌱 Eco-Swap Dashboard
        </h1>

        <div className="mt-2 flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Eco Points:
            <span className="ml-2 font-bold text-green-600 text-lg">
              {ecoPoints}
            </span>
          </p>

          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 ${ecoLevel.color}`}
          >
            {ecoLevel.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)}>
            <span className="text-2xl">🔔</span>
          </button>

          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}

          {showDropdown && (
            <NotificationsDropdown notifications={notifications} />
          )}
        </div>

        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}