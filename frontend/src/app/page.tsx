"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
      else setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Nav */}
      <nav className="w-full px-8 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span>🌱</span> Eco-Swap
        </span>
        <Link href="/login"
          className="text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-xl transition">
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-16">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          🌍 Sustainability through smart swapping
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight tracking-tight max-w-2xl">
          Give your items<br />
          <span className="text-green-600">a second life</span>
        </h1>

        <p className="text-base text-gray-500 mt-6 max-w-md leading-relaxed">
          Swap items you no longer need, earn eco points for every trade,
          and help reduce waste — one swap at a time.
        </p>

        <div className="flex items-center gap-3 mt-10">
          <Link href="/login"
            className="px-7 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
            Get started free
          </Link>
          <Link href="/login"
            className="px-7 py-3 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
            Sign in
          </Link>
        </div>

        {/* Social proof / feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-14">
          {[
            { icon: "🔄", label: "Free to swap" },
            { icon: "🌿", label: "Eco scored listings" },
            { icon: "🏅", label: "Earn eco points" },
            { icon: "🔒", label: "Verified trades" },
          ].map(({ icon, label }) => (
            <div key={label}
              className="flex items-center gap-2 bg-white border border-gray-100 shadow-sm text-gray-600 text-xs font-medium px-4 py-2 rounded-full">
              <span>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Eco-Swap · Built for a greener planet 🌱</p>
      </footer>

    </div>
  );
}