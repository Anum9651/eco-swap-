"use client";

import { supabase } from "../../../lib/supabase";

interface IncomingRequestsProps {
  requests?: any[];
}

export default function IncomingRequests({
  requests = [],
}: IncomingRequestsProps) {

  /* ================= ACCEPT / REJECT ================= */

  const handleUpdateRequestStatus = async (
    request: any,
    newStatus: string
  ) => {
    // Update request
    await supabase
      .from("swap_requests")
      .update({ status: newStatus })
      .eq("id", request.id);

    // 🔥 If accepted → lock listing
    if (newStatus === "accepted") {
      await supabase
        .from("listings")
        .update({ status: "in_swap" })
        .eq("id", request.listing_id);
    }
  };

  /* ================= MARK COMPLETED ================= */

  const handleMarkCompleted = async (request: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const alreadyConfirmed = request.completion_confirmed_by || [];

    if (alreadyConfirmed.includes(user.id)) return;

    const updatedConfirmations = [...alreadyConfirmed, user.id];
    let newStatus = "completion_pending";

    if (updatedConfirmations.length >= 2) {
      newStatus = "completed";

      // Add eco points
      await supabase.rpc("increment_eco_points", {
        user_id_input: request.requester_id,
        points_to_add: 10,
      });

      await supabase.rpc("increment_eco_points", {
        user_id_input: request.owner_id,
        points_to_add: 10,
      });

      // 🔥 Mark listing as completed
      await supabase
        .from("listings")
        .update({ status: "completed" })
        .eq("id", request.listing_id);
    }

    await supabase
      .from("swap_requests")
      .update({
        status: newStatus,
        completion_confirmed_by: updatedConfirmations,
      })
      .eq("id", request.id);
  };

  /* ================= UI ================= */

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">
        Incoming Requests
      </h2>

      <div className="space-y-4">
        {requests.length === 0 && (
          <p className="text-gray-500">No incoming requests.</p>
        )}

        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white p-4 rounded-xl border"
          >
            <h3 className="font-semibold">
              {request.listings?.title}
            </h3>

            <p className="mt-1">
              Status:
              <span className="ml-2 font-semibold text-green-600">
                {request.status}
              </span>
            </p>

            {request.status === "pending" && (
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() =>
                    handleUpdateRequestStatus(request, "accepted")
                  }
                  className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Accept
                </button>

                <button
                  onClick={() =>
                    handleUpdateRequestStatus(request, "rejected")
                  }
                  className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Reject
                </button>
              </div>
            )}

            {(request.status === "accepted" ||
              request.status === "completion_pending") && (
              <button
                onClick={() => handleMarkCompleted(request)}
                className="mt-3 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
              >
                Confirm Completion
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}