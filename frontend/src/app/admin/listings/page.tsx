"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  listing_type?: string;
  condition?: string;
  status: string;
  fraud_flag: boolean;
  created_at: string;
  image_url?: string;
  user_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-900/40 text-green-400",
  swapped:  "bg-purple-900/40 text-purple-400",
  inactive: "bg-gray-800 text-gray-400",
  completed:"bg-blue-900/40 text-blue-400",
};

export default function AdminListings() {
  const [listings, setListings]     = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "flagged" | "active" | "swapped">("all");
  const [search, setSearch]         = useState("");
  const [actionId, setActionId]     = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("listings")
      .select("id, title, description, category, listing_type, condition, status, fraud_flag, created_at, image_url, user_id")
      .order("created_at", { ascending: false });

    if (filter === "flagged") q = q.eq("fraud_flag", true);
    if (filter === "active")  q = q.eq("status", "active");
    if (filter === "swapped") q = q.eq("status", "swapped");
    if (search.trim())        q = q.ilike("title", `%${search.trim()}%`);

    const { data } = await q;
    setListings(data ?? []);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleFlag = async (id: string, currentFlag: boolean) => {
    setActionId(id);
    await supabase.from("listings").update({ fraud_flag: !currentFlag }).eq("id", id);
    await fetchListings();
    setActionId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    setActionId(id);
    await supabase.from("listings").delete().eq("id", id);
    await fetchListings();
    setActionId(null);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setActionId(id);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await supabase.from("listings").update({ status: newStatus }).eq("id", id);
    await fetchListings();
    setActionId(null);
  };

  const FILTERS = [
    { key: "all",     label: "All"     },
    { key: "active",  label: "Active"  },
    { key: "flagged", label: "🚩 Flagged" },
    { key: "swapped", label: "Swapped" },
  ] as const;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">Listings</h1>
        <p className="text-sm text-gray-400 mt-1">{listings.length} listings found</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === f.key ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 px-4 py-2 rounded-xl outline-none focus:border-gray-500 transition w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Listing</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-48" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-20" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-32" /></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">No listings found</td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className={`hover:bg-gray-800/50 transition ${l.fraud_flag ? "bg-red-900/10" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center text-lg">
                          {l.image_url
                            ? <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                            : "📦"
                          }
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {l.title}
                            {l.fraud_flag && <span className="text-red-400 text-xs">🚩</span>}
                          </p>
                          <p className="text-xs text-gray-500">{l.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        l.listing_type === "donate" ? "bg-purple-900/40 text-purple-400" :
                        l.listing_type === "sale"   ? "bg-blue-900/40 text-blue-400"     :
                                                       "bg-green-900/40 text-green-400"
                      }`}>
                        {l.listing_type === "donate" ? "🎁" : l.listing_type === "sale" ? "💰" : "🔄"} {l.listing_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[l.status] ?? STATUS_COLORS.inactive}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(l.id, l.status)}
                          disabled={actionId === l.id}
                          className="text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                          {l.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleFlag(l.id, l.fraud_flag)}
                          disabled={actionId === l.id}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 ${
                            l.fraud_flag
                              ? "text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40"
                              : "text-red-400 bg-red-900/20 hover:bg-red-900/40"
                          }`}>
                          {l.fraud_flag ? "Unflag" : "🚩 Flag"}
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={actionId === l.id}
                          className="text-xs font-semibold text-red-400 bg-red-900/20 hover:bg-red-900/40 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                          Delete
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