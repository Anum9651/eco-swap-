"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import NotificationsDropdown from "./components/NotificationsDropdown";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user, setUser]                             = useState<any>(null);
  const [userId, setUserId]                         = useState<string | null>(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showNotifications, setShowNotifications]   = useState(false);
  const [notifications, setNotifications]           = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl]                   = useState<string | null>(null);
  const [initials, setInitials]                     = useState("U");

  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles")
      .select("avatar_url, full_name")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.full_name) {
          setInitials(
            data.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
          );
        } else {
          setInitials("U");
        }
      });
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setNotifications(data);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        fetchNotifications
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setShowAvatarDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setShowAvatarDropdown(false);
    setShowNotifications(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
    if (q) router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navItems = [
    { label: "Overview",    path: "/dashboard",             icon: overviewIcon    },
    { label: "Listings",    path: "/dashboard/listings",    icon: listingsIcon    },
    { label: "Map",         path: "/dashboard/map",         icon: mapIcon         },
    { label: "Communities", path: "/dashboard/communities", icon: communitiesIcon },
    { label: "Requests",    path: "/dashboard/requests",    icon: requestsIcon    },
    { label: "Profile",     path: "/dashboard/profile",     icon: profileIcon     },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo + Search */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard"
              className="flex items-center gap-2 font-bold text-gray-900 text-base flex-shrink-0">
              <span className="text-xl">🌱</span>
              <span className="hidden sm:block">Eco-Swap</span>
            </Link>

            <form onSubmit={handleSearch}
              className="hidden md:flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-transparent focus-within:bg-white focus-within:border-gray-200 focus-within:shadow-sm rounded-xl px-3 py-2 transition-all w-56">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
              </svg>
              <input name="q" type="text" placeholder="Search listings…"
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
            </form>
          </div>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, path, icon }) => {
              const isActive = pathname === path;
              return (
                <Link key={path} href={path}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}>
                  <span className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Mobile search */}
            <button onClick={() => router.push("/dashboard/search")}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
              </svg>
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifications((p) => !p); setShowAvatarDropdown(false); }}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                  showNotifications ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200 hover:bg-gray-50"
                }`}>
                <svg style={{ width: 18, height: 18 }} className="text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationsDropdown notifications={notifications} />}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => { setShowAvatarDropdown((p) => !p); setShowNotifications(false); }}
                className="flex items-center gap-2 hover:opacity-80 transition">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-green-600 flex items-center justify-center flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{initials}</span>
                  )}
                </div>
              </button>

              {showAvatarDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link href="/dashboard/profile"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <Link href="/dashboard/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link href="/admin"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-yellow-500 hover:bg-yellow-50 rounded-xl transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin Panel
                    </Link>
                  </div>
                  <div className="p-1.5 border-t border-gray-100">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-gray-100 overflow-x-auto">
          {navItems.map(({ label, path, icon }) => {
            const isActive = pathname === path;
            return (
              <Link key={path} href={path}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                  isActive ? "text-green-600 border-t-2 border-green-600 -mt-px" : "text-gray-400 hover:text-gray-600"
                }`}>
                <span style={{ width: 18, height: 18 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

const overviewIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const listingsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const mapIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 13l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 4V6" />
  </svg>
);
const communitiesIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const requestsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);
const profileIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);