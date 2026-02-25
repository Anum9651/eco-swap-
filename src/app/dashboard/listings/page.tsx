"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

import CreateListing from "../components/CreateListing";
import ListingsGrid from "../components/ListingsGrid";

export default function ListingsPage() {
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= AUTH ================= */

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/";
      } else {
        setUser(data.user);
      }
    };

    checkUser();
  }, []);

  /* ================= FETCH LISTINGS ================= */

  const fetchListings = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "active") // 🔥 ONLY ACTIVE LISTINGS
      .order("created_at", { ascending: false });

    if (data) setListings(data);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchListings();
  }, [user]);

  /* ================= LOADING ================= */

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="max-w-6xl mx-auto p-8">

      {/* Create Listing */}
      <CreateListing
        user={user}
        onListingCreated={fetchListings}
      />

      {/* Listings */}
      {loading ? (
        <p className="text-center text-gray-500">
          Loading listings...
        </p>
      ) : (
        <ListingsGrid
          listings={listings}
          user={user}
          onRequestSwap={fetchListings}
        />
      )}
    </div>
  );
}