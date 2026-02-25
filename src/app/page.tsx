"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardOverview() {
  const [user, setUser] = useState<any>(null);
  const [ecoPoints, setEcoPoints] = useState<number>(0);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
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

      setLoading(false);
    };

    checkUser();
  }, []);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (!user) return;

    fetchEcoPoints();
    fetchRecentListings();
    fetchRecentRequests();
  }, [user]);

  const fetchEcoPoints = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("eco_points")
      .eq("id", user.id)
      .single();

    if (data) setEcoPoints(data.eco_points || 0);
  };

  const fetchRecentListings = async () => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) setRecentListings(data);
  };

  const fetchRecentRequests = async () => {
    const { data } = await supabase
      .from("swap_requests")
      .select("*, listings(title)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) setRecentRequests(data);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">Loading Dashboard...</p>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="max-w-7xl mx-auto">

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-xl transition">
          <h3 className="text-gray-500 text-sm mb-2">Eco Points</h3>
          <p className="text-3xl font-bold text-green-600">
            {ecoPoints}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-xl transition">
          <h3 className="text-gray-500 text-sm mb-2">My Listings</h3>
          <p className="text-3xl font-bold">
            {recentListings.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-xl transition">
          <h3 className="text-gray-500 text-sm mb-2">My Requests</h3>
          <p className="text-3xl font-bold">
            {recentRequests.length}
          </p>
        </div>

      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

        {/* Recent Listings */}
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="text-lg font-semibold mb-4">
            Recent Listings
          </h2>

          {recentListings.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No listings yet.
            </p>
          ) : (
            recentListings.map((item) => (
              <p
                key={item.id}
                className="text-sm py-1 border-b last:border-none"
              >
                {item.title}
              </p>
            ))
          )}
        </div>

        {/* Recent Requests */}
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="text-lg font-semibold mb-4">
            Recent Requests
          </h2>

          {recentRequests.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No requests yet.
            </p>
          ) : (
            recentRequests.map((req) => (
              <p
                key={req.id}
                className="text-sm py-1 border-b last:border-none"
              >
                {req.listings?.title}
              </p>
            ))
          )}
        </div>

      </div>

    </div>
  );
}