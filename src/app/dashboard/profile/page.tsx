"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [ecoPoints, setEcoPoints] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/";
      } else {
        setUser(data.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("eco_points")
          .eq("id", data.user.id)
          .single();

        if (profile) setEcoPoints(profile.eco_points || 0);
      }
    };

    loadUser();
  }, []);

  const getEcoLevel = (points: number) => {
    if (points >= 100) return "Platinum";
    if (points >= 50) return "Gold";
    if (points >= 20) return "Silver";
    return "Bronze";
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h2 className="text-2xl font-bold mb-4">My Profile</h2>

        <p className="text-gray-600">{user.email}</p>

        <div className="mt-6">
          <p className="text-lg font-semibold">
            Eco Points: {ecoPoints}
          </p>

          <span className="inline-block mt-2 px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            {getEcoLevel(ecoPoints)}
          </span>
        </div>
      </div>
    </div>
  );
}