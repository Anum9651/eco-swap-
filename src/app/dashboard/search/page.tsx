"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  listing_type?: string;
  image_url?: string;
  price?: number;
  user_id: string;
  created_at: string;
  eco_score?: number;
}

const CATEGORIES = [
  "All", "Electronics", "Clothing & Apparel", "Furniture", "Books & Media",
  "Sports & Outdoors", "Toys & Games", "Kitchen & Home",
  "Tools & Hardware", "Vehicles & Parts", "Other",
];

const CONDITIONS = ["All", "new", "like_new", "good", "fair", "poor"];

const CONDITION_LABELS: Record<string, string> = {
  new: "New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor",
};

const CONDITION_COLORS: Record<string, string> = {
  new:      "bg-green-100 text-green-700",
  like_new: "bg-teal-100 text-teal-700",
  good:     "bg-blue-100 text-blue-700",
  fair:     "bg-yellow-100 text-yellow-700",
  poor:     "bg-red-100 text-red-700",
};

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest first"        },
  { value: "oldest",     label: "Oldest first"        },
  { value: "price_asc",  label: "Price: Low → High"   },
  { value: "price_desc", label: "Price: High → Low"   },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  swap:   { label: "Swap",   color: "text-green-700",  bg: "bg-green-100"  },
  donate: { label: "Donate", color: "text-purple-700", bg: "bg-purple-100" },
  sale:   { label: "Sale",   color: "text-blue-700",   bg: "bg-blue-100"   },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between gap-3">
          <div className="h-4 bg-gray-100 rounded-full w-2/3" />
          <div className="h-4 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-9 bg-gray-100 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [query, setQuery]           = useState(searchParams.get("q") ?? "");
  const [inputVal, setInputVal]     = useState(searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter]   = useState("All");
  const [condFilter, setCondFilter] = useState("All");
  const [sortBy, setSortBy]         = useState("newest");
  const [results, setResults]       = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [user, setUser]             = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Sync URL param on load
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setInputVal(q);
  }, [searchParams]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      let q = supabase
        .from("listings")
        .select("id, title, description, category, condition, listing_type, image_url, price, user_id, created_at, eco_score")
        .eq("status", "active");

      if (query.trim()) {
        q = q.or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`);
      }

      if (typeFilter !== "all") q = q.eq("listing_type", typeFilter);
      if (catFilter  !== "All") q = q.eq("category", catFilter);
      if (condFilter !== "All") q = q.eq("condition", condFilter);

      if (sortBy === "newest")     q = q.order("created_at", { ascending: false });
      if (sortBy === "oldest")     q = q.order("created_at", { ascending: true  });
      if (sortBy === "price_asc")  q = q.order("price",      { ascending: true,  nullsFirst: false });
      if (sortBy === "price_desc") q = q.order("price",      { ascending: false, nullsFirst: false });

      const { data, error } = await q;
      if (error) throw error;
      setResults(data ?? []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, catFilter, condFilter, sortBy]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    setQuery(trimmed);
    router.replace(`/dashboard/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleRequestSwap = async (listing: Listing) => {
    if (!user) return;
    await supabase.from("swap_requests").insert({
      listing_id:              listing.id,
      requester_id:            user.id,
      owner_id:                listing.user_id,
      status:                  "pending",
      completion_confirmed_by: [],
    });
    await supabase.from("notifications").insert({
      user_id:    listing.user_id,
      type:       "swap_request",
      message:    "You received a new swap request.",
      related_id: listing.id,
    });
  };

  const clearAll = () => {
    setTypeFilter("all");
    setCatFilter("All");
    setCondFilter("All");
    setSortBy("newest");
    setQuery("");
    setInputVal("");
    router.replace("/dashboard/search");
  };

  const activeFilterCount = [
    typeFilter !== "all",
    catFilter  !== "All",
    condFilter !== "All",
    sortBy     !== "newest",
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Listings</h1>
        <p className="text-sm text-gray-400 mt-1">
          {searched && !loading
            ? `${results.length} result${results.length !== 1 ? "s" : ""}${query ? ` for "${query}"` : ""}`
            : "Find items to swap, donate, or buy"
          }
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-all">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search by title or description…"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            autoFocus
          />
          {inputVal && (
            <button type="button"
              onClick={() => { setInputVal(""); setQuery(""); router.replace("/dashboard/search"); }}
              className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button type="submit"
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-6 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95">
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Type */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { value: "all",    label: "All",    icon: "✦" },
              { value: "swap",   label: "Swap",   icon: "🔄" },
              { value: "donate", label: "Donate", icon: "🎁" },
              { value: "sale",   label: "Sale",   icon: "💰" },
            ].map((t) => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  typeFilter === t.value
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Condition */}
          <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer">
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All Conditions" : CONDITION_LABELS[c]}</option>
            ))}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer">
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button onClick={() => { setTypeFilter("all"); setCatFilter("All"); setCondFilter("All"); setSortBy("newest"); }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl border border-red-100 transition ml-auto">
              Clear filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !searched ? null : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-4">🔍</div>
          <p className="text-base font-semibold text-gray-700">No results found</p>
          <p className="text-sm text-gray-400 mt-1">Try different keywords or remove some filters</p>
          <button onClick={clearAll}
            className="mt-4 text-sm font-semibold text-green-600 hover:underline">
            Clear everything
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((item) => {
            const type     = item.listing_type ?? "swap";
            const typeConf = TYPE_CONFIG[type] ?? TYPE_CONFIG.swap;
            const condKey  = item.condition ?? "";
            const isOwn    = item.user_id === user?.id;

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

                  {/* Type badge */}
                  <div className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${typeConf.bg} ${typeConf.color}`}>
                    {type === "swap" ? "🔄" : type === "donate" ? "🎁" : "💰"} {typeConf.label}
                  </div>

                  {/* Eco score */}
                  {item.eco_score != null && item.eco_score > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      🌿 {item.eco_score}
                    </div>
                  )}

                  {isOwn && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      Your listing
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 leading-snug line-clamp-1">{item.title}</h3>
                    {condKey && CONDITION_COLORS[condKey] && (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${CONDITION_COLORS[condKey]}`}>
                        {CONDITION_LABELS[condKey] ?? condKey}
                      </span>
                    )}
                  </div>

                  {item.category && (
                    <p className="text-xs text-gray-400 mb-2">{item.category}</p>
                  )}

                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1 mb-3">{item.description}</p>
                  )}

                  {item.listing_type === "sale" && item.price != null && (
                    <p className="text-lg font-bold text-blue-600 mb-3">${item.price}</p>
                  )}

                  {item.listing_type === "donate" && (
                    <p className="text-sm font-semibold text-purple-600 mb-3">Free 🎁</p>
                  )}

                  {query && item.description?.toLowerCase().includes(query.toLowerCase()) && (
                    <p className="text-xs text-green-600 font-medium mb-2">✓ Matches in description</p>
                  )}

                  {!isOwn && (
                    <button onClick={() => handleRequestSwap(item)}
                      className={`mt-auto w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all active:scale-95 text-white ${
                        type === "donate" ? "bg-purple-600 hover:bg-purple-700" :
                        type === "sale"   ? "bg-blue-600 hover:bg-blue-700"     :
                                            "bg-green-600 hover:bg-green-700"
                      }`}>
                      {type === "donate" ? "🎁 Request Donation" :
                       type === "sale"   ? "💰 Buy Now"          :
                                           "🔄 Request Swap"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    }>
      <SearchPageInner />
    </Suspense>
  );
}