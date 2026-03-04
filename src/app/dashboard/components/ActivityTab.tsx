"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface ActivityTabProps {
  userId: string;
}

interface SwapActivity {
  id: string;
  status: string;
  created_at: string;
  listing_id: string;
  listings?: { title: string; image_url?: string; category?: string };
  other_party_email?: string;
  type: "sent" | "received";
}

interface DonationActivity {
  id: string;
  title: string;
  image_url?: string;
  category?: string;
  created_at: string;
  donate_to?: string;
  charity_name?: string;
  status: string;
}

interface PurchaseActivity {
  id: string;
  title: string;
  image_url?: string;
  category?: string;
  price?: number;
  created_at: string;
  status: string;
}

const TABS = [
  { key: "swaps",     label: "Swaps",     icon: "🔄" },
  { key: "donations", label: "Donations", icon: "🎁" },
  { key: "purchases", label: "Purchases", icon: "💰" },
  { key: "received",  label: "Received",  icon: "📦" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:            { label: "Pending",              className: "bg-yellow-100 text-yellow-700" },
  accepted:           { label: "Accepted",             className: "bg-purple-100 text-purple-700" },
  completion_pending: { label: "Awaiting Confirmation",className: "bg-blue-100 text-blue-700"    },
  completed:          { label: "Completed",            className: "bg-green-100 text-green-700"  },
  rejected:           { label: "Rejected",             className: "bg-red-100 text-red-700"      },
  active:             { label: "Active",               className: "bg-green-100 text-green-700"  },
  swapped:            { label: "Swapped",              className: "bg-purple-100 text-purple-700"},
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${config.className}`}>
      {config.label}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-500">{text}</p>
      <p className="text-xs text-gray-400 mt-1">Your activity will appear here</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="flex justify-between gap-4">
          <div className="h-3.5 bg-gray-100 rounded-full w-1/2" />
          <div className="h-3.5 bg-gray-100 rounded-full w-20" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full w-1/3" />
        <div className="h-3 bg-gray-100 rounded-full w-1/4" />
      </div>
    </div>
  );
}

function ActivityRow({ image, title, subtitle, date, status, badge }: {
  image?: string; title: string; subtitle?: string;
  date?: string; status?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center text-xl">
        {image
          ? <img src={image} alt={title} className="w-full h-full object-cover" />
          : "📦"
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          {status && <StatusBadge status={status} />}
          {badge}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        {date && (
          <p className="text-xs text-gray-400 mt-1">
            {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ActivityTab({ userId }: ActivityTabProps) {
  const [activeTab, setActiveTab]     = useState("swaps");
  const [loading, setLoading]         = useState(false);

  const [swaps, setSwaps]             = useState<SwapActivity[]>([]);
  const [donations, setDonations]     = useState<DonationActivity[]>([]);
  const [purchases, setPurchases]     = useState<PurchaseActivity[]>([]);
  const [received, setReceived]       = useState<SwapActivity[]>([]);

  const [loaded, setLoaded]           = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loaded.has(activeTab)) return;
    fetchTab(activeTab);
  }, [activeTab]);

  const fetchTab = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === "swaps") {
        // Requests I sent
        const { data } = await supabase
          .from("swap_requests")
          .select("id, status, created_at, listing_id, listings(title, image_url, category)")
          .eq("requester_id", userId)
          .order("created_at", { ascending: false });
        setSwaps((data ?? []).map((r: any) => ({ ...r, type: "sent" })));
      }

      if (tab === "donations") {
        const { data } = await supabase
          .from("listings")
          .select("id, title, image_url, category, created_at, donate_to, status")
          .eq("user_id", userId)
          .eq("listing_type", "donate")
          .order("created_at", { ascending: false });

        // Fetch charity names for those with donate_to
        const withCharities = await Promise.all(
          (data ?? []).map(async (item: any) => {
            if (!item.donate_to) return { ...item, charity_name: null };
            const { data: charity } = await supabase
              .from("charities").select("name").eq("id", item.donate_to).single();
            return { ...item, charity_name: charity?.name ?? null };
          })
        );
        setDonations(withCharities);
      }

      if (tab === "purchases") {
        const { data } = await supabase
          .from("listings")
          .select("id, title, image_url, category, price, created_at, status")
          .eq("listing_type", "sale")
          .eq("status", "completed")
          .order("created_at", { ascending: false });
        setPurchases(data ?? []);
      }

      if (tab === "received") {
        // Incoming completed swap requests
        const { data } = await supabase
          .from("swap_requests")
          .select("id, status, created_at, listing_id, listings(title, image_url, category)")
          .eq("owner_id", userId)
          .eq("status", "completed")
          .order("created_at", { ascending: false });
        setReceived((data ?? []).map((r: any) => ({ ...r, type: "received" })));
      }

      setLoaded((prev) => new Set(prev).add(tab));
    } catch (err) {
      console.error(`Failed to fetch ${tab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const tabCounts: Record<string, number> = {
    swaps:     swaps.length,
    donations: donations.length,
    purchases: purchases.length,
    received:  received.length,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Tab header */}
      <div className="border-b border-gray-100">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-green-600 text-green-700 bg-green-50/50"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {loaded.has(tab.key) && tabCounts[tab.key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <>
            {/* Swaps */}
            {activeTab === "swaps" && (
              swaps.length === 0
                ? <EmptyState icon="🔄" text="No swaps yet" />
                : <div className="divide-y divide-gray-50">
                    {swaps.map((s) => (
                      <ActivityRow
                        key={s.id}
                        image={s.listings?.image_url}
                        title={s.listings?.title ?? "Untitled"}
                        subtitle={s.listings?.category}
                        date={s.created_at}
                        status={s.status}
                      />
                    ))}
                  </div>
            )}

            {/* Donations */}
            {activeTab === "donations" && (
              donations.length === 0
                ? <EmptyState icon="🎁" text="No donations yet" />
                : <div className="divide-y divide-gray-50">
                    {donations.map((d) => (
                      <ActivityRow
                        key={d.id}
                        image={d.image_url}
                        title={d.title}
                        subtitle={d.charity_name ? `→ ${d.charity_name}` : "→ Open donation"}
                        date={d.created_at}
                        status={d.status}
                      />
                    ))}
                  </div>
            )}

            {/* Purchases */}
            {activeTab === "purchases" && (
              purchases.length === 0
                ? <EmptyState icon="💰" text="No purchases yet" />
                : <div className="divide-y divide-gray-50">
                    {purchases.map((p) => (
                      <ActivityRow
                        key={p.id}
                        image={p.image_url}
                        title={p.title}
                        subtitle={p.category}
                        date={p.created_at}
                        status={p.status}
                        badge={
                          p.price != null
                            ? <span className="text-xs font-bold text-blue-600 flex-shrink-0">${p.price}</span>
                            : undefined
                        }
                      />
                    ))}
                  </div>
            )}

            {/* Received */}
            {activeTab === "received" && (
              received.length === 0
                ? <EmptyState icon="📦" text="Nothing received yet" />
                : <div className="divide-y divide-gray-50">
                    {received.map((r) => (
                      <ActivityRow
                        key={r.id}
                        image={r.listings?.image_url}
                        title={r.listings?.title ?? "Untitled"}
                        subtitle={r.listings?.category}
                        date={r.created_at}
                        status={r.status}
                      />
                    ))}
                  </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}