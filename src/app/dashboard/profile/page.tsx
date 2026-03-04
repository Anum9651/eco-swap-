"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import ActivityTab from "../components/ActivityTab";
import StarRating from "../components/StarRating";

interface Profile {
  eco_points: number;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  city?: string;
  country?: string;
  avg_rating?: number;
  rating_count?: number;
}

interface EcoReport {
  summary: string;
  co2_saved_kg: number;
  items_diverted: number;
  equivalent: string;
  tip: string;
  badge: string;
}

const LEVELS = [
  { label: "Bronze",   min: 0,   max: 20,  color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200", bar: "bg-orange-400" },
  { label: "Silver",   min: 20,  max: 50,  color: "text-gray-500",   bg: "bg-gray-50",    border: "border-gray-200",   bar: "bg-gray-400"   },
  { label: "Gold",     min: 50,  max: 100, color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-200", bar: "bg-yellow-400" },
  { label: "Platinum", min: 100, max: 200, color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200",   bar: "bg-blue-400"   },
] as const;

function getLevel(pts: number)     { return [...LEVELS].reverse().find((l) => pts >= l.min) ?? LEVELS[0]; }
function getNextLevel(pts: number) { return LEVELS.find((l) => pts < l.max) ?? null; }

export default function ProfilePage() {
  const [user, setUser]               = useState<any>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Eco report
  const [report, setReport]               = useState<EcoReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError]     = useState("");
  const [swapCount, setSwapCount]         = useState(0);
  const [donateCount, setDonateCount]     = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);

      const [{ data: profileData }, { count: swaps }, { count: donations }] = await Promise.all([
        supabase.from("profiles")
          .select("eco_points, full_name, avatar_url, created_at, city, country")
          .eq("id", data.user.id).single(),
        supabase.from("swap_requests")
          .select("*", { count: "exact", head: true })
          .eq("requester_id", data.user.id).eq("status", "completed"),
        supabase.from("listings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", data.user.id).eq("listing_type", "donate").eq("status", "completed"),
        supabase.from("profiles")
  .select("eco_points, full_name, avatar_url, created_at, city, country, avg_rating, rating_count")
  .eq("id", data.user.id).single(),
      ]);

      setProfile(profileData ?? { eco_points: 0 });
      setSwapCount(swaps ?? 0);
      setDonateCount(donations ?? 0);
      setAuthChecked(true);
    };
    load();
  }, []);

  const handleGenerateReport = async () => {
    if (!profile) return;
    setReportLoading(true);
    setReportError("");
    setReport(null);

    try {
      const res = await fetch("/api/agent/eco-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eco_points:   profile.eco_points,
          swap_count:   swapCount,
          donate_count: donateCount,
          level:        getLevel(profile.eco_points).label,
        }),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

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

  const ecoPoints    = profile?.eco_points ?? 0;
  const level        = getLevel(ecoPoints);
  const nextLevel    = getNextLevel(ecoPoints);
  const progress     = nextLevel
    ? Math.min(((ecoPoints - level.min) / (nextLevel.max - level.min)) * 100, 100)
    : 100;
  const pointsToNext = nextLevel ? nextLevel.max - ecoPoints : 0;
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`h-24 ${level.bg} border-b ${level.border}`} />
          <div className="px-8 pb-8">
            <div className="flex items-end justify-between -mt-10 mb-5">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-white flex items-center justify-center text-3xl overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  : <span>{user?.email?.[0]?.toUpperCase() ?? "?"}</span>
                }
              </div>
              {memberSince && <p className="text-xs text-gray-400 mb-1">Member since {memberSince}</p>}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.full_name ?? "Eco Swapper"}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
            {(profile?.city || profile?.country) && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                📍 {[profile.city, profile.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2">
  <StarRating
    rating={profile?.avg_rating ?? 0}
    count={profile?.rating_count ?? 0}
    size="sm"
  />
</div>

        {/* Eco Points card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Eco Points</p>
              <p className="text-4xl font-bold text-gray-900 mt-1">
                {ecoPoints.toLocaleString()}
                <span className="text-base font-medium text-gray-400 ml-1.5">pts</span>
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-full border ${level.color} ${level.bg} ${level.border}`}>
              {level.label === "Platinum" && "💎"}
              {level.label === "Gold"     && "🥇"}
              {level.label === "Silver"   && "🥈"}
              {level.label === "Bronze"   && "🥉"}
              {level.label}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{level.label}</span>
              {nextLevel
                ? <span>{nextLevel.label} in <span className="font-semibold text-gray-600">{pointsToNext} pts</span></span>
                : <span className="font-semibold text-blue-600">Max level reached 🎉</span>
              }
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${level.bar}`}
                style={{ width: `${progress}%` }} />
            </div>
            {nextLevel && (
              <p className="text-xs text-gray-400 mt-2 text-right">{ecoPoints} / {nextLevel.max} pts</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Level",      value: level.label,           icon: "🏅" },
            { label: "Swaps Done", value: swapCount.toString(),   icon: "🔄" },
            { label: "Donated",    value: donateCount.toString(), icon: "🎁" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Eco Impact Report */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">🌍 Eco Impact Report</h3>
              <p className="text-xs text-gray-400 mt-0.5">AI-generated sustainability analysis of your activity</p>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="flex items-center gap-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition active:scale-95"
            >
              {reportLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating…
                </>
              ) : report ? "Regenerate" : "Generate Report"}
            </button>
          </div>

          <div className="p-6">
            {reportError && (
              <p className="text-sm text-red-500 text-center py-4">{reportError}</p>
            )}

            {!report && !reportLoading && !reportError && (
              <div className="flex flex-col items-center text-center py-8 gap-3">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl">🌱</div>
                <p className="text-sm font-medium text-gray-600">No report generated yet</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Click "Generate Report" to get a personalised AI analysis of your environmental impact
                </p>
              </div>
            )}

            {reportLoading && (
              <div className="flex flex-col items-center text-center py-8 gap-3">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">Analysing your eco impact…</p>
                <p className="text-xs text-gray-400">This takes a few seconds</p>
              </div>
            )}

            {report && !reportLoading && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-3xl">{report.badge}</span>
                  <p className="text-sm text-green-800 font-medium leading-snug">{report.summary}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{report.co2_saved_kg}</p>
                    <p className="text-xs text-gray-500 mt-1">kg CO₂ saved</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{report.items_diverted}</p>
                    <p className="text-xs text-gray-500 mt-1">items from landfill</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-gray-900 leading-tight">{report.equivalent}</p>
                    <p className="text-xs text-gray-500 mt-1">equivalent</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-lg mt-0.5">💡</span>
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-0.5">Eco Tip</p>
                    <p className="text-sm text-blue-800">{report.tip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders & Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Orders & Activity</h2>
            <span className="text-xs text-gray-400">Your full history</span>
          </div>
          <ActivityTab userId={user.id} />
        </div>

      </div>
    </div>
  );
}