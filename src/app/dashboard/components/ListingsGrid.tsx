"use client";

import { supabase } from "../../../lib/supabase";

interface ListingsGridProps {
  listings: any[];
  user: any;
  onRequestSwap: () => void;
}

export default function ListingsGrid({
  listings,
  user,
  onRequestSwap,
}: ListingsGridProps) {

  const handleRequestSwap = async (listing: any) => {
    if (!user) return;

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

    onRequestSwap();
  };

  if (listings.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium">No active listings available</p>
        <p className="text-sm mt-2">
          Be the first to create one 🌱
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold mb-8 tracking-tight">
        Available Listings
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {listings.map((item) => (
          <div
            key={item.id}
            className="group bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
          >
            {item.image_url && (
              <div className="overflow-hidden rounded-xl mb-4">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
            )}

            <div className="space-y-1">
              <h3 className="font-semibold text-lg tracking-tight">
                {item.title}
              </h3>

              <p className="text-sm text-gray-500">
                {item.category}
              </p>
            </div>

            {item.description && (
              <p className="mt-3 text-gray-700 text-sm leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Condition: {item.condition}
            </p>

            {item.user_id !== user.id && (
              <button
                onClick={() => handleRequestSwap(item)}
                className="mt-5 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-green-700 hover:shadow-md active:scale-95"
              >
                Request Swap
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}