"use client";

import { useState, useRef, useEffect } from "react";
import NotificationsDropdown from "./NotificationsDropdown";

interface HeaderProps {
  ecoPoints: number;
  notifications: any[];
  onLogout: () => void;
}

export default function Header({ ecoPoints, notifications, onLogout }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center mb-12">
      {/* Brand */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          Eco-Swap
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 ml-1">
            Dashboard
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">Sustainability through smart swapping</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Eco Points */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-2 rounded-xl">
          <span className="text-base">🍃</span>
          <span className="text-sm font-semibold">{ecoPoints.toLocaleString()}</span>
          <span className="text-xs text-green-500 font-medium">pts</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-150 ${
              showDropdown
                ? "bg-gray-100 border-gray-300"
                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }`}
            aria-label="Notifications"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <NotificationsDropdown notifications={notifications} />
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}