"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a session after clicking the email link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true);
      else setError("Invalid or expired reset link. Please request a new one.");
    });
  }, []);

  const handleReset = async () => {
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex flex-col">
      <nav className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span>🌱</span> Eco-Swap
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
              🔒
            </div>
            <h1 className="text-2xl font-black text-gray-900">Set new password</h1>
            <p className="text-sm text-gray-400 mt-1">Choose a strong password for your account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5">

            {success ? (
              <div className="text-center py-4 space-y-3">
                <div className="text-4xl">✅</div>
                <p className="text-sm font-semibold text-gray-800">Password updated successfully!</p>
                <p className="text-xs text-gray-400">Redirecting you to the dashboard…</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                    <span>⚠️</span> {error}
                  </div>
                )}

                {validSession && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); }}
                          placeholder="Min. 6 characters"
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 hover:border-gray-300 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                        <button type="button" onClick={() => setShowPass((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d={showPass
                                ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              } />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                        placeholder="Repeat your new password"
                        className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          confirm && confirm !== password ? "border-red-300" : "border-gray-200 hover:border-gray-300"
                        }`}
                      />
                      {confirm && confirm !== password && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <button onClick={handleReset} disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95 text-sm">
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Updating…
                        </>
                      ) : "Update Password →"}
                    </button>
                  </>
                )}

                {!validSession && !error && (
                  <div className="text-center py-4">
                    <svg className="w-6 h-6 animate-spin text-green-500 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}

                <Link href="/login"
                  className="block text-center text-xs font-semibold text-gray-400 hover:text-gray-600 transition">
                  ← Back to sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}