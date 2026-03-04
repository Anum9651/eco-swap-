"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import StarRating from "@/app/dashboard/components/StarRating";
import Link from "next/link";

interface Profile {
  id: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  eco_points: number;
  avg_rating?: number;
  rating_count?: number;
  city?: string;
  country?: string;
  created_at?: string;
}

const ECO_LEVELS = [
  { name: "Seedling",  min: 0,   color: "bg-green-400",  emoji: "🌱" },
  { name: "Sprout",    min: 50,  color: "bg-green-500",  emoji: "🌿" },
  { name: "Sapling",   min: 150, color: "bg-teal-500",   emoji: "🌳" },
  { name: "Guardian",  min: 300, color: "bg-blue-500",   emoji: "🌍" },
  { name: "Platinum",  min: 500, color: "bg-purple-500", emoji: "⚡" },
];

function getLevel(points: number) {
  return ECO_LEVELS.findLast((l) => points >= l.min) ?? ECO_LEVELS[0];
}

export default function PublicProfilePage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user?.id === id) {
        router.replace("/dashboard/profile");
        return;
      }

      const [{ data: prof }, { data: listingsData }] = await Promise.all([
        supabase.from("profiles")
          .select("id, full_name, bio, avatar_url, eco_points, avg_rating, rating_count, city, country, created_at")
          .eq("id", id).single(),
        supabase.from("listings")
          .select("id, title, image_url, category, condition, listing_type, eco_score, status")
          .eq("user_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setProfile(prof);
      setListings(listingsData ?? []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-full w-24" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          <div className="flex gap-6">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-100 rounded-full w-40" />
              <div className="h-4 bg-gray-100 rounded-full w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">👤</div>
        <p className="text-sm font-semibold text-gray-700">User not found</p>
        <Link href="/dashboard" className="text-xs text-green-600 hover:underline mt-2">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const level       = getLevel(profile.eco_points ?? 0);
  const displayName = profile.full_name ?? "Eco Swapper";
  const initials    = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-6 max-w-2xl">

      <Link href="/dashboard/listings"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={`h-20 ${level.color} opacity-20`} />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-green-600 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">{initials}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${level.color}`}>
              {level.emoji} {level.name}
            </span>
          </div>

          {(profile.city || profile.country) && (
            <p className="text-sm text-gray-400 mb-2">
              📍 {[profile.city, profile.country].filter(Boolean).join(", ")}
            </p>
          )}

          <StarRating rating={profile.avg_rating ?? 0} count={profile.rating_count ?? 0} size="sm" />

          {profile.bio && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{profile.bio}</p>
          )}

          {memberSince && (
            <p className="text-xs text-gray-400 mt-2">Member since {memberSince}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
          <div className="flex flex-col items-center py-4">
            <p className="text-xl font-black text-green-600">{profile.eco_points ?? 0}<span className="text-sm font-normal text-gray-400 ml-0.5">pts</span></p>
            <p className="text-xs text-gray-400 mt-0.5">Eco Points</p>
          </div>
          <div className="flex flex-col items-center py-4">
            <p className="text-xl font-black text-gray-900">{listings.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active Listings</p>
          </div>
        </div>
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Active Listings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
            {listings.map((l) => (
              <div key={l.id} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="h-32 bg-gray-100 overflow-hidden">
                  {l.image_url
                    ? <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
                  }
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-800 truncate">{l.title}</p>
                  <p className="text-xs text-gray-400">{l.category}</p>
                  {l.eco_score > 0 && (
                    <p className="text-xs text-green-600 font-semibold mt-1">🌿 {l.eco_score}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}