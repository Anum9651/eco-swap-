"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

interface RatingModalProps {
  swapRequestId: string;
  reviewedId: string;
  reviewedName: string;
  listingId: string;
  listingTitle: string;
  currentUserId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function RatingModal({
  swapRequestId, reviewedId, reviewedName,
  listingId, listingTitle, currentUserId,
  onClose, onSubmitted,
}: RatingModalProps) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating."); return; }
    setLoading(true);
    setError("");

    try {
      // Insert rating
      const { error: insertError } = await supabase.from("ratings").insert({
        swap_request_id: swapRequestId,
        reviewer_id:     currentUserId,
        reviewed_id:     reviewedId,
        listing_id:      listingId,
        rating,
        comment:         comment.trim() || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("You've already rated this swap.");
        } else {
          throw insertError;
        }
        return;
      }

      // Recalculate avg_rating and rating_count for the reviewed user
      const { data: allRatings } = await supabase
        .from("ratings")
        .select("rating")
        .eq("reviewed_id", reviewedId);

      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        await supabase
          .from("profiles")
          .update({
            avg_rating:   Math.round(avg * 10) / 10,
            rating_count: allRatings.length,
          })
          .eq("id", reviewedId);
      }

      onSubmitted();
    } catch (err) {
      setError("Failed to submit rating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Rate this Swap</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              How was your experience swapping <span className="font-medium text-gray-600">{listingTitle}</span>?
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Who you're rating */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {reviewedName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="text-xs text-gray-400">Rating</p>
            <p className="text-sm font-semibold text-gray-800">{reviewedName}</p>
          </div>
        </div>

        {/* Stars */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <svg
                  className={`w-10 h-10 transition-colors ${
                    star <= (hovered || rating)
                      ? "text-yellow-400"
                      : "text-gray-200"
                  }`}
                  fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className="text-sm font-semibold text-yellow-500">
              {LABELS[hovered || rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Comment <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this swap…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || rating === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-xl transition active:scale-95">
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting…
              </>
            ) : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}