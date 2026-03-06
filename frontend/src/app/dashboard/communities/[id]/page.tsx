"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";

interface Community {
  id: string;
  name: string;
  description?: string;
  location?: string;
  category?: string;
  member_count: number;
  created_by?: string;
  created_at: string;
}

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: { full_name?: string; avatar_url?: string; eco_points?: number; avg_rating?: number } | { full_name?: string; avatar_url?: string; eco_points?: number; avg_rating?: number }[];
}

interface Listing {
  id: string;
  title: string;
  image_url?: string;
  listing_type?: string;
  condition?: string;
  category?: string;
  price?: number;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: string; bg: string }> = {
  local:       { icon: "📍", bg: "bg-green-100"  },
  electronics: { icon: "💻", bg: "bg-blue-100"   },
  books:       { icon: "📚", bg: "bg-yellow-100" },
  students:    { icon: "🎓", bg: "bg-purple-100" },
  lifestyle:   { icon: "🌿", bg: "bg-teal-100"   },
  other:       { icon: "🏘️", bg: "bg-gray-100"   },
};

const TYPE_COLOR: Record<string, string> = {
  swap:   "bg-green-100 text-green-700",
  donate: "bg-purple-100 text-purple-700",
  sale:   "bg-blue-100 text-blue-700",
};

// Helper to normalise profiles (Supabase returns array or object)
function getProfile(m: Member) {
  if (!m.profiles) return undefined;
  return Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
}

export default function CommunityPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;

  const [user, setUser]             = useState<any>(null);
  const [community, setCommunity]   = useState<Community | null>(null);
  const [members, setMembers]       = useState<Member[]>([]);
  const [listings, setListings]     = useState<Listing[]>([]);
  const [isMember, setIsMember]     = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [joining, setJoining]       = useState(false);
  const [activeTab, setActiveTab]   = useState<"listings" | "members" | "leaderboard">("listings");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: comm }, { data: mems }, { data: lists }, { data: membership }] = await Promise.all([
        supabase.from("communities").select("*").eq("id", id).single(),
        supabase.from("community_members")
          .select("user_id, role, joined_at, profiles(full_name, avatar_url, eco_points, avg_rating)")
          .eq("community_id", id)
          .order("joined_at", { ascending: true }),
        supabase.from("listings")
          .select("id, title, image_url, listing_type, condition, category, price, created_at")
          .eq("community_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase.from("community_members")
          .select("role")
          .eq("community_id", id)
          .eq("user_id", user.id)
          .single(),
      ]);

      setCommunity(comm);
      setMembers((mems ?? []) as Member[]);
      setListings(lists ?? []);
      setIsMember(!!membership);
      setIsAdmin(membership?.role === "admin");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    await supabase.from("community_members").insert({
      community_id: id, user_id: user.id, role: "member",
    });
    await supabase.rpc("increment_member_count", { community_id: id });
    await fetchAll();
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setJoining(true);
    await supabase.from("community_members")
      .delete().eq("community_id", id).eq("user_id", user.id);
    await supabase.rpc("decrement_member_count", { community_id: id });
    router.push("/dashboard/communities");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Community not found.</p>
        <Link href="/dashboard/communities" className="text-green-600 text-sm font-semibold hover:underline mt-2 block">
          ← Back to communities
        </Link>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[community.category ?? "other"] ?? CATEGORY_CONFIG.other;

  // Leaderboard — sort members by eco_points desc
  const leaderboard = [...members].sort(
    (a, b) => (getProfile(b)?.eco_points ?? 0) - (getProfile(a)?.eco_points ?? 0)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Back */}
      <Link href="/dashboard/communities"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Communities
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={`h-24 ${cat.bg}`} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className={`w-16 h-16 rounded-2xl ${cat.bg} border-4 border-white shadow-md flex items-center justify-center text-3xl`}>
              {cat.icon}
            </div>
            <div className="flex gap-2 mb-1">
              {isMember ? (
                <>
                  {isAdmin && (
                    <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-xl border border-yellow-200">
                      👑 Admin
                    </span>
                  )}
                  <button onClick={handleLeave} disabled={joining}
                    className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-100 transition">
                    Leave
                  </button>
                </>
              ) : (
                <button onClick={handleJoin} disabled={joining}
                  className="flex items-center gap-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-xl transition">
                  {joining ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : null}
                  Join Community
                </button>
              )}
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{community.name}</h1>
          {community.description && (
            <p className="text-sm text-gray-500 mt-1">{community.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            {community.location && <span>📍 {community.location}</span>}
            <span>👥 {community.member_count} members</span>
            <span>🗓️ Created {new Date(community.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "listings",    label: `Listings (${listings.length})`,   icon: "📦" },
          { key: "members",     label: `Members (${members.length})`,     icon: "👥" },
          { key: "leaderboard", label: "Leaderboard",                     icon: "🏆" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Listings tab */}
      {activeTab === "listings" && (
        listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-3xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-600">No listings in this community yet</p>
            {isMember && (
              <Link href="/dashboard/listings"
                className="mt-3 text-xs font-semibold text-green-600 hover:underline">
                Post a listing to this community →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="h-36 bg-gray-100 overflow-hidden">
                  {l.image_url
                    ? <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                  }
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{l.title}</h3>
                    {l.listing_type && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLOR[l.listing_type] ?? TYPE_COLOR.swap}`}>
                        {l.listing_type === "swap" ? "🔄" : l.listing_type === "donate" ? "🎁" : "💰"}
                      </span>
                    )}
                  </div>
                  {l.category && <p className="text-xs text-gray-400">{l.category}</p>}
                  {l.listing_type === "sale" && l.price != null && (
                    <p className="text-sm font-bold text-blue-600 mt-1">${l.price}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {members.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No members yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((m) => {
                const profile = getProfile(m);
                return (
                  <div key={m.user_id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (profile?.full_name?.[0] ?? "U").toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile?.full_name ?? "Eco Swapper"}
                        {m.user_id === user?.id && (
                          <span className="ml-2 text-xs text-gray-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.role === "admin" && (
                        <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full">
                          👑 Admin
                        </span>
                      )}
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
                        🌿 {profile?.eco_points ?? 0} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">🏆 Eco Points Leaderboard</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top eco contributors in this community</p>
          </div>
          <div className="divide-y divide-gray-50">
            {leaderboard.map((m, idx) => {
              const profile = getProfile(m);
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
              const isYou = m.user_id === user?.id;
              return (
                <div key={m.user_id}
                  className={`flex items-center gap-4 px-5 py-4 transition ${isYou ? "bg-green-50" : "hover:bg-gray-50"}`}>
                  <div className="w-8 text-center text-lg flex-shrink-0">{medal}</div>
                  <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (profile?.full_name?.[0] ?? "U").toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name ?? "Eco Swapper"}
                      {isYou && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-green-600 flex-shrink-0">
                    🌿 {profile?.eco_points ?? 0} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}