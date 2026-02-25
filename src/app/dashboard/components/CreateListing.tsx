"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

interface CreateListingProps {
  user: any;
  onListingCreated: () => void;
}

export default function CreateListing({
  user,
  onListingCreated,
}: CreateListingProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateListing = async () => {
    if (!user) return;

    if (!title || !category || !condition) {
      alert("Please fill required fields");
      return;
    }

    setLoading(true);

    let imageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    await supabase.from("listings").insert({
      user_id: user.id,
      title,
      description,
      category,
      condition,
      eco_score: 0,
      carbon_estimated: 0,
      image_url: imageUrl,
    });

    setTitle("");
    setDescription("");
    setCategory("");
    setCondition("");
    setImageFile(null);
    setLoading(false);

    onListingCreated();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-10">
      <h2 className="text-xl font-semibold mb-4">Create Listing</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          type="file"
          accept="image/*"
          className="border p-2 rounded md:col-span-2"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setImageFile(e.target.files[0]);
            }
          }}
        />

        <input
          className="border p-2 rounded"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder="Category *"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder="Condition *"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />

        <input
          className="border p-2 rounded md:col-span-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <button
        onClick={handleCreateListing}
        disabled={loading}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Creating..." : "Create Listing"}
      </button>
    </div>
  );
}