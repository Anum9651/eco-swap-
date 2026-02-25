"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import NotificationsDropdown from "./components/NotificationsDropdown";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  /* ================= AUTH ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    loadUser();
  }, []);

  /* ================= FETCH NOTIFICATIONS ================= */
  
  const fetchNotifications = async () => {
  if (!user) {
    console.log("No user yet");
    return;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log("Notifications fetched:", data);
  console.log("Error:", error);

  if (data) setNotifications(data);
};

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ================= NAV ================= */
  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Listings", path: "/dashboard/listings" },
    { name: "Requests", path: "/dashboard/requests" },
    { name: "Profile", path: "/dashboard/profile" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const unreadCount = notifications.filter(
    (n) => !n.is_read
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl font-bold text-green-600 tracking-tight"
          >
            🌱 Eco-Swap
          </Link>

          <div className="flex items-center gap-6 relative">

            {/* NAV LINKS */}
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-green-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-green-100"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-xl"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationsDropdown
                  notifications={notifications}
                />
              )}
            </div>

            {/* AVATAR */}
            <div className="relative">
              <button
                onClick={() =>
                  setShowAvatarDropdown(!showAvatarDropdown)
                }
                className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold shadow-md"
              >
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </button>

              {showAvatarDropdown && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border p-3">
                  <p className="text-sm text-gray-500 mb-2 truncate">
                    {user?.email}
                  </p>

                  <Link
                    href="/dashboard/settings"
                    className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-100"
                  >
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-100 text-red-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>

      <main className="pt-10 px-6 animate-fade">
        {children}
      </main>
    </div>
  );
}