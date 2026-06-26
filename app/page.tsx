"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  UserCheck,
  BookOpen,
  Users,
  CheckCircle,
  ArrowRight,
  LogIn,
} from "lucide-react";
import Navbar from "./components/Navbar";
import { useAuth } from "./lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    logs: 0,
    todayRate: 0,
  });

  // Mocking global stats for the hero page since data is now per-lecturer
  // In a real multi-tenant app, this might come from an aggregated cloud function
  useEffect(() => {
    setStats({
      courses: 142,
      students: 3850,
      logs: 12400,
      todayRate: 94,
    });
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50 relative overflow-hidden">
        {/* Glowing Decorative Backdrops */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-float pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-float stagger-3 pointer-events-none"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl -z-10 animate-float stagger-2 pointer-events-none"></div>

        {/* Hero Header */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 text-center animate-slide-up">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-6 border border-blue-500/20 shadow-sm animate-fade-in stagger-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
            Biometric Intelligence Enabled
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent animate-fade-in stagger-2">
            Facial Attendance System
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed animate-fade-in stagger-3">
            A secure, contactless, and automated facial recognition system built
            for universities. Enroll students, compile records, and mark
            attendance in milliseconds.
          </p>

          {!loading && !user && (
            <div className="mt-8 flex justify-center gap-4 animate-fade-in stagger-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-all active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                Lecturer Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Dual Portals Section */}
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
            {/* Lecturer Card */}
            <div className="relative group rounded-3xl border border-zinc-200/80 bg-white/50 backdrop-blur-sm p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/50 hover:border-blue-500/30 dark:hover:border-blue-400/30 flex flex-col justify-between overflow-hidden animate-slide-up stagger-4">
              {/* Card Glow */}
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-colors duration-300"></div>

              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                  Lecturer Portal
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  Access the administrative control center to add courses,
                  register student database biometric keys, verify facial
                  captures, and audit full attendance sheets.
                </p>
              </div>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-200"
              >
                {user ? "Go to Dashboard" : "Lecturer Sign In"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Student Card */}
            <div className="relative group rounded-3xl border border-zinc-200/80 bg-white/50 backdrop-blur-sm p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/50 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 flex flex-col justify-between overflow-hidden animate-slide-up stagger-5">
              {/* Card Glow */}
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-300"></div>

              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <UserCheck className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                  Student Check-In
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
                  Open the facial recognition scanner terminal. Select your
                  enrolled class, align your face with the camera guide, and
                  instantly record your attendance.
                </p>
              </div>

              <Link
                href="/student"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all duration-200"
              >
                Launch Facial Scan
                <span className="h-2 w-2 rounded-full bg-white animate-ping ml-1"></span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live System Stats Grid */}
        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/20 py-12 animate-fade-in">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h4 className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-8">
              Live Global Campus Statistics
            </h4>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 max-w-4xl mx-auto">
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm transition-transform hover:scale-105">
                <BookOpen className="h-5 w-5 text-blue-500 mb-2" />
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {stats.courses.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Active Courses
                </span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm transition-transform hover:scale-105 stagger-1">
                <Users className="h-5 w-5 text-indigo-500 mb-2" />
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {stats.students.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Enrolled Students
                </span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm transition-transform hover:scale-105 stagger-2">
                <CheckCircle className="h-5 w-5 text-emerald-500 mb-2" />
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {stats.logs.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Attendance Logs
                </span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm transition-transform hover:scale-105 stagger-3">
                <UserCheck className="h-5 w-5 text-purple-500 mb-2" />
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {stats.todayRate}%
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Average Attendance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} FaceCheck. All rights reserved.</p>
        </footer>
      </main>
    </>
  );
}
