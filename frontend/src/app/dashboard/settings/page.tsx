"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, label, description, action, danger = false }: SettingRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 px-5 rounded-xl transition-colors ${
      danger ? "hover:bg-red-50" : "hover:bg-gray-50"
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-500"
        }`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-semibold ${danger ? "text-red-600" : "text-gray-800"}`}>{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">{action}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        enabled ? "bg-green-500" : "bg-gray-200"
      }`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

export default function SettingsPage() {
  const [loggingOut, setLoggingOut]       = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [ecoReminders, setEcoReminders]   = useState(true);

  const [user, setUser]           = useState<any>(null);
  const [city, setCity]           = useState("");
  const [country, setCountry]     = useState("");
  const [savingLoc, setSavingLoc] = useState(false);
  const [locSaved, setLocSaved]   = useState(false);
  const [locError, setLocError]   = useState("");
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("city, country")
        .eq("id", data.user.id)
        .single();
      if (profile) {
        setCity(profile.city ?? "");
        setCountry(profile.country ?? "");
      }
    });
  }, []);

  const geocodeLocation = async (cityVal: string, countryVal: string) => {
    const query = [cityVal, countryVal].filter(Boolean).join(", ");
    if (!query) return { lat: null, lng: null };
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return { lat: null, lng: null };
    } catch {
      return { lat: null, lng: null };
    } finally {
      setGeocoding(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!user) return;
    if (!city.trim() && !country.trim()) {
      setLocError("Please enter at least a city or country.");
      return;
    }
    setSavingLoc(true);
    setLocError("");

    const { lat, lng } = await geocodeLocation(city.trim(), country.trim());

    const { error } = await supabase
      .from("profiles")
      .update({
        city:      city.trim(),
        country:   country.trim(),
        latitude:  lat,
        longitude: lng,
      })
      .eq("id", user.id);

    setSavingLoc(false);
    if (error) { setLocError("Failed to save. Try again."); return; }
    setLocSaved(true);
    setTimeout(() => setLocSaved(false), 3000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your account and preferences</p>
        </div>

        {/* Account */}
        <SectionCard title="Account">
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Edit Profile"
            description="Update your name, avatar, and bio"
            action={
              <a href="/dashboard/profile"
                className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
                Go to Profile →
              </a>
            }
          />
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
            label="Change Password"
            description="Update your login credentials"
            action={
              <button className="text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition">
                Update
              </button>
            }
          />
        </SectionCard>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-400">
              Used to show your listings on the map. We convert your city to coordinates automatically — we never share your exact location.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                <input className={inputClass} placeholder="e.g. London"
                  value={city} onChange={(e) => { setCity(e.target.value); setLocError(""); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                <input className={inputClass} placeholder="e.g. United Kingdom"
                  value={country} onChange={(e) => { setCountry(e.target.value); setLocError(""); }} />
              </div>
            </div>
            {locError && <p className="text-xs text-red-500">{locError}</p>}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>📍 {city && country ? `${city}, ${country}` : city || country || "No location set"}</p>
                {geocoding && <p className="text-green-500">🔍 Finding coordinates…</p>}
              </div>
              <button onClick={handleSaveLocation} disabled={savingLoc || geocoding}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-2 rounded-xl transition active:scale-95">
                {savingLoc || geocoding ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {geocoding ? "Geocoding…" : "Saving…"}
                  </>
                ) : locSaved ? "✓ Saved" : "Save Location"}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <SectionCard title="Notifications">
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            label="Swap Notifications"
            description="Get notified about new swap requests and updates"
            action={<Toggle enabled={notifications} onChange={setNotifications} />}
          />
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>}
            label="Eco Reminders"
            description="Weekly tips and sustainability nudges"
            action={<Toggle enabled={ecoReminders} onChange={setEcoReminders} />}
          />
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard title="Danger Zone">
          <SettingRow
            danger
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
            label="Sign Out"
            description="Sign out of your account on this device"
            action={
              <button onClick={handleLogout} disabled={loggingOut}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 px-3 py-1.5 rounded-lg transition active:scale-95">
                {loggingOut ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing out…
                  </>
                ) : "Sign Out"}
              </button>
            }
          />
        </SectionCard>

      </div>
    </div>
  );
}