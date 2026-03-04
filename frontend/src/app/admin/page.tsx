"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalListings: number;
  totalSwaps: number;
  totalDonations: number;
  totalCommunities: number;
  flaggedListings: number;
  pendingSwaps: number;
  totalEcoPoints: number;
}

function StatCard({ label, value, icon, sub, href, color = "text-white" }: {
  label: string; value: number | string; icon: string;
  sub?: string; href?: string; color?: string;
}) {
  const content = (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {href && (
          <span className="text-xs text-gray-500 hover:text-gray-300 transition">View →</span>
        )}
      </div>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminOverview() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [recentUsers, setRecentUsers]       = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [
        { count: users },
        { count: listings },
        { count: swaps },
        { count: donations },
        { count: communities },
        { count: flagged },
        { count: pending },
        { data: recentL },
        { data: recentU },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("swap_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("listing_type", "donate"),
        supabase.from("communities").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("fraud_flag", true),
        supabase.from("swap_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("listings").select("id, title, listing_type, status, created_at, fraud_flag")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("id, full_name, eco_points, created_at")
          .order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        totalUsers:       users ?? 0,
        totalListings:    listings ?? 0,
        totalSwaps:       swaps ?? 0,
        totalDonations:   donations ?? 0,
        totalCommunities: communities ?? 0,
        flaggedListings:  flagged ?? 0,
        pendingSwaps:     pending ?? 0,
        totalEcoPoints:   0,
      });
      setRecentListings(recentL ?? []);
      setRecentUsers(recentU ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-900 rounded-2xl border border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-sm text-gray-400 mt-1">Platform health and activity at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"       value={stats!.totalUsers}       icon="👥" href="/admin/users" />
        <StatCard label="Total Listings"    value={stats!.totalListings}    icon="📦" href="/admin/listings" />
        <StatCard label="Completed Swaps"   value={stats!.totalSwaps}       icon="🔄" />
        <StatCard label="Donations"         value={stats!.totalDonations}   icon="🎁" />
        <StatCard label="Communities"       value={stats!.totalCommunities} icon="🏘️" href="/admin/communities" />
        <StatCard label="Pending Swaps"     value={stats!.pendingSwaps}     icon="⏳" color="text-yellow-400" />
        <StatCard
          label="Flagged Listings"
          value={stats!.flaggedListings}
          icon="🚩"
          color={stats!.flaggedListings > 0 ? "text-red-400" : "text-white"}
          sub={stats!.flaggedListings > 0 ? "Needs review" : "All clear"}
          href="/admin/listings"
        />
        <StatCard label="Active Communities" value={stats!.totalCommunities} icon="🌿" color="text-green-400" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent listings */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Listings</h2>
            <Link href="/admin/listings" className="text-xs text-gray-400 hover:text-white transition">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recentListings.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{l.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {l.fraud_flag && (
                    <span className="text-xs font-semibold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
                      🚩 Flagged
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    l.status === "active"  ? "bg-green-900/40 text-green-400" :
                    l.status === "swapped" ? "bg-purple-900/40 text-purple-400" :
                                             "bg-gray-800 text-gray-400"
                  }`}>
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-gray-400 hover:text-white transition">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-700 text-white flex items-center justify-center text-xs font-bold">
                    {(u.full_name?.[0] ?? "U").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.full_name ?? "Eco Swapper"}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-green-400">🌿 {u.eco_points ?? 0} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}