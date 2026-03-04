"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../../lib/supabase";

interface SwapRequest {
  id: string;
  status: string;
  message?: string;
  counter_offer?: string;
  created_at: string;
  expires_at?: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  completion_confirmed_by: string[];
  listings?: {
    id: string;
    title: string;
    image_url?: string;
    category?: string;
    listing_type?: string;
  };
  requester_profile?: {
    full_name?: string;
    avatar_url?: string;
    eco_points?: number;
    avg_rating?: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:            { label: "Pending",            color: "text-yellow-700", bg: "bg-yellow-100", icon: "⏳" },
  accepted:           { label: "Accepted",           color: "text-purple-700", bg: "bg-purple-100", icon: "✅" },
  completion_pending: { label: "Confirming",         color: "text-blue-700",   bg: "bg-blue-100",   icon: "🤝" },
  completed:          { label: "Completed",          color: "text-green-700",  bg: "bg-green-100",  icon: "🎉" },
  rejected:           { label: "Rejected",           color: "text-red-700",    bg: "bg-red-100",    icon: "❌" },
  expired:            { label: "Expired",            color: "text-gray-600",   bg: "bg-gray-100",   icon: "⌛" },
  countered:          { label: "Counter Offer",      color: "text-orange-700", bg: "bg-orange-100", icon: "🔁" },
};

function TimeAgo({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return <span className="text-xs text-gray-400">Just now</span>;
  if (mins < 60)  return <span className="text-xs text-gray-400">{mins}m ago</span>;
  if (hours < 24) return <span className="text-xs text-gray-400">{hours}h ago</span>;
  return <span className="text-xs text-gray-400">{days}d ago</span>;
}

function ExpiryBadge({ expiresAt, status }: { expiresAt?: string; status: string }) {
  if (!expiresAt || status !== "pending") return null;
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return <span className="text-xs text-gray-400">Expired</span>;
  if (daysLeft <= 2) return (
    <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
      ⚠️ Expires in {daysLeft}d
    </span>
  );
  return <span className="text-xs text-gray-400">Expires in {daysLeft}d</span>;
}

export default function RequestsPage() {
  const [user, setUser]               = useState<any>(null);
  const [incoming, setIncoming]       = useState<SwapRequest[]>([]);
  const [outgoing, setOutgoing]       = useState<SwapRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"incoming" | "outgoing">("incoming");
  const [actionId, setActionId]       = useState<string | null>(null);
  const [newAlert, setNewAlert]       = useState<string | null>(null);

  // Modal state
  const [rejectModal, setRejectModal]   = useState<SwapRequest | null>(null);
  const [counterModal, setCounterModal] = useState<SwapRequest | null>(null);
  const [rejectMsg, setRejectMsg]       = useState("");
  const [counterMsg, setCounterMsg]     = useState("");
  const prevIncomingCount = useRef(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Expire old pending requests first
    await supabase.rpc("expire_old_requests");

    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase
        .from("swap_requests")
        .select("*, listings(id, title, image_url, category, listing_type)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("swap_requests")
        .select("*, listings(id, title, image_url, category, listing_type)")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    // Enrich incoming with requester profiles
    const incWithProfiles = await Promise.all(
      (inc ?? []).map(async (req) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, eco_points, avg_rating")
          .eq("id", req.requester_id)
          .single();
        return { ...req, requester_profile: profile };
      })
    );

    // Alert if new incoming requests arrived
    if (incWithProfiles.length > prevIncomingCount.current && prevIncomingCount.current > 0) {
      const newest = incWithProfiles[0];
      setNewAlert(`New swap request for "${newest.listings?.title}"!`);
      setTimeout(() => setNewAlert(null), 4000);
    }
    prevIncomingCount.current = incWithProfiles.length;

    setIncoming(incWithProfiles);
    setOutgoing(out ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Real-time subscription ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`requests:${user.id}`)
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "swap_requests",
        filter: `owner_id=eq.${user.id}`,
      }, () => fetchRequests())
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "swap_requests",
        filter: `requester_id=eq.${user.id}`,
      }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRequests]);

  const handleAccept = async (req: SwapRequest) => {
    setActionId(req.id);
    await supabase.from("swap_requests").update({ status: "accepted" }).eq("id", req.id);
    await supabase.from("notifications").insert({
      user_id:    req.requester_id,
      type:       "request_accepted",
      message:    `Your swap request for "${req.listings?.title}" was accepted! 🎉`,
      related_id: req.id,
    });
    await fetchRequests();
    setActionId(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionId(rejectModal.id);
    await supabase.from("swap_requests").update({
      status:  "rejected",
      message: rejectMsg.trim() || null,
    }).eq("id", rejectModal.id);
    await supabase.from("notifications").insert({
      user_id:    rejectModal.requester_id,
      type:       "request_rejected",
      message:    `Your swap request for "${rejectModal.listings?.title}" was declined.${rejectMsg ? ` Reason: ${rejectMsg}` : ""}`,
      related_id: rejectModal.id,
    });
    setRejectModal(null);
    setRejectMsg("");
    await fetchRequests();
    setActionId(null);
  };

  const handleCounter = async () => {
    if (!counterModal || !counterMsg.trim()) return;
    setActionId(counterModal.id);
    await supabase.from("swap_requests").update({
      status:       "countered",
      counter_offer: counterMsg.trim(),
    }).eq("id", counterModal.id);
    await supabase.from("notifications").insert({
      user_id:    counterModal.requester_id,
      type:       "counter_offer",
      message:    `Counter offer on "${counterModal.listings?.title}": ${counterMsg}`,
      related_id: counterModal.id,
    });
    setCounterModal(null);
    setCounterMsg("");
    await fetchRequests();
    setActionId(null);
  };

  const handleConfirmComplete = async (req: SwapRequest) => {
    setActionId(req.id);
    const confirmed = [...(req.completion_confirmed_by ?? []), user.id];
    const bothConfirmed = confirmed.length >= 2;
    await supabase.from("swap_requests").update({
      completion_confirmed_by: confirmed,
      status: bothConfirmed ? "completed" : "completion_pending",
    }).eq("id", req.id);
    if (bothConfirmed) {
      await Promise.all([
        supabase.from("listings").update({ status: "swapped" }).eq("id", req.listing_id),
        supabase.rpc("increment_eco_points", { user_id: user.id,         amount: 10 }),
        supabase.rpc("increment_eco_points", { user_id: req.requester_id, amount: 10 }),
      ]);
      await supabase.from("notifications").insert([
        { user_id: req.owner_id,     type: "swap_completed", message: `Swap for "${req.listings?.title}" completed! +10 eco points 🌿`, related_id: req.id },
        { user_id: req.requester_id, type: "swap_completed", message: `Swap for "${req.listings?.title}" completed! +10 eco points 🌿`, related_id: req.id },
      ]);
    }
    await fetchRequests();
    setActionId(null);
  };

  const pendingIncoming = incoming.filter((r) => r.status === "pending").length;
  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all";

  const RequestCard = ({ req, isIncoming }: { req: SwapRequest; isIncoming: boolean }) => {
    const status    = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
    const isLoading = actionId === req.id;
    const alreadyConfirmed = req.completion_confirmed_by?.includes(user?.id);

    return (
      <div className={`bg-white rounded-2xl border shadow-sm transition-all ${
        req.status === "pending" && isIncoming
          ? "border-green-200 shadow-green-50"
          : "border-gray-100"
      }`}>
        <div className="p-5">
          <div className="flex items-start gap-4">

            {/* Image */}
            <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
              {req.listings?.image_url
                ? <img src={req.listings.image_url} alt="" className="w-full h-full object-cover" />
                : "📦"
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {req.listings?.title ?? "Untitled"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{req.listings?.category}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  <ExpiryBadge expiresAt={req.expires_at} status={req.status} />
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
              </div>

              {/* Requester info — incoming only */}
              {isIncoming && req.requester_profile && (
                <div className="flex items-center gap-2 mt-2 p-2.5 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {req.requester_profile.avatar_url
                      ? <img src={req.requester_profile.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      : (req.requester_profile.full_name?.[0] ?? "U").toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">
                      {req.requester_profile.full_name ?? "Eco Swapper"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">🌿 {req.requester_profile.eco_points ?? 0} pts</span>
                      {req.requester_profile.avg_rating && req.requester_profile.avg_rating > 0 && (
                        <span className="text-xs text-yellow-500">⭐ {req.requester_profile.avg_rating}</span>
                      )}
                    </div>
                  </div>
                  <TimeAgo date={req.created_at} />
                </div>
              )}

              {/* Message */}
              {req.message && (
                <div className="mt-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium">💬 {req.message}</p>
                </div>
              )}

              {/* Counter offer */}
              {req.counter_offer && (
                <div className="mt-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-700 font-medium">🔁 Counter offer: {req.counter_offer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Incoming pending — accept / reject / counter */}
            {isIncoming && req.status === "pending" && (
              <>
                <button onClick={() => handleAccept(req)} disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl transition disabled:opacity-50">
                  {isLoading ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : "✅"}
                  Accept
                </button>
                <button onClick={() => setCounterModal(req)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition border border-orange-100">
                  🔁 Counter
                </button>
                <button onClick={() => setRejectModal(req)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition border border-red-100">
                  ❌ Reject
                </button>
              </>
            )}

            {/* Accepted — confirm completion */}
            {req.status === "accepted" && !alreadyConfirmed && (
              <button onClick={() => handleConfirmComplete(req)} disabled={isLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition disabled:opacity-50">
                {isLoading ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : "🤝"}
                Confirm Swap Done
              </button>
            )}

            {req.status === "completion_pending" && !alreadyConfirmed && (
              <button onClick={() => handleConfirmComplete(req)} disabled={isLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition disabled:opacity-50">
                🤝 Confirm Your Side
              </button>
            )}

            {req.status === "completion_pending" && alreadyConfirmed && (
              <span className="text-xs text-blue-500 font-medium py-2">
                ⏳ Waiting for other party to confirm…
              </span>
            )}

            {req.status === "completed" && (
              <span className="text-xs text-green-600 font-semibold py-2">
                🎉 Swap complete! +10 eco points earned
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Real-time alert toast */}
      {newAlert && (
        <div className="fixed top-20 right-6 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          🔔 {newAlert}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Reject Request</h2>
            <p className="text-sm text-gray-500">
              Rejecting swap request for <span className="font-semibold">{rejectModal.listings?.title}</span>.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Reason <span className="text-gray-400">(optional — sent to requester)</span>
              </label>
              <textarea rows={3} value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)}
                placeholder="e.g. Already swapped with someone else, item no longer available…"
                className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleReject}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter offer modal */}
      {counterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCounterModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Make a Counter Offer</h2>
            <p className="text-sm text-gray-500">
              Counter offer for <span className="font-semibold">{counterModal.listings?.title}</span>.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Your counter offer</label>
              <textarea rows={3} value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)}
                placeholder="e.g. I'd swap this for a similar item in better condition, or would you consider adding £10?"
                className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCounterModal(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleCounter} disabled={!counterMsg.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-xl transition">
                Send Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Swap Requests</h1>
        <p className="text-sm text-gray-400 mt-1">
          {pendingIncoming > 0
            ? `${pendingIncoming} pending request${pendingIncoming !== 1 ? "s" : ""} need your attention`
            : "Manage your incoming and outgoing swap requests"
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "incoming", label: "Incoming", icon: "📥", count: pendingIncoming },
          { key: "outgoing", label: "Outgoing", icon: "📤", count: 0              },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
            {t.count > 0 && (
              <span className="ml-1 w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-10 bg-gray-100 rounded-xl w-full mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "incoming" ? (
        incoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">📥</div>
            <p className="text-sm font-semibold text-gray-700">No incoming requests yet</p>
            <p className="text-xs text-gray-400 mt-1">When someone requests a swap, it'll appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incoming.map((req) => <RequestCard key={req.id} req={req} isIncoming={true} />)}
          </div>
        )
      ) : (
        outgoing.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">📤</div>
            <p className="text-sm font-semibold text-gray-700">No outgoing requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Browse listings and request a swap to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {outgoing.map((req) => <RequestCard key={req.id} req={req} isIncoming={false} />)}
          </div>
        )
      )}
    </div>
  );
}