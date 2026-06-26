"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Camera,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect
  if (!loading && user) {
    router.replace("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(name.trim(), email, password);
      }
      router.push("/admin");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err?.message || "Authentication failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-900/5 to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-800/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-white to-transparent"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-lg group-hover:-translate-y-1 transition-transform duration-300">
              <Camera className="h-6 w-6" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-slate-800">
              FR
            </span>
          </Link>
          <p className="text-slate-500 text-sm text-center">
            {mode === "login"
              ? "Welcome back. Sign in to your lecturer account."
              : "Create a new lecturer account to get started."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          {/* Tab toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/60">
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white text-emerald-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-white text-emerald-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Dr. John Smith"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="lecturer@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>
                  {mode === "login" ? (
                    <LogIn className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {mode === "login"
                    ? "Sign In"
                    : "Create Lecturer Account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 mt-8 text-slate-400 text-[10px] font-bold tracking-wide uppercase">
            <Shield className="h-3.5 w-3.5" />
            Secured with Firebase Authentication
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-1"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
