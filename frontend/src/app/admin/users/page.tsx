"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface User {
  id: string;
  full_name?: string;
  avatar_url?: string;
  eco_points: number;
  avg_rating?: number;
  rating_count?: number;
  city?: string;
  country?: string;
  is_admin?: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState<"newest" | "eco_points" | "rating">("newest");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, eco_points, avg_rating, rating_count, city, country, is_admin, created_at");

    if (sortBy === "eco_points") q = q.order("eco_points", { ascending: false });
    if (sortBy === "rating")     q = q.order("avg_rating",  { ascending: false });
    if (sortBy === "newest")     q = q.order("created_at",  { ascending: false });

    const { data } = await q;
    let result = data ?? [];
    if (search.trim()) {
      result = result.filter((u) =>
        u.full_name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setUsers(result);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [sortBy]);

  const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (!confirm(`${currentAdmin ? "Remove" : "Grant"} admin access for this user?`)) return;
    setActionId(userId);
    await supabase.from("profiles").update({ is_admin: !currentAdmin }).eq("id", userId);
    await fetchUsers();
    setActionId(null);
  };

  const handleAdjustPoints = async (userId: string, current: number) => {
    const input = prompt(`Current eco points: ${current}\nEnter new value:`);
    if (input === null) return;
    const val = parseInt(input);
    if (isNaN(val)) { alert("Invalid number"); return; }
    setActionId(userId);
    await supabase.from("profiles").update({ eco_points: val }).eq("id", userId);
    await fetchUsers();
    setActionId(null);
  };

  const filtered = search.trim()
    ? users.filter((u) => u.full_name?.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-gray-400 mt-1">{users.length} registered users</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 px-4 py-2 rounded-xl outline-none focus:border-gray-500 transition w-48"
        />
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
          {([
            { key: "newest",     label: "Newest"      },
            { key: "eco_points", label: "Eco Points"  },
            { key: "rating",     label: "Rating"      },
          ] as const).map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                sortBy === s.key ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Eco Points</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {(u.full_name?.[0] ?? "U").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-1.5">
                            {u.full_name ?? "Eco Swapper"}
                            {u.is_admin && (
                              <span className="text-xs bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded-md">Admin</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 font-mono truncate max-w-[140px]">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-green-400">🌿 {u.eco_points ?? 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      {u.avg_rating && u.avg_rating > 0 ? (
                        <span className="text-sm text-yellow-400">⭐ {u.avg_rating} ({u.rating_count})</span>
                      ) : (
                        <span className="text-xs text-gray-600">No ratings</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdjustPoints(u.id, u.eco_points)}
                          disabled={actionId === u.id}
                          className="text-xs font-semibold text-green-400 bg-green-900/20 hover:bg-green-900/40 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                          Edit Points
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(u.id, u.is_admin ?? false)}
                          disabled={actionId === u.id}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 ${
                            u.is_admin
                              ? "text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40"
                              : "text-gray-400 bg-gray-800 hover:bg-gray-700"
                          }`}>
                          {u.is_admin ? "Revoke Admin" : "Make Admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}