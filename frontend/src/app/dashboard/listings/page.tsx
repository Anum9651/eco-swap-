"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import CreateListing from "../components/CreateListing";

interface Listing {
  id: string;
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  listing_type?: string;
  image_url?: string;
  price?: number;
  status: string;
  eco_score?: number;
  fraud_flag?: boolean;
  created_at: string;
  user_id?: string;
}

interface SwapMatch {
  id: string;
  title: string;
  category?: string;
  condition?: string;
  image_url?: string;
  eco_score?: number;
  listing_type?: string;
  match_reason: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  swapped:  "bg-purple-100 text-purple-700",
  inactive: "bg-gray-100 text-gray-500",
  sold:     "bg-blue-100 text-blue-700",
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  swap:   { label: "Swap",   color: "text-green-700",  bg: "bg-green-100"  },
  donate: { label: "Donate", color: "text-purple-700", bg: "bg-purple-100" },
  sale:   { label: "Sale",   color: "text-blue-700",   bg: "bg-blue-100"   },
};

const CONDITION_COLORS: Record<string, string> = {
  new:      "bg-green-100 text-green-700",
  like_new: "bg-teal-100 text-teal-700",
  good:     "bg-blue-100 text-blue-700",
  fair:     "bg-yellow-100 text-yellow-700",
  poor:     "bg-red-100 text-red-700",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor",
};

