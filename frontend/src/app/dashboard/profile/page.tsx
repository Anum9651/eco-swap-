"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import StarRating from "@/app/dashboard/components/StarRating";
import ActivityTab from "../components/ActivityTab";

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

export default function ProfilePage() {
  const [user, setUser]         = useState<any>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio]   = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");

  // Avatar
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [listingCount, setListingCount] = useState(0);
  const [swapCount, setSwapCount]       = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      setUser(authData.user);

      const [{ data: prof }, { count: listings }, { count: swaps }] = await Promise.all([
        supabase.from("profiles")
          .select("id, full_name, bio, avatar_url, eco_points, avg_rating, rating_count, city, country, created_at")
          .eq("id", authData.user.id).single(),
        supabase.from("listings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", authData.user.id),
        supabase.from("swap_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .or(`owner_id.eq.${authData.user.id},requester_id.eq.${authData.user.id}`),
      ]);

      setProfile(prof);
      setListingCount(listings ?? 0);
      setSwapCount(swaps ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.full_name ?? "");
    setEditBio(profile.bio ?? "");
    setEditCity(profile.city ?? "");
    setEditCountry(profile.country ?? "");
    setEditing(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    let avatarUrl = profile.avatar_url;

    // Upload new avatar if selected
    if (avatarFile) {
      setUploadingAvatar(true);
      const ext      = avatarFile.name.split(".").pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("listing-images")
        .upload(fileName, avatarFile, { upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from("listing-images").getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }
      setUploadingAvatar(false);
    }

    await supabase.from("profiles").update({
      full_name:  editName.trim() || null,
      bio:        editBio.trim()  || null,
      city:       editCity.trim() || null,
      country:    editCountry.trim() || null,
      avatar_url: avatarUrl,
    }).eq("id", user.id);

    setProfile((prev) => prev ? {
      ...prev,
      full_name:  editName.trim() || undefined,
      bio:        editBio.trim()  || undefined,
      city:       editCity.trim() || undefined,
      country:    editCountry.trim() || undefined,
      avatar_url: avatarUrl,
    } : prev);

    setAvatarFile(null);
    setAvatarPreview(null);
    setEditing(false);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex gap-6">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-100 rounded-full w-48" />
              <div className="h-4 bg-gray-100 rounded-full w-32" />
              <div className="h-4 bg-gray-100 rounded-full w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const level       = getLevel(profile?.eco_points ?? 0);
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Eco Swapper";
  const initials    = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Cover banner */}
        <div className={`h-24 ${level.color} opacity-20`} />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4 flex-wrap gap-3">

            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-green-600 flex items-center justify-center">
                {(avatarPreview ?? profile?.avatar_url) ? (
                  <img src={avatarPreview ?? profile?.avatar_url} alt={displayName}
                    className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xl">{initials}</span>
                )}
              </div>
              {editing && (
                <>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center shadow-md transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*"
                    className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>

            {/* Edit / Save button */}
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  ✅ Saved!
                </span>
              )}
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setAvatarPreview(null); setAvatarFile(null); }}
                    className="text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-2 rounded-xl transition">
                    {saving ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : null}
                    {saving ? "Saving…" : "Save Profile"}
                  </button>
                </>
              ) : (
                <button onClick={openEdit}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* View / Edit content */}
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Display Name</label>
                  <input className={inputClass} value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                  <input className={inputClass} value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="e.g. London" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                <input className={inputClass} value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="e.g. United Kingdom" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bio</label>
                <textarea rows={3} className={`${inputClass} resize-none`}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the community about yourself — what you like to swap, your eco values…" />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${level.color}`}>
                  {level.emoji} {level.name}
                </span>
              </div>
              {(profile?.city || profile?.country) && (
                <p className="text-sm text-gray-400 mt-1">
                  📍 {[profile.city, profile.country].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-2">
                <StarRating rating={profile?.avg_rating ?? 0} count={profile?.rating_count ?? 0} size="sm" />
              </div>
              {profile?.bio && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{profile.bio}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Member since {memberSince}</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 border-t border-gray-100 divide-x divide-gray-100">
          {[
            { label: "Eco Points",   value: profile?.eco_points ?? 0, suffix: "pts", color: "text-green-600" },
            { label: "Listings",     value: listingCount,              suffix: "",    color: "text-gray-900"  },
            { label: "Swaps Done",   value: swapCount,                 suffix: "",    color: "text-purple-600"},
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-4">
              <p className={`text-xl font-black ${s.color}`}>{s.value}{s.suffix && <span className="text-sm font-normal text-gray-400 ml-0.5">{s.suffix}</span>}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Activity</h2>
        </div>
        <div className="p-6">
          {user && <ActivityTab userId={user.id} />}
        </div>
      </div>
    </div>
  );
}