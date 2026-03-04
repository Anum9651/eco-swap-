"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Request {
  id: string;
  status: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  completion_confirmed_by?: string[];
  listings?: { title: string; image_url?: string };
  message?: string;
  created_at?: string;
}

interface IncomingRequestsProps {
  requests?: Request[];
  refresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed:          { label: "Completed",            className: "bg-green-100 text-green-700" },
  pending:            { label: "Pending",              className: "bg-yellow-100 text-yellow-700" },
  completion_pending: { label: "Awaiting Confirmation",className: "bg-blue-100 text-blue-700" },
  accepted:           { label: "Accepted",             className: "bg-purple-100 text-purple-700" },
  rejected:           { label: "Rejected",             className: "bg-red-100 text-red-700" },
};

export default function IncomingRequests({ requests = [], refresh }: IncomingRequestsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const withLoading = async (id: string, fn: () => Promise<void>) => {
    setLoadingId(id);
    try { await fn(); } finally { setLoadingId(null); }
  };

  const handleUpdateStatus = (request: Request, newStatus: string) =>
    withLoading(request.id, async () => {
      await supabase.from("swap_requests").update({ status: newStatus }).eq("id", request.id);
      if (newStatus === "accepted") {
        await supabase.from("listings").update({ status: "swapped" }).eq("id", request.listing_id);
      }
      refresh();
    });

  const handleMarkCompleted = (request: Request) =>
    withLoading(request.id, async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const alreadyConfirmed = request.completion_confirmed_by ?? [];
      if (alreadyConfirmed.includes(user.id)) return;

      const updatedConfirmations = [...alreadyConfirmed, user.id];
      const newStatus = updatedConfirmations.length >= 2 ? "completed" : "completion_pending";

      if (newStatus === "completed") {
        await Promise.all([
          supabase.rpc("increment_eco_points", { user_id_input: request.requester_id, points_to_add: 10 }),
          supabase.rpc("increment_eco_points", { user_id_input: request.owner_id, points_to_add: 10 }),
          supabase.from("listings").update({ status: "completed" }).eq("id", request.listing_id),
        ]);
      }

      await supabase
        .from("swap_requests")
        .update({ status: newStatus, completion_confirmed_by: updatedConfirmations })
        .eq("id", request.id);

      refresh();
    });

  const isLoading = (id: string) => loadingId === id;

  if (requests.length === 0) {
    return (
      <section>
        <SectionHeader count={0} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No incoming requests yet</p>
          <p className="text-xs text-gray-400 mt-1">When someone requests a swap, it'll appear here</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader count={requests.length} />
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">

            <div className="p-5 flex items-start gap-4">
              {/* Listing image or placeholder */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {request.listings?.image_url ? (
                  <img src={request.listings.image_url} alt={request.listings.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {request.listings?.title ?? "Untitled listing"}
                  </h3>
                  {getStatusBadge(request.status)}
                </div>

                {request.message && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{request.message}</p>
                )}

                {request.created_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(request.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {request.status === "pending" && (
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(request, "accepted")}
                  disabled={isLoading(request.id)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isLoading(request.id) ? "Accepting…" : "Accept"}
                </button>
                <button
                  onClick={() => handleUpdateStatus(request, "rejected")}
                  disabled={isLoading(request.id)}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-600 hover:text-red-600 text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isLoading(request.id) ? "Rejecting…" : "Reject"}
                </button>
              </div>
            )}

            {(request.status === "accepted" || request.status === "completion_pending") && (
              <div className="px-5 pb-5">
                <button
                  onClick={() => handleMarkCompleted(request)}
                  disabled={isLoading(request.id)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isLoading(request.id) ? "Confirming…" : "Confirm Completion"}
                </button>
                {request.status === "completion_pending" && (
                  <p className="text-xs text-blue-500 mt-2">
                    ⏳ Waiting for the other party to confirm
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-semibold text-gray-900">Incoming Requests</h2>
      {count > 0 && (
        <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
          {count} {count === 1 ? "request" : "requests"}
        </span>
      )}
    </div>
  );
}