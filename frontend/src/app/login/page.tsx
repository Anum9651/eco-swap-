"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { Suspense } from "react";

type Tab = "signin" | "signup" | "forgot";

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials":         "Incorrect email or password. Please try again.",
  "Email not confirmed":               "Please check your email and confirm your account first.",
  "User already registered":           "An account with this email already exists. Sign in instead.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "Unable to validate email address: invalid format": "Please enter a valid email address.",
};

function parseError(msg: string): string {
  for (const [key, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(key)) return friendly;
  }
  return msg;
}

function LoginPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab]               = useState<Tab>(
    searchParams.get("tab") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, []);

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [tab]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) { setError(parseError(err.message)); return; }
    router.push("/dashboard");
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (err) { setError(parseError(err.message)); return; }
    setSuccess("Account created! Check your email to confirm, then sign in.");
    setTab("signin");
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError("Enter your email address above."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(parseError(err.message)); return; }
    setSuccess("Password reset email sent! Check your inbox.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "signin")  handleSignIn();
      if (tab === "signup")  handleSignUp();
      if (tab === "forgot")  handleForgot();
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder-gray-400 bg-white outline-none transition-all
    focus:ring-2 focus:ring-green-500 focus:border-transparent hover:border-gray-300
    ${error ? "border-red-300" : "border-gray-200"}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex flex-col">

      {/* Nav */}
      <nav className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span>🌱</span> Eco-Swap
        </Link>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
              🌱
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {tab === "signin" ? "Welcome back"       :
               tab === "signup" ? "Create an account"  :
                                   "Reset your password"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {tab === "signin" ? "Sign in to your Eco-Swap account"        :
               tab === "signup" ? "Join thousands of eco-conscious swappers" :
                                   "We'll send you a reset link"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5">

            {/* Tabs */}
            {tab !== "forgot" && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {([
                  { key: "signin", label: "Sign In"  },
                  { key: "signup", label: "Sign Up"  },
                ] as const).map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      tab === t.key
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
                <span className="flex-shrink-0 mt-0.5">✅</span>
                {success}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                className={inputClass}
                autoFocus
                autoComplete="email"
              />
            </div>

            {/* Password */}
            {tab !== "forgot" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={handleKeyDown}
                    placeholder={tab === "signup" ? "Min. 6 characters" : "Your password"}
                    className={`${inputClass} pr-12`}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1">
                    {showPass ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength — signup only */}
                {tab === "signup" && password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= i * 3
                            ? password.length >= 10 ? "bg-green-500"
                            : password.length >= 6  ? "bg-yellow-400"
                            :                          "bg-red-400"
                            : "bg-gray-200"
                        }`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {password.length < 6  ? "Too short"  :
                       password.length < 10 ? "Fair"       :
                       password.length < 14 ? "Good"       : "Strong 💪"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Forgot password link */}
            {tab === "signin" && (
              <div className="flex justify-end -mt-2">
                <button onClick={() => setTab("forgot")}
                  className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline transition">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={tab === "signin" ? handleSignIn : tab === "signup" ? handleSignUp : handleForgot}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-sm">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {tab === "signin" ? "Signing in…"  :
                   tab === "signup" ? "Creating account…" :
                                      "Sending email…"}
                </>
              ) : (
                tab === "signin" ? "Sign In →"              :
                tab === "signup" ? "Create Account →"       :
                                   "Send Reset Link →"
              )}
            </button>

            {/* Back from forgot */}
            {tab === "forgot" && (
              <button onClick={() => setTab("signin")}
                className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700 py-2 transition">
                ← Back to sign in
              </button>
            )}

            {/* Switch tab hint */}
            {tab !== "forgot" && (
              <p className="text-center text-xs text-gray-400">
                {tab === "signin" ? (
                  <>Don't have an account?{" "}
                    <button onClick={() => setTab("signup")}
                      className="font-semibold text-green-600 hover:underline">
                      Sign up free
                    </button>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <button onClick={() => setTab("signin")}
                      className="font-semibold text-green-600 hover:underline">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}