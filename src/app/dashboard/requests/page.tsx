"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

import MyRequests from "../components/MyRequests";
import IncomingRequests from "../components/IncomingRequests";

export default function RequestsPage() {
  const [user, setUser] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

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

  /* ================= FETCH ================= */

  const fetchMyRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("swap_requests")
      .select(`*, listings (title)`)
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setMyRequests(data);
  };

  const fetchIncomingRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("swap_requests")
      .select(`*, listings (title)`)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setIncomingRequests(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    fetchIncomingRequests();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <MyRequests requests={myRequests} />
      <IncomingRequests requests={incomingRequests} />
    </div>
  );
}