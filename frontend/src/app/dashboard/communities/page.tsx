"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

interface Community {
  id: string;
  name: string;
  description?: string;
  location?: string;
  category?: string;
  image_url?: string;
  member_count: number;
  is_private: boolean;
  created_at: string;
  is_member?: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  local:       { icon: "📍", color: "text-green-700",  bg: "bg-green-100"  },
  electronics: { icon: "💻", color: "text-blue-700",   bg: "bg-blue-100"   },
  books:       { icon: "📚", color: "text-yellow-700", bg: "bg-yellow-100" },
  students:    { icon: "🎓", color: "text-purple-700", bg: "bg-purple-100" },
  lifestyle:   { icon: "🌿", color: "text-teal-700",   bg: "bg-teal-100"   },
  other:       { icon: "🏘️", color: "text-gray-700",   bg: "bg-gray-100"   },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded-full w-2/3" />
          <div className="h-3 bg-gray-100 rounded-full w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded-full w-full" />
      <div className="h-9 bg-gray-100 rounded-xl w-full" />
    </div>
  );
}

export default function CommunitiesPage() {
  const [user, setUser]               = useState<any>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading]         = useState(true);
  const [joiningId, setJoiningId]     = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<"discover" | "mine">("discover");
  const [showCreate, setShowCreate]   = useState(false);

  // Create form state
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); }
    });
  }, []);

  const fetchCommunities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // All communities
      const { data: all } = await supabase
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false });

      // Communities I'm in
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);

      const memberIds = new Set((memberships ?? []).map((m) => m.community_id));

      const enriched = (all ?? []).map((c) => ({
        ...c,
        is_member: memberIds.has(c.id),
      }));

      setCommunities(enriched.filter((c) => !memberIds.has(c.id)));
      setMyCommunities(enriched.filter((c) => memberIds.has(c.id)));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleJoin = async (communityId: string) => {
    if (!user) return;
    setJoiningId(communityId);
    try {
      await supabase.from("community_members").insert({
        community_id: communityId,
        user_id:      user.id,
        role:         "member",
      });
      // Increment member count
      await supabase.rpc("increment_member_count", { community_id: communityId });
      await fetchCommunities();
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (communityId: string) => {
    if (!user) return;
    setJoiningId(communityId);
    try {
      await supabase.from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", user.id);
      await supabase.rpc("decrement_member_count", { community_id: communityId });
      await fetchCommunities();
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setCreateError("Community name is required."); return; }
    setCreating(true);
    setCreateError("");
    try {
      const { data: created, error } = await supabase
        .from("communities")
        .insert({
          name:        newName.trim(),
          description: newDesc.trim() || null,
          location:    newLocation.trim() || null,
          category:    newCategory,
          created_by:  user.id,
          member_count: 1,
        })
        .select()
        .single();

      if (error || !created) throw error;

      // Auto-join as admin
      await supabase.from("community_members").insert({
        community_id: created.id,
        user_id:      user.id,
        role:         "admin",
      });

      setNewName(""); setNewDesc(""); setNewLocation(""); setNewCategory("other");
      setShowCreate(false);
      await fetchCommunities();
      setActiveTab("mine");
    } catch {
      setCreateError("Failed to create community. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all";

  const CommunityCard = ({ c }: { c: Community }) => {
    const cat     = CATEGORY_CONFIG[c.category ?? "other"] ?? CATEGORY_CONFIG.other;
    const isJoining = joiningId === c.id;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
        {/* Card header */}
        <div className="p-5 flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${cat.bg}`}>
              {c.image_url
                ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                : cat.icon
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900 leading-snug">{c.name}</h3>
                {c.is_private && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🔒 Private</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                  {cat.icon} {c.category ?? "other"}
                </span>
                {c.location && (
                  <span className="text-xs text-gray-400">📍 {c.location}</span>
                )}
              </div>
            </div>
          </div>

          {c.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>👥 {c.member_count} member{c.member_count !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <Link href={`/dashboard/communities/${c.id}`}
            className="flex-1 text-center text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl transition">
            View
          </Link>
          {c.is_member ? (
            <button onClick={() => handleLeave(c.id)} disabled={isJoining}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 py-2.5 rounded-xl border border-red-100 transition disabled:opacity-50">
              {isJoining ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : "Leave"}
            </button>
          ) : (
            <button onClick={() => handleJoin(c.id)} disabled={isJoining}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 py-2.5 rounded-xl transition disabled:opacity-50">
              {isJoining ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : "Join"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-sm text-gray-400 mt-1">Join groups, swap locally, build connections</p>
        </div>
        <button onClick={() => setShowCreate((p) => !p)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm hover:shadow-md active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Community
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Create a New Community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input className={inputClass} placeholder="e.g. Manchester Swappers"
                value={newName} onChange={(e) => { setNewName(e.target.value); setCreateError(""); }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
              <input className={inputClass} placeholder="e.g. Manchester, UK or Global"
                value={newLocation} onChange={(e) => setNewLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select className={`${inputClass} cursor-pointer appearance-none`}
                value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                <option value="local">📍 Local</option>
                <option value="electronics">💻 Electronics</option>
                <option value="books">📚 Books</option>
                <option value="students">🎓 Students</option>
                <option value="lifestyle">🌿 Lifestyle</option>
                <option value="other">🏘️ Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <input className={inputClass} placeholder="What is this community about?"
                value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition active:scale-95">
              {creating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating…
                </>
              ) : "Create Community"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "discover", label: "Discover", icon: "🔍" },
          { key: "mine",     label: `My Communities${myCommunities.length > 0 ? ` (${myCommunities.length})` : ""}`, icon: "👥" },
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

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : activeTab === "discover" ? (
        communities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm font-semibold text-gray-700">You've joined all communities!</p>
            <p className="text-xs text-gray-400 mt-1">Create a new one to get started</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {communities.map((c) => <CommunityCard key={c.id} c={c} />)}
          </div>
        )
      ) : (
        myCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm font-semibold text-gray-700">You haven't joined any communities yet</p>
            <p className="text-xs text-gray-400 mt-1">Discover communities and hit Join</p>
            <button onClick={() => setActiveTab("discover")}
              className="mt-4 text-sm font-semibold text-green-600 hover:underline">
              Browse communities →
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myCommunities.map((c) => <CommunityCard key={c.id} c={c} />)}
          </div>
        )
      )}
    </div>
  );
}