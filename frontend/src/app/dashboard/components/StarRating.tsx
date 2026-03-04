interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export default function StarRating({ rating, count, size = "sm" }: StarRatingProps) {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star}
            className={`${starSize} ${
              star <= Math.round(rating) ? "text-yellow-400" : "text-gray-200"
            }`}
            fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {rating > 0 && (
        <span className="text-xs font-semibold text-gray-600">{rating.toFixed(1)}</span>
      )}
      {count != null && count > 0 && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
      {(!rating || rating === 0) && (
        <span className="text-xs text-gray-400">No ratings yet</span>
      )}
    </div>
  );
}