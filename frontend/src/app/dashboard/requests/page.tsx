"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import MyRequests from "../components/MyRequests";
import IncomingRequests from "../components/IncomingRequests";

export default function RequestsPage() {
  const [user, setUser] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<"incoming" | "mine">("incoming");

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: my }, { data: incoming }] = await Promise.all([
        supabase
          .from("swap_requests")
          .select("*, listings (title, image_url, category)")
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("swap_requests")
          .select("*, listings (title, image_url, category)")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setMyRequests(my ?? []);
      setIncomingRequests(incoming ?? []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

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

  const pendingIncoming = incomingRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Swap Requests</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your incoming and outgoing swap requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1 mb-8">
          {([
            { key: "incoming", label: "Incoming", count: pendingIncoming, data: incomingRequests },
            { key: "mine",     label: "My Requests", count: 0,            data: myRequests },
          ] as const).map(({ key, label, count, data }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 ${
                activeTab === key
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  activeTab === key ? "bg-white/25 text-white" : "bg-red-500 text-white"
                }`}>
                  {count}
                </span>
              )}
              {count === 0 && data.length > 0 && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {data.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "incoming" && (
              <IncomingRequests requests={incomingRequests} refresh={fetchData} />
            )}
            {activeTab === "mine" && (
              <MyRequests requests={myRequests} refresh={fetchData} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 animate-pulse">
      <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="flex justify-between gap-4">
          <div className="h-4 bg-gray-100 rounded-full w-1/2" />
          <div className="h-4 bg-gray-100 rounded-full w-20" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full w-1/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
      </div>
    </div>
  );
}