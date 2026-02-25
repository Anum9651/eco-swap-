"use client";

import { supabase } from "../../../lib/supabase";

interface MyRequestsProps {
  requests: any[];
}

export default function MyRequests({ requests }: MyRequestsProps) {
  const handleMarkCompleted = async (request: any) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const alreadyConfirmed = request.completion_confirmed_by || [];

    if (alreadyConfirmed.includes(user.id)) return;

    const updatedConfirmations = [...alreadyConfirmed, user.id];
    let newStatus = "completion_pending";

    if (updatedConfirmations.length >= 2) {
      newStatus = "completed";

      // Add eco points to both users
      await supabase.rpc("increment_eco_points", {
        user_id_input: request.requester_id,
        points_to_add: 10,
      });

      await supabase.rpc("increment_eco_points", {
        user_id_input: request.owner_id,
        points_to_add: 10,
      });
    }

    await supabase
      .from("swap_requests")
      .update({
        status: newStatus,
        completion_confirmed_by: updatedConfirmations,
      })
      .eq("id", request.id);
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">
        My Swap Requests
      </h2>

      <div className="space-y-4 mb-12">
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