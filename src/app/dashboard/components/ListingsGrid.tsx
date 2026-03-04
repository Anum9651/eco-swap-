"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  image_url?: string;
  user_id: string;
  eco_score?: number;
}

interface ListingsGridProps {
  listings: Listing[];
  user: any;
  onRequestSwap: () => void;
}

const CONDITION_COLORS: Record<string, string> = {
  new:      "bg-green-100 text-green-700",
  like_new: "bg-teal-100 text-teal-700",
  good:     "bg-blue-100 text-blue-700",
  fair:     "bg-yellow-100 text-yellow-700",
  poor:     "bg-red-100 text-red-700",
};

const CONDITION_LABELS: Record<string, string> = {
  new:      "New",
  like_new: "Like New",
  good:     "Good",
  fair:     "Fair",
  poor:     "Poor",
};

export default function ListingsGrid({ listings, user, onRequestSwap }: ListingsGridProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const handleRequestSwap = async (listing: Listing) => {
    if (!user || loadingId) return;

    setLoadingId(listing.id);
    try {
      await supabase.from("swap_requests").insert({
        listing_id: listing.id,
        requester_id: user.id,
        owner_id: listing.user_id,
        status: "pending",
        completion_confirmed_by: [],
      });

      await supabase.from("notifications").insert({
        user_id: listing.user_id,
        type: "swap_request",
        message: "You received a new swap request.",
        related_id: listing.id,
      });

      setRequestedIds((prev) => new Set(prev).add(listing.id));
      onRequestSwap();
    } catch (err) {
      console.error("Swap request error:", err);
    } finally {
      setLoadingId(null);
    }
  };

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-700">No active listings yet</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to create one 🌱</p>
      </div>
    );
  }

  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Available Listings</h2>
        <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
          {listings.length} {listings.length === 1 ? "listing" : "listings"}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map((item) => {
          const isOwn = item.user_id === user?.id;
          const isRequested = requestedIds.has(item.id);
          const isLoading = loadingId === item.id;
          const conditionKey = item.condition?.toLowerCase().replace(" ", "_") ?? "";

          return (
            <div key={item.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">

              {/* Image */}
              <div className="relative h-48 bg-gray-100 overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Eco score badge */}
                {item.eco_score != null && item.eco_score > 0 && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    🌿 {item.eco_score}
                  </div>
                )}

                {/* Own listing badge */}
                {isOwn && (
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                    Your listing
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 leading-snug line-clamp-1">{item.title}</h3>
                  {conditionKey && CONDITION_COLORS[conditionKey] && (
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${CONDITION_COLORS[conditionKey]}`}>
                      {CONDITION_LABELS[conditionKey] ?? item.condition}
                    </span>
                  )}
                </div>

                {item.category && (
                  <p className="text-xs text-gray-400 mb-2">{item.category}</p>
                )}

                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 flex-1">{item.description}</p>
                )}

                {/* CTA */}
                {!isOwn && (
                  <button
                    onClick={() => handleRequestSwap(item)}
                    disabled={isLoading || isRequested}
                    className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
                      isRequested
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white hover:shadow-md"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Requesting…
                      </>
                    ) : isRequested ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Request Sent
                      </>
                    ) : (
                      "Request Swap"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}