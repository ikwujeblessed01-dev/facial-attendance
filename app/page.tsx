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
  Camera
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
      <main className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative overflow-hidden flex flex-col transition-colors duration-200">
        {/* Background Decorative blobs */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-emerald-100/50 dark:from-emerald-950/30 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[500px] bg-gradient-to-tr from-blue-50/50 dark:from-blue-950/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Hero Header */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 text-center animate-slide-up flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-6 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm animate-fade-in stagger-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping"></span>
            Biometric Intelligence Enabled
          </div>
          
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl text-slate-900 dark:text-slate-100 animate-fade-in stagger-2">
            Facial Attendance <br />
            <span className="text-emerald-900 dark:text-emerald-400">Simplified.</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400 leading-relaxed animate-fade-in stagger-3 font-medium">
            A secure, contactless, and automated facial recognition system built
            for universities. Enroll students, compile records, and mark
            attendance in milliseconds.
          </p>

          {!loading && !user && (
            <div className="mt-10 flex justify-center gap-4 animate-fade-in stagger-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-800 hover:-translate-y-0.5 transition-all active:scale-95"
              >
                <LogIn className="h-5 w-5" />
                Lecturer Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Dual Portals Section */}
        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
            {/* Lecturer Card */}
            <div className="group rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-xl hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col justify-between overflow-hidden animate-slide-up stagger-4 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-950/20 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-emerald-900 dark:text-emerald-400 mb-6 group-hover:bg-emerald-900 group-hover:text-white dark:group-hover:bg-emerald-800 transition-colors duration-300 shadow-sm">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Lecturer Portal
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                  Access the administrative control center to add courses,
                  register student database biometric keys, verify facial
                  captures, and audit full attendance sheets.
                </p>
              </div>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all duration-200"
              >
                {user ? "Go to Dashboard" : "Access Admin Panel"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Student Card */}
            <div className="group rounded-[2rem] border border-slate-200 dark:border-emerald-900/50 bg-emerald-900 text-white p-8 sm:p-10 shadow-xl shadow-emerald-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden animate-slide-up stagger-5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-800 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
              <div>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm text-white mb-6 group-hover:bg-white group-hover:text-emerald-900 transition-colors duration-300 shadow-inner border border-white/20">
                  <UserCheck className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  Student Registration
                </h3>
                <p className="text-emerald-100/80 text-sm leading-relaxed mb-8 font-medium">
                  Connect to your class, input your student credentials, and capture your biometric face profile to self-register for the course.
                </p>
              </div>

              <Link
                href="/student"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-bold text-emerald-900 bg-white hover:bg-slate-50 active:scale-95 transition-all duration-200"
              >
                Register Your Profile
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping ml-1"></span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 text-center text-xs font-medium text-slate-400 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 w-full mt-auto transition-colors duration-200">
          <p>© {new Date().getFullYear()} FR FaceCheck. All rights reserved.</p>
        </footer>
      </main>
    </>
  );
}
