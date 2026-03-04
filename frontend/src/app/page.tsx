"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthed(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span>🌱</span> Eco-Swap
          </div>
          <div className="flex items-center gap-3">
            {authed ? (
              <Link href="/dashboard"
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl hover:bg-gray-100 transition">
                  Sign in
                </Link>
                <Link href="/login?tab=signup"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition shadow-sm">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-teal-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sustainability through smart swapping
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Give your items<br />
            <span className="text-green-600">a second life</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Swap items you no longer need, earn eco points for every trade,
            and help reduce waste — one swap at a time.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login?tab=signup"
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3.5 rounded-2xl transition shadow-lg hover:shadow-xl active:scale-95 text-sm">
              Start swapping for free
            </Link>
            <Link href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-8 py-3.5 rounded-2xl transition">
              Sign in
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
            {[
              { icon: "🔄", label: "Free to swap"         },
              { icon: "🌿", label: "Eco scored listings"  },
              { icon: "🏆", label: "Earn eco points"      },
              { icon: "🔒", label: "Verified trades"      },
              { icon: "🗺️", label: "Map view"             },
            ].map((b) => (
              <span key={b.label}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-green-600 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { value: "10K+",  label: "Items Swapped"      },
            { value: "5K+",   label: "Active Users"       },
            { value: "2T+",   label: "CO₂ Saved (kg)"     },
            { value: "98%",   label: "Satisfaction Rate"  },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-black mb-1">{s.value}</p>
              <p className="text-green-200 text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">How it works</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Three simple steps to give your items a new home and earn eco points
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "📸",
                title: "List your item",
                desc: "Take a photo, add a description, and our AI automatically scores your item's eco impact.",
                color: "bg-green-100",
              },
              {
                step: "02",
                icon: "🔍",
                title: "Find a match",
                desc: "Browse listings nearby on the map, filter by category, or search for exactly what you need.",
                color: "bg-blue-100",
              },
              {
                step: "03",
                icon: "🤝",
                title: "Swap & earn",
                desc: "Complete the swap, confirm both ways, and earn eco points that level you up to Platinum.",
                color: "bg-purple-100",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center text-2xl mb-5`}>
                  {s.icon}
                </div>
                <p className="text-xs font-bold text-gray-300 mb-1">STEP {s.step}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Everything you need</h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Built for sustainable communities, not just transactions
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🤖", title: "AI Eco Scoring",       desc: "Every listing is automatically scored for its environmental impact using AI."                   },
              { icon: "🗺️", title: "Map View",             desc: "See listings near you on an interactive map. Swap locally, reduce transport emissions."          },
              { icon: "👥", title: "Communities",           desc: "Join local or interest-based groups. Swap within your university, neighbourhood, or hobby club." },
              { icon: "🎁", title: "Donate Listings",       desc: "Not looking for a swap? Donate directly to charities or anyone in need."                        },
              { icon: "🏆", title: "Eco Leaderboard",       desc: "Earn points, level up from Seedling to Platinum, and compete with your community."              },
              { icon: "⭐", title: "Ratings & Reviews",     desc: "Rate swap partners after each trade. Build trust and reputation in the community."               },
            ].map((f) => (
              <div key={f.title}
                className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all bg-white">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


{/* ── Testimonials ── */}
<section className="py-20 bg-white">
  <div className="max-w-5xl mx-auto px-6">
    <div className="text-center mb-14">
      <h2 className="text-3xl md:text-4xl font-black mb-3">What swappers say</h2>
      <p className="text-gray-500 text-sm">Real stories from our eco community</p>
    </div>
    <div className="grid md:grid-cols-3 gap-6">
      {[
        {
          name:   "Sarah K.",
          level:  "🌍 Guardian",
          avatar: "S",
          color:  "bg-blue-500",
          text:   "I've swapped over 20 items on Eco-Swap and earned enough points to reach Guardian level. It's genuinely changed how I think about buying new things.",
        },
        {
          name:   "James T.",
          level:  "⚡ Platinum",
          avatar: "J",
          color:  "bg-purple-500",
          text:   "The AI eco scoring is brilliant — I love seeing the CO₂ impact of each swap. Reached Platinum in 3 months just by clearing out my garage!",
        },
        {
          name:   "Priya M.",
          level:  "🌳 Sapling",
          avatar: "P",
          color:  "bg-teal-500",
          text:   "Donated my old clothes to a verified charity through Eco-Swap. The whole process took 5 minutes and I got eco points for it. Amazing platform.",
        },
      ].map((t) => (
        <div key={t.name}
          className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${t.color} text-white flex items-center justify-center font-bold`}>
              {t.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400">{t.level}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">"{t.text}"</p>
          <div className="flex mt-3">
            {[1,2,3,4,5].map((s) => (
              <svg key={s} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>


      {/* ── Eco levels ── */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-teal-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Level up your impact</h2>
            <p className="text-gray-500 text-sm">Earn eco points with every swap and climb the sustainability ladder</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { emoji: "🌱", name: "Seedling",  pts: "0–50 pts",    color: "bg-green-100  border-green-200  text-green-800"  },
              { emoji: "🌿", name: "Sprout",    pts: "50–150 pts",  color: "bg-green-200  border-green-300  text-green-900"  },
              { emoji: "🌳", name: "Sapling",   pts: "150–300 pts", color: "bg-teal-100   border-teal-200   text-teal-800"   },
              { emoji: "🌍", name: "Guardian",  pts: "300–500 pts", color: "bg-blue-100   border-blue-200   text-blue-800"   },
              { emoji: "⚡", name: "Platinum",  pts: "500+ pts",    color: "bg-purple-100 border-purple-200 text-purple-800" },
            ].map((l) => (
              <div key={l.name}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${l.color} font-semibold`}>
                <span className="text-2xl">{l.emoji}</span>
                <div>
                  <p className="text-sm font-bold">{l.name}</p>
                  <p className="text-xs opacity-70">{l.pts}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-green-400 text-sm font-semibold mb-3">Join thousands of eco swappers</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
            Ready to make<br />a difference?
          </h2>
          <p className="text-gray-400 text-sm mb-10 max-w-xl mx-auto">
            Create your free account today and start swapping, donating, and earning eco points in your community.
          </p>
          <Link href="/login?tab=signup"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold px-10 py-4 rounded-2xl transition shadow-xl hover:shadow-green-500/30 text-sm active:scale-95">
            🌱 Get started — it's free
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 py-8 text-center">
        <p className="text-xs text-gray-600">© 2026 Eco-Swap · Built for a greener planet 🌱</p>
      </footer>
    </div>
  );
}