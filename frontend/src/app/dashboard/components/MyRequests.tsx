"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import RatingModal from "./RatingModal";

interface SwapRequest {
  id: string;
  status: string;
  listing_id: string;
  owner_id: string;
  listings?: | { title: string; image_url?: string; category?: string; user_id: string; }
             | { title: string; image_url?: string; category?: string; user_id: string; }[];
}

// Helper to handle Supabase returning array or object for joined tables
function getListing(req: SwapRequest) {
  if (!req.listings) return undefined;
  return Array.isArray(req.listings) ? req.listings[0] : req.listings;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:            { label: "Pending",               className: "bg-yellow-100 text-yellow-700" },
  accepted:           { label: "Accepted",              className: "bg-purple-100 text-purple-700" },
  completion_pending: { label: "Awaiting Confirmation", className: "bg-blue-100 text-blue-700"    },
  completed:          { label: "Completed",             className: "bg-green-100 text-green-700"  },
  rejected:           { label: "Rejected",              className: "bg-red-100 text-red-700"      },
};

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {count > 0 && (
        <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

export default function MyRequests({ user }: { user: any }) {
  const [requests, setRequests]   = useState<SwapRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<{
    swapRequestId: string;
    reviewedId: string;
    listingId: string;
    listingTitle: string;
  } | null>(null);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
    fetchRatedIds();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("swap_requests")
      .select("id, status, listing_id, owner_id, listings(title, image_url, category, user_id)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((data ?? []) as SwapRequest[]);
    setLoading(false);
  };

  const fetchRatedIds = async () => {
    const { data } = await supabase
      .from("ratings")
      .select("swap_request_id")
      .eq("reviewer_id", user.id);
    if (data) setRatedIds(new Set(data.map((r) => r.swap_request_id)));
  };

  const handleConfirm = async (id: string) => {
    setLoadingId(id);
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const { data: current } = await supabase
        .from("swap_requests")
        .select("completion_confirmed_by")
        .eq("id", id)
        .single();

      const confirmed = [...(current?.completion_confirmed_by ?? []), user.id];
      const bothConfirmed = confirmed.length >= 2;

      await supabase.from("swap_requests").update({
        completion_confirmed_by: confirmed,
        status: bothConfirmed ? "completed" : "completion_pending",
      }).eq("id", id);

      if (bothConfirmed) {
        await Promise.all([
          supabase.from("profiles").update({
            eco_points: supabase.rpc("increment", { row_id: user.id, amount: 10 }) as any,
          }).eq("id", user.id),
          supabase.from("listings").update({ status: "swapped" }).eq("id", req.listing_id),
        ]);
      }

      fetchRequests();
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded-full w-1/2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const active    = requests.filter((r) => !["completed", "rejected"].includes(r.status));
  const completed = requests.filter((r) => r.status === "completed");
  const rejected  = requests.filter((r) => r.status === "rejected");

  return (
    <>
      {ratingModal && (
        <RatingModal
          swapRequestId={ratingModal.swapRequestId}
          reviewedId={ratingModal.reviewedId}
          listingId={ratingModal.listingId}
          listingTitle={ratingModal.listingTitle}
          currentUserId={user.id}
          reviewedName="Swap Partner"
          onClose={() => setRatingModal(null)}
          onSubmitted={() => {
            setRatingModal(null);
            setRatedIds((prev) => new Set(prev).add(ratingModal.swapRequestId));
          }}
        />
      )}

      <div className="space-y-8">
        {/* Active */}
        {active.length > 0 && (
          <div>
            <SectionHeader title="Active Requests" count={active.length} />
            <div className="space-y-3">
              {active.map((req) => {
                const listing = getListing(req);
                const status = STATUS_CONFIG[req.status];
                const isLoading = loadingId === req.id;
                const canConfirm = req.status === "accepted";
                return (
                  <div key={req.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                      {listing?.image_url
                        ? <img src={listing.image_url} alt="" className="w-full h-full object-cover" />
                        : "📦"
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {listing?.title ?? "Untitled"}
                      </p>
                      <p className="text-xs text-gray-400">{listing?.category}</p>
                      {req.status === "completion_pending" && (
                        <p className="text-xs text-blue-500 mt-1">⏳ Waiting for other party</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      )}
                      {canConfirm && (
                        <button onClick={() => handleConfirm(req.id)} disabled={isLoading}
                          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-3 py-1.5 rounded-xl transition">
                          {isLoading ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : "✓ Confirm"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <SectionHeader title="Completed Swaps" count={completed.length} />
            <div className="space-y-3">
              {completed.map((req) => {
                const listing = getListing(req);
                const alreadyRated = ratedIds.has(req.id);
                return (
                  <div key={req.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                      {listing?.image_url
                        ? <img src={listing.image_url} alt="" className="w-full h-full object-cover" />
                        : "📦"
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {listing?.title ?? "Untitled"}
                      </p>
                      <p className="text-xs text-gray-400">{listing?.category}</p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">+10 eco points earned 🌿</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        Completed
                      </span>
                      {alreadyRated ? (
                        <span className="text-xs font-semibold text-yellow-500 flex items-center gap-1">
                          ⭐ Rated
                        </span>
                      ) : (
                        <button
                          onClick={() => setRatingModal({
                            swapRequestId: req.id,
                            reviewedId:    req.owner_id,
                            listingId:     req.listing_id,
                            listingTitle:  listing?.title ?? "this listing",
                          })}
                          className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-xl border border-yellow-200 transition">
                          ⭐ Rate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <div>
            <SectionHeader title="Rejected" count={rejected.length} />
            <div className="space-y-3 opacity-60">
              {rejected.map((req) => {
                const listing = getListing(req);
                return (
                  <div key={req.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg">
                      {listing?.image_url
                        ? <img src={listing.image_url} alt="" className="w-full h-full object-cover" />
                        : "📦"
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {listing?.title ?? "Untitled"}
                      </p>
                      <p className="text-xs text-gray-400">{listing?.category}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                      Rejected
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-3">🔄</div>
            <p className="text-sm font-medium text-gray-600">No swap requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Browse listings and start swapping</p>
          </div>
        )}
      </div>
    </>
  );
}