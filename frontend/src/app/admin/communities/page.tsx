"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Community {
  id: string;
  name: string;
  description?: string;
  category?: string;
  location?: string;
  member_count: number;
  is_private: boolean;
  created_at: string;
}

export default function AdminCommunities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionId, setActionId]       = useState<string | null>(null);

  const fetchCommunities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("communities")
      .select("*")
      .order("member_count", { ascending: false });
    setCommunities(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCommunities(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All memberships will be removed.`)) return;
    setActionId(id);
    await supabase.from("communities").delete().eq("id", id);
    await fetchCommunities();
    setActionId(null);
  };

  const handleTogglePrivate = async (id: string, current: boolean) => {
    setActionId(id);
    await supabase.from("communities").update({ is_private: !current }).eq("id", id);
    await fetchCommunities();
    setActionId(null);
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">Communities</h1>
        <p className="text-sm text-gray-400 mt-1">{communities.length} communities</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Community</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Visibility</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-800 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : communities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">No communities yet</td>
                </tr>
              ) : (
                communities.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-gray-300 bg-gray-800 px-2.5 py-1 rounded-full capitalize">
                        {c.category ?? "other"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-white">👥 {c.member_count}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        c.is_private
                          ? "bg-yellow-900/40 text-yellow-400"
                          : "bg-green-900/40 text-green-400"
                      }`}>
                        {c.is_private ? "🔒 Private" : "🌍 Public"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePrivate(c.id, c.is_private)}
                          disabled={actionId === c.id}
                          className="text-xs font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                          {c.is_private ? "Make Public" : "Make Private"}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={actionId === c.id}
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