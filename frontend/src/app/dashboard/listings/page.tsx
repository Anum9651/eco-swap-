"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";
import CreateListing from "../components/CreateListing";
import ListingsGrid from "../components/ListingsGrid";

const MapView = dynamic(() => import("../../../components/MapView"), { ssr: false });

export default function ListingsPage() {
  const [user, setUser]           = useState<any>(null);
  const [listings, setListings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
      } else {
        setUser(data.user);
        setAuthChecked(true);
      }
    };
    checkUser();
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data ?? []);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchListings();
  }, [user, fetchListings]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <CreateListing user={user} onListingCreated={fetchListings} />

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <ListingsGrid
            listings={listings}
            user={user}
            onRequestSwap={fetchListings}
          />
        )}

        {/* Map preview — only shows if any listing has coordinates */}
        {!loading && listings.some((l) => l.latitude && l.longitude) && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">📍 Listings Near You</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {listings.filter((l) => l.latitude && l.longitude).length} listing
                  {listings.filter((l) => l.latitude && l.longitude).length !== 1 ? "s" : ""} on the map
                </p>
              </div>
              <a href="/dashboard/map"
                className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl border border-green-100 transition">
                Open full map →
              </a>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <MapView
                listings={listings.filter((l) => l.latitude && l.longitude)}
                height="300px"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between gap-3">
          <div className="h-4 bg-gray-100 rounded-full w-2/3" />
          <div className="h-4 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-9 bg-gray-100 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}