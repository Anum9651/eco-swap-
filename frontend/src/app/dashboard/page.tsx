"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

interface Profile {
  eco_points: number;
  full_name?: string;
  avg_rating?: number;
  rating_count?: number;
}

const ECO_LEVELS = [
  { name: "Seedling",  min: 0,   max: 50,  color: "bg-green-400",  emoji: "🌱" },
  { name: "Sprout",    min: 50,  max: 150, color: "bg-green-500",  emoji: "🌿" },
  { name: "Sapling",   min: 150, max: 300, color: "bg-teal-500",   emoji: "🌳" },
  { name: "Guardian",  min: 300, max: 500, color: "bg-blue-500",   emoji: "🌍" },
  { name: "Platinum",  min: 500, max: 999, color: "bg-purple-500", emoji: "⚡" },
];

function getLevel(points: number) {
  return ECO_LEVELS.findLast((l) => points >= l.min) ?? ECO_LEVELS[0];
}

function getNextLevel(points: number) {
  return ECO_LEVELS.find((l) => points < l.max) ?? ECO_LEVELS[ECO_LEVELS.length - 1];
}

export default function DashboardPage() {
  const [user, setUser]                   = useState<any>(null);
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [listingCount, setListingCount]   = useState(0);
  const [requestCount, setRequestCount]   = useState(0);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { window.location.href = "/login"; return; }
      setUser(authData.user);

      const [
        { data: prof },
        { count: listings },
        { count: requests },
        { data: recentL },
        { data: recentR },
      ] = await Promise.all([
        supabase.from("profiles")
          .select("eco_points, full_name, avg_rating, rating_count")
          .eq("id", authData.user.id).single(),
        supabase.from("listings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authData.user.id).eq("status", "active"),
        supabase.from("swap_requests")
          .select("*", { count: "exact", head: true })
          .eq("requester_id", authData.user.id),
        supabase.from("listings")
          .select("id, title, image_url, created_at, status")
          .eq("user_id", authData.user.id)
          .order("created_at", { ascending: false }).limit(3),
        supabase.from("swap_requests")
          .select("id, status, created_at, listings(title, image_url)")
          .eq("requester_id", authData.user.id)
          .order("created_at", { ascending: false }).limit(3),
      ]);

      setProfile(prof);
      setListingCount(listings ?? 0);
      setRequestCount(requests ?? 0);
      setRecentListings(recentL ?? []);
      setRecentRequests(recentR ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const points    = profile?.eco_points ?? 0;
  const level     = getLevel(points);
  const nextLevel = getNextLevel(points);
  const progress  = Math.min(((points - nextLevel.min) / (nextLevel.max - nextLevel.min)) * 100, 100);
  const ptsToNext = nextLevel.max - points;
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Eco Swapper";

  const STATUS_COLORS: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-700",
    accepted:  "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    rejected:  "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-1">Here's your sustainability overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Eco Points */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Eco Points</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${level.color}`}>
              {level.emoji} {level.name}
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {points} <span className="text-lg font-normal text-gray-400">pts</span>
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className={`h-2 rounded-full transition-all ${level.color}`}
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400">
            {level.name} &nbsp;·&nbsp; {nextLevel.name} in <span className="font-semibold text-gray-600">{ptsToNext} pts</span>
          </p>
        </div>

        {/* Listings */}
        <Link href="/dashboard/listings"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">My Listings</p>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {listingCount}<span className="text-lg font-normal text-gray-400">+</span>
          </p>
          <p className="text-xs text-gray-400">Active items</p>
        </Link>

        {/* Requests */}
        <Link href="/dashboard/requests"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Swap Requests</p>
            <span className="text-2xl">🔄</span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {requestCount}<span className="text-lg font-normal text-gray-400">+</span>
          </p>
          <p className="text-xs text-gray-400">Outgoing requests</p>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent listings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Listings</h2>
            <Link href="/dashboard/listings"
              className="text-xs font-semibold text-green-600 hover:text-green-700 transition">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentListings.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No listings yet</p>
                <Link href="/dashboard/listings"
                  className="text-xs font-semibold text-green-600 hover:underline mt-1 block">
                  Create your first listing →
                </Link>
              </div>
            ) : recentListings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                  {l.image_url
                    ? <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                    : "📦"
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  l.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent requests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Requests</h2>
            <Link href="/dashboard/requests"
              className="text-xs font-semibold text-green-600 hover:text-green-700 transition">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No requests yet</p>
                <Link href="/dashboard/listings"
                  className="text-xs font-semibold text-green-600 hover:underline mt-1 block">
                  Browse listings to swap →
                </Link>
              </div>
            ) : recentRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                  {r.listings?.image_url
                    ? <img src={r.listings.image_url} alt="" className="w-full h-full object-cover" />
                    : "🔄"
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.listings?.title ?? "Untitled"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}