"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface CreateListingProps {
  userId: string;
  onCreated: () => void;
}

interface Charity {
  id: string;
  name: string;
  description: string;
  category: string;
  logo_url?: string;
  verified: boolean;
}

const CATEGORIES = [
  "Electronics", "Clothing & Apparel", "Furniture", "Books & Media",
  "Sports & Outdoors", "Toys & Games", "Kitchen & Home",
  "Tools & Hardware", "Vehicles & Parts", "Other",
];

const CONDITIONS = [
  { value: "new",      label: "New",      description: "Unused, in original packaging"        },
  { value: "like_new", label: "Like New", description: "Used once or twice, no signs of wear"  },
  { value: "good",     label: "Good",     description: "Minor wear, fully functional"           },
  { value: "fair",     label: "Fair",     description: "Visible wear, still works well"         },
  { value: "poor",     label: "Poor",     description: "Heavy wear, may need repairs"           },
];

const LISTING_TYPES = [
  { value: "swap",   label: "Swap",   icon: "🔄", description: "Trade for another item" },
  { value: "donate", label: "Donate", icon: "🎁", description: "Give it away for free"  },
  { value: "sale",   label: "Sale",   icon: "💰", description: "Sell for a price"       },
];

export default function CreateListing({ userId, onCreated }: CreateListingProps) {
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [category, setCategory]         = useState("");
  const [condition, setCondition]       = useState("");
  const [listingType, setListingType]   = useState<"swap" | "donate" | "sale">("swap");
  const [price, setPrice]               = useState("");
  const [donateToId, setDonateToId]     = useState("");
  const [charities, setCharities]       = useState<Charity[]>([]);
  const [loading, setLoading]           = useState(false);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [success, setSuccess]           = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's location from profile
  useEffect(() => {
    supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data?.latitude && data?.longitude) {
          setUserLocation({ latitude: data.latitude, longitude: data.longitude });
        }
      });
  }, [userId]);

  // Fetch charities when donate tab selected
  useEffect(() => {
    if (listingType !== "donate" || charities.length > 0) return;
    supabase.from("charities").select("*").eq("verified", true).then(({ data }) => {
      if (data) setCharities(data);
    });
  }, [listingType]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())  e.title     = "Title is required";
    if (!category)      e.category  = "Category is required";
    if (!condition)     e.condition = "Condition is required";
    if (listingType === "sale" && (!price || isNaN(Number(price)) || Number(price) <= 0))
      e.price = "Enter a valid price";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSuggestPrice = async () => {
    if (!title.trim()) { alert("Add a title first."); return; }
    setSuggestingPrice(true);
    try {
      const res  = await fetch("/api/agent/suggest-price", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, category, condition, description }),
      });
      const data = await res.json();
      if (data.suggested) setPrice(data.suggested.toString());
    } finally {
      setSuggestingPrice(false);
    }
  };

  const handleCreateListing = async () => {
    if (!validate()) return;
    setLoading(true);
    setSuccess(false);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images").upload(fileName, imageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from("listing-images").getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from("listings")
        .insert({
          user_id:      userId,
          title:        title.trim(),
          description:  description.trim(),
          category,
          condition,
          listing_type: listingType,
          price:        listingType === "sale" ? Number(price) : null,
          donate_to:    listingType === "donate" && donateToId ? donateToId : null,
          eco_score:    0,
          fraud_flag:   false,
          status:       "active",
          image_url:    imageUrl,
          latitude:     userLocation?.latitude ?? null,
          longitude:    userLocation?.longitude ?? null,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error("Insert failed:", insertError);
        return;
      }

      // Run AI agent in background
      fetch("/api/agent/process-listing", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ listingId: inserted.id }),
      }).catch(console.error);

      // Reset form
      setTitle(""); setDescription(""); setCategory(""); setCondition("");
      setPrice(""); setDonateToId(""); setImageFile(null); setImagePreview(null);
      setErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onCreated();
    } catch (err) {
      console.error("Create listing error:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder-gray-400 bg-white transition-all outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
    }`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">

      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create a Listing</h2>
          <p className="text-sm text-gray-500 mt-0.5">Swap, donate, or sell an item</p>
        </div>
        <div className="flex items-center gap-2">
          {userLocation ? (
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">
              📍 Location set
            </span>
          ) : (
            <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100">
              ⚠️ No location in profile
            </span>
          )}
          <span className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100">
            🌿 AI Eco Scored
          </span>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* Listing Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Listing Type</label>
          <div className="grid grid-cols-3 gap-3">
            {LISTING_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setListingType(t.value as any)}
                className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-2 transition-all duration-150 ${
                  listingType === t.value
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}>
                <span className="text-2xl">{t.icon}</span>
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-center leading-tight opacity-70">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
          {imagePreview ? (
            <div className="relative w-full h-52 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button onClick={() => fileInputRef.current?.click()}
                  className="text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/30 transition">
                  Change
                </button>
                <button onClick={handleRemoveImage}
                  className="text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-red-500/60 transition">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50/50 transition-all duration-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-medium">Upload a photo</span>
              <span className="text-xs">PNG, JPG, WEBP up to 10MB</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input className={inputClass("title")}
            placeholder="e.g. Vintage Leather Jacket, Size M"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: "" })); }} />
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select className={`${inputClass("category")} appearance-none cursor-pointer`}
              value={category}
              onChange={(e) => { setCategory(e.target.value); if (errors.category) setErrors(p => ({ ...p, category: "" })); }}>
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1.5 text-xs text-red-500">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition <span className="text-red-400">*</span>
            </label>
            <select className={`${inputClass("condition")} appearance-none cursor-pointer`}
              value={condition}
              onChange={(e) => { setCondition(e.target.value); if (errors.condition) setErrors(p => ({ ...p, condition: "" })); }}>
              <option value="" disabled>Select condition</option>
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label} — {c.description}</option>)}
            </select>
            {errors.condition && <p className="mt-1.5 text-xs text-red-500">{errors.condition}</p>}
          </div>
        </div>

        {/* Sale — Price field with AI suggester */}
        {listingType === "sale" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (£) <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">£</span>
                <input
                  className={`${inputClass("price")} pl-8`}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); if (errors.price) setErrors(p => ({ ...p, price: "" })); }}
                />
              </div>
              <button type="button" onClick={handleSuggestPrice} disabled={suggestingPrice}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-xl border border-purple-100 transition disabled:opacity-50 whitespace-nowrap">
                {suggestingPrice ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : "🤖"}
                {suggestingPrice ? "Thinking…" : "AI Price"}
              </button>
            </div>
            {errors.price && <p className="mt-1.5 text-xs text-red-500">{errors.price}</p>}
          </div>
        )}

        {/* Donate — Charity picker */}
        {listingType === "donate" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donate to <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {charities.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading charities…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setDonateToId("")}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    donateToId === "" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🌍</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Anyone in need</p>
                    <p className="text-xs text-gray-400">Open donation to the community</p>
                  </div>
                </button>
                {charities.map((c) => (
                  <button key={c.id} type="button" onClick={() => setDonateToId(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      donateToId === c.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                      {c.logo_url
                        ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                        : "🏛️"
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                        {c.verified && (
                          <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{c.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-gray-400 font-normal">(optional — AI will improve it)</span>
          </label>
          <textarea className={`${inputClass("description")} resize-none`} rows={3}
            placeholder="Describe your item — the AI will enhance this automatically after posting."
            value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">🤖 AI will eco-score and improve description after posting.</p>
          <div className="flex items-center gap-3">
            {success && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Listing created!
              </span>
            )}
            <button onClick={handleCreateListing} disabled={loading}
              className={`flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all hover:shadow-md active:scale-95 disabled:cursor-not-allowed ${
                listingType === "donate" ? "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400" :
                listingType === "sale"   ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"       :
                                           "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
              }`}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  {listingType === "donate" ? "🎁" : listingType === "sale" ? "💰" : "🔄"}
                  {listingType === "donate" ? " Post Donation" : listingType === "sale" ? " List for Sale" : " Create Swap"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}