export default function ListingsPage() {
  const [user, setUser]               = useState<any>(null);
  const [listings, setListings]       = useState<Listing[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"mine" | "all" | "matches">("mine");
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [matches, setMatches]         = useState<SwapMatch[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoaded, setMatchLoaded]   = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // Edit form state
  const [editTitle, setEditTitle]   = useState("");
  const [editDesc, setEditDesc]     = useState("");
  const [editPrice, setEditPrice]   = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const fetchMyListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id, title, description, category, condition, listing_type, image_url, price, status, eco_score, fraud_flag, created_at, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data ?? []);
    setLoading(false);
  }, [user]);

  const fetchAllListings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("listings")
      .select("id, title, description, category, condition, listing_type, image_url, price, status, eco_score, fraud_flag, created_at, user_id")
      .neq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);
    setAllListings(data ?? []);
  }, [user]);

  const fetchMatches = useCallback(async () => {
    if (!user || matchLoaded) return;
    setMatchLoading(true);
    try {
      const res  = await fetch("/api/agent/swap-matches", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      setMatches(data.matches ?? []);
      setMatchLoaded(true);
    } finally {
      setMatchLoading(false);
    }
  }, [user, matchLoaded]);

  useEffect(() => { fetchMyListings(); }, [fetchMyListings]);

  useEffect(() => {
    if (activeTab === "all")     fetchAllListings();
    if (activeTab === "matches") fetchMatches();
  }, [activeTab, fetchAllListings, fetchMatches]);

  // FIX 1: Realtime subscription moved OUT of ListingCard to page level
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("listings:realtime")
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "listings",
      }, (payload) => {
        if (payload.new.user_id !== user.id) {
          setAllListings((prev) => [payload.new as Listing, ...prev]);
        } else {
          fetchMyListings();
        }
      })
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "listings",
      }, () => {
        if (activeTab === "all") fetchAllListings();
        else fetchMyListings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeTab, fetchMyListings, fetchAllListings]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    await supabase.from("listings").delete().eq("id", id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  };

  const handleMarkSwapped = async (id: string) => {
    await supabase.from("listings").update({ status: "swapped" }).eq("id", id);
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "swapped" } : l));
  };

  const handleMarkSold = async (id: string) => {
    await supabase.from("listings").update({ status: "sold" }).eq("id", id);
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "sold" } : l));
  };

  const openEdit = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditDesc(listing.description ?? "");
    setEditPrice(listing.price?.toString() ?? "");
    setEditStatus(listing.status);
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    setSaving(true);
    await supabase.from("listings").update({
      title:       editTitle.trim(),
      description: editDesc.trim(),
      price:       editPrice ? parseFloat(editPrice) : null,
      status:      editStatus,
    }).eq("id", editingListing.id);
    await fetchMyListings();
    setEditingListing(null);
    setSaving(false);
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
      message:    `You received a new swap request for "${listing.title}".`,
      related_id: listing.id,
    });
    alert("Swap request sent!");
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all";

  // FIX 2: ListingCard is now a clean component with NO hooks inside it
  const ListingCard = ({ listing, isOwn }: { listing: Listing; isOwn: boolean }) => {
    const type     = listing.listing_type ?? "swap";
    const typeConf = TYPE_CONFIG[type] ?? TYPE_CONFIG.swap;
    const condKey  = listing.condition ?? "";

    return (
      <div className={`group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col ${
        listing.fraud_flag ? "border-red-200 bg-red-50/30" : "border-gray-100"
      }`}>

        {/* Image */}
        <div className="relative h-44 bg-gray-100 overflow-hidden flex-shrink-0">
          {listing.image_url ? (
            <img src={listing.image_url} alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📦</div>
          )}

          <div className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${typeConf.bg} ${typeConf.color}`}>
            {type === "swap" ? "🔄" : type === "donate" ? "🎁" : "💰"} {typeConf.label}
          </div>

          {listing.eco_score != null && listing.eco_score > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              🌿 {listing.eco_score}
            </div>
          )}

          {listing.fraud_flag && (
            <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              🚩 Flagged
            </div>
          )}

          {listing.status !== "active" && (
            <div className={`absolute bottom-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[listing.status] ?? STATUS_COLORS.inactive}`}>
              {listing.status}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 leading-snug line-clamp-1 text-sm">{listing.title}</h3>
            {condKey && CONDITION_COLORS[condKey] && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${CONDITION_COLORS[condKey]}`}>
                {CONDITION_LABELS[condKey] ?? condKey}
              </span>
            )}
          </div>

          {listing.category && <p className="text-xs text-gray-400 mb-2">{listing.category}</p>}

          {listing.description && (
            <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">{listing.description}</p>
          )}

          {listing.listing_type === "sale" && listing.price != null && (
            <p className="text-base font-bold text-blue-600 mb-3">£{listing.price}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-auto">
            {isOwn ? (
              <>
                <button onClick={() => openEdit(listing)}
                  className="flex-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 py-2 rounded-xl transition">
                  ✏️ Edit
                </button>
                {listing.status === "active" && listing.listing_type === "swap" && (
                  <button onClick={() => handleMarkSwapped(listing.id)}
                    className="flex-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 py-2 rounded-xl transition border border-purple-100">
                    🔄 Mark Swapped
                  </button>
                )}
                {listing.status === "active" && listing.listing_type === "sale" && (
                  <button onClick={() => handleMarkSold(listing.id)}
                    className="flex-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition border border-blue-100">
                    💰 Mark Sold
                  </button>
                )}
                <button onClick={() => handleDelete(listing.id)}
                  disabled={deletingId === listing.id}
                  className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition border border-red-100 disabled:opacity-50">
                  {deletingId === listing.id ? "…" : "🗑️"}
                </button>
              </>
            ) : (
              <button onClick={() => handleRequestSwap(listing)}
                className={`w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition text-white ${
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
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Edit modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingListing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Edit Listing</h2>
              <button onClick={() => setEditingListing(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Title</label>
              <input className={inputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <textarea rows={3} className={`${inputClass} resize-none`}
                value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            {editingListing.listing_type === "sale" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Price (£)</label>
                <input type="number" className={inputClass} value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select className={`${inputClass} cursor-pointer`} value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="swapped">Swapped</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditingListing(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition">
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {listings.filter((l) => l.status === "active").length} active listings
          </p>
        </div>
        <button onClick={() => setShowCreate((p) => !p)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm hover:shadow-md active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showCreate ? "Cancel" : "New Listing"}
        </button>
      </div>

      {/* Create listing form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <CreateListing
            userId={user?.id}
            onCreated={() => { setShowCreate(false); fetchMyListings(); }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "mine",    label: `My Listings (${listings.length})`, icon: "📦" },
          { key: "all",     label: "Browse All",                       icon: "🔍" },
          { key: "matches", label: "🤖 AI Matches",                    icon: ""   },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* My listings tab */}
      {activeTab === "mine" && (
        loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700">No listings yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first listing to start swapping</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 text-sm font-semibold text-green-600 hover:underline">
              Create listing →
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => <ListingCard key={l.id} listing={l} isOwn={true} />)}
          </div>
        )
      )}

      {/* Browse all tab */}
      {activeTab === "all" && (
        allListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-semibold text-gray-700">No listings from other users yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allListings.map((l) => <ListingCard key={l.id} listing={l} isOwn={false} />)}
          </div>
        )
      )}

      {/* AI Matches tab */}
      {activeTab === "matches" && (
        matchLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-8 h-8 animate-spin text-green-500 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-semibold text-gray-600">AI is finding your best matches…</p>
            <p className="text-xs text-gray-400 mt-1">Analysing listings for compatibility</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm font-semibold text-gray-700">No matches found yet</p>
            <p className="text-xs text-gray-400 mt-1">Add more listings to get AI-powered swap suggestions</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-semibold text-green-800">AI Swap Matches</p>
                <p className="text-xs text-green-600">Based on your listings, our AI found {matches.length} items you might want</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {matches.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="h-44 bg-gray-100 overflow-hidden">
                    {m.image_url
                      ? <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>
                    }
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{m.title}</h3>
                    <p className="text-xs text-gray-400 mb-2">{m.category}</p>
                    <div className="flex items-start gap-2 bg-green-50 rounded-xl p-3 mb-3">
                      <span className="text-sm flex-shrink-0">🤖</span>
                      <p className="text-xs text-green-700 font-medium">{m.match_reason}</p>
                    </div>
                    <button
                      onClick={() => handleRequestSwap(m as any)}
                      className="w-full text-xs font-semibold text-white bg-green-600 hover:bg-green-700 py-2.5 rounded-xl transition">
                      🔄 Request Swap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}