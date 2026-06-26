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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-zinc-950 to-emerald-950 animate-gradient" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-float stagger-3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-xl shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <Camera className="h-7 w-7" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity -z-10" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              FaceCheck<span className="text-blue-400 font-extrabold">.</span>
            </span>
          </Link>
          <p className="text-zinc-400 text-sm text-center">
            {mode === "login"
              ? "Welcome back. Sign in to your lecturer account."
              : "Create a new lecturer account to get started."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
          {/* Tab toggle */}
          <div className="flex p-1 bg-zinc-800/60 rounded-xl mb-6">
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create Account
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-medium animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Dr. John Smith"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-800 bg-zinc-950/70 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                placeholder="lecturer@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-800 bg-zinc-950/70 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border border-zinc-800 bg-zinc-950/70 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 tracking-wide">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-800 bg-zinc-950/70 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/15 active:scale-[0.98] transition-all duration-200"
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
          <div className="flex items-center justify-center gap-1.5 mt-6 text-zinc-500 text-[10px] font-medium">
            <Shield className="h-3 w-3" />
            Secured with Firebase Authentication
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
