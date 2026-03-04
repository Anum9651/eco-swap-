"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

interface Profile   { eco_points: number }
interface Listing   { id: string; title: string; status: string; condition?: string; created_at: string; image_url?: string }
interface SwapRequest { id: string; status: string; created_at: string; listings?: { title: string } }

const LEVELS = [
  { label: "Bronze",   min: 0,   max: 20,  bar: "bg-orange-400" },
  { label: "Silver",   min: 20,  max: 50,  bar: "bg-gray-400"   },
  { label: "Gold",     min: 50,  max: 100, bar: "bg-yellow-400" },
  { label: "Platinum", min: 100, max: 200, bar: "bg-blue-400"   },
] as const;

function getLevel(pts: number)     { return [...LEVELS].reverse().find((l) => pts >= l.min) ?? LEVELS[0]; }
function getNextLevel(pts: number) { return LEVELS.find((l) => pts < l.max) ?? null; }

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:            { label: "Pending",              className: "bg-yellow-100 text-yellow-700" },
  accepted:           { label: "Accepted",             className: "bg-purple-100 text-purple-700" },
  completion_pending: { label: "Awaiting Confirmation",className: "bg-blue-100 text-blue-700"    },
  completed:          { label: "Completed",            className: "bg-green-100 text-green-700"  },
  rejected:           { label: "Rejected",             className: "bg-red-100 text-red-700"      },
};

export default function DashboardOverview() {
  const [user, setUser]                   = useState<any>(null);
  const [authChecked, setAuthChecked]     = useState(false);
  const [ecoPoints, setEcoPoints]         = useState(0);
  const [recentListings, setRecentListings]   = useState<Listing[]>([]);
  const [recentRequests, setRecentRequests]   = useState<SwapRequest[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);
      setAuthChecked(true);
    });
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: profile }, { data: listings }, { data: requests }] = await Promise.all([
        supabase.from("profiles").select("eco_points").eq("id", user.id).single(),
        supabase.from("listings").select("id, title, status, condition, created_at, image_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("swap_requests").select("id, status, created_at, listings(title)")
          .eq("requester_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setEcoPoints((profile as Profile | null)?.eco_points ?? 0);
      setRecentListings((listings as Listing[] | null) ?? []);
      setRecentRequests((requests as SwapRequest[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  const level      = getLevel(ecoPoints);
  const nextLevel  = getNextLevel(ecoPoints);
  const progress   = nextLevel
    ? Math.min(((ecoPoints - level.min) / (nextLevel.max - level.min)) * 100, 100)
    : 100;
  const pointsToNext = nextLevel ? nextLevel.max - ecoPoints : 0;

  return (
    <div className="space-y-8">

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-1">Here's your sustainability overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Eco Points */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Eco Points</p>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
              {level.label}
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900">
            {ecoPoints.toLocaleString()}
            <span className="text-base font-medium text-gray-400 ml-1.5">pts</span>
          </p>
          <div className="mt-5">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${level.bar}`}
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-xs text-gray-400">{level.label}</p>
              {nextLevel
                ? <p className="text-xs text-gray-400">{nextLevel.label} in <span className="font-semibold text-gray-600">{pointsToNext} pts</span></p>
                : <p className="text-xs font-semibold text-blue-500">Max level 🎉</p>
              }
            </div>
          </div>
        </div>

        {/* My Listings */}
        <StatCard
          label="My Listings"
          value={recentListings.length}
          suffix={recentListings.length === 3 ? "+" : ""}
          icon="📦"
          hint="Active items"
          href="/dashboard/listings"
          loading={loading}
        />

        {/* My Requests */}
        <StatCard
          label="Swap Requests"
          value={recentRequests.length}
          suffix={recentRequests.length === 3 ? "+" : ""}
          icon="🔄"
          hint="Outgoing requests"
          href="/dashboard/requests"
          loading={loading}
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Recent Listings */}
        <ActivityCard
          title="Recent Listings"
          href="/dashboard/listings"
          linkLabel="View all"
          empty={recentListings.length === 0}
          emptyText="No listings yet — create one to get started."
          loading={loading}
        >
          {recentListings.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-none">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {item.image_url
                  ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </ActivityCard>

        {/* Recent Requests */}
        <ActivityCard
          title="Recent Requests"
          href="/dashboard/requests"
          linkLabel="View all"
          empty={recentRequests.length === 0}
          emptyText="No swap requests yet."
          loading={loading}
        >
          {recentRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-none">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-sm">🔄</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{req.listings?.title ?? "Untitled"}</p>
                <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>
          ))}
        </ActivityCard>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, suffix = "", icon, hint, href, loading }: {
  label: string; value: number; suffix?: string; icon: string;
  hint: string; href: string; loading: boolean;
}) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      {loading
        ? <div className="h-9 w-16 bg-gray-100 rounded-xl animate-pulse" />
        : <p className="text-4xl font-bold text-gray-900">{value}{suffix}</p>
      }
      <p className="text-xs text-gray-400 mt-2">{hint}</p>
    </Link>
  );
}

function ActivityCard({ title, href, linkLabel, empty, emptyText, loading, children }: {
  title: string; href: string; linkLabel: string;
  empty: boolean; emptyText: string; loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs text-green-600 hover:text-green-700 font-medium transition">
          {linkLabel} →
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-400">{emptyText}</p>
          <Link href={href} className="mt-3 text-xs font-semibold text-green-600 hover:underline">Get started →</Link>
        </div>
      ) : children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${config.className}`}>
      {config.label}
    </span>
  );
}