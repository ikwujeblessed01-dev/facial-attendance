"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import WebcamScanner, { playSynthSound } from "../components/WebcamScanner";
import {
  resolveShareCode,
  registerStudentSelf,
  Student,
  SharedClass,
} from "../lib/db";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Comparison helper is no longer needed on student portal as recognition is done at the admin kiosk.

function StudentPortalContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("class") || "";

  const [shareCode, setShareCode] = useState(initialCode);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [activeClass, setActiveClass] = useState<SharedClass | null>(null);

  // Registration form states
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentDept, setStudentDept] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [step, setStep] = useState<"code" | "register" | "success">(
    initialCode ? "register" : "code"
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [scanStatus, setScanStatus] = useState("Align your face and take snapshot");
  // Current timestamp for countdown
  const [now, setNow] = useState(Date.now());
  // Update now every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialCode) {
      handleResolveCode(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const handleResolveCode = async (code: string) => {
    if (!code.trim()) return;
    setResolving(true);
    setResolveError("");
    try {
      const cls = await resolveShareCode(code.trim());
      if (cls) {
        // Check if session is active
        if (cls.sessionActiveUntil && cls.sessionActiveUntil > Date.now()) {
          setActiveClass(cls);
          setStep("register");
        } else {
          setResolveError("Attendance session is not active for this class.");
        }
      } else {
        setResolveError("Invalid class code. Please check with your lecturer.");
      }
    } catch (err) {
      setResolveError("Failed to verify code. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const handleCapture = (base64Image: string) => {
    setCapturedPhoto(base64Image);
    setScanStatus("Face profile snapshot captured successfully!");
    playSynthSound("success");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !studentName.trim() || !studentRoll.trim() || !studentDept.trim() || !capturedPhoto) {
      alert("Please fill in all details and capture your face profile.");
      return;
    }
    // Ensure attendance session is active
    if (!activeClass.sessionActiveUntil || Date.now() >= activeClass.sessionActiveUntil) {
      alert("Attendance session is not active. Cannot register.");
      return;
    }

    setIsRegistering(true);
    try {
      await registerStudentSelf(activeClass.lecturerUid, {
        name: studentName.trim(),
        rollNumber: studentRoll.trim().toUpperCase(),
        department: studentDept.trim(),
        faceTemplate: capturedPhoto,
      });
      setStep("success");
    } catch (err) {
      alert("Failed to register. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleReset = () => {
    setStudentName("");
    setStudentRoll("");
    setStudentDept("");
    setCapturedPhoto(null);
    setScanStatus("Align your face and take snapshot");
    setStep("code");
    setActiveClass(null);
  };

  return (
    <>
      {/* Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Student Course Registration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Register yourself for your course and enroll your biometric face profile.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        {/* STEP 0: ENTER CLASS CODE */}
        {step === "code" && (
          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-6 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-400 mb-4 border border-emerald-100 dark:border-emerald-900/50">
                <KeyRound className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Class Code Required</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                Enter the 6-character code provided by your lecturer to register for
                their course roster.
              </p>
            </div>

            {resolveError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-400 text-sm font-semibold animate-fade-in">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{resolveError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveCode(shareCode);
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  placeholder="e.g. A1B2C3"
                  required
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all uppercase placeholder-slate-300 dark:placeholder-slate-600"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={resolving || shareCode.length < 6}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200"
              >
                {resolving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Locating Class...
                  </>
                ) : (
                  <>
                    Connect to Class
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 1: REGISTER */}
        {step === "register" && activeClass && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-500" />
                  {activeClass.courseCode}: {activeClass.courseName}
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name..."
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Roll Number / Student ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. U19CS1001"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={studentDept}
                    onChange={(e) => setStudentDept(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <WebcamScanner
                onCapture={handleCapture}
                isScanning={false}
                scanStatus={scanStatus}
                scanSuccess={capturedPhoto ? true : null}
              />
              
              {capturedPhoto && (
                <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-bold">
                  <span>Biometric face profile capture verified. Ready to register!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isRegistering || !studentName.trim() || !studentRoll.trim() || !studentDept.trim() || !capturedPhoto || !activeClass?.sessionActiveUntil || (now >= activeClass.sessionActiveUntil)}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Registering Profile...
                  </>
                ) : (
                  <>
                    Register Biometrics & Course
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SUCCESS */}
        {step === "success" && activeClass && (
          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-8 animate-scale-in text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 mb-5 border border-emerald-100 dark:border-emerald-900/50 animate-bounce shadow-sm">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-emerald-800 dark:text-emerald-400">
                Registration Successful!
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-sm font-medium">
                Your biometric face profile is registered for <strong>{activeClass.courseCode}</strong>.
              </p>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl py-6 px-6 bg-slate-50 dark:bg-slate-800/50 text-left space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Student Profile</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Name:</span>
                <span className="font-bold text-slate-950 dark:text-slate-100">{studentName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Roll Number:</span>
                <span className="font-mono font-bold text-slate-950 dark:text-slate-100">{studentRoll.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span>
                <span className="font-bold text-slate-950 dark:text-slate-100">{studentDept}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Class:</span>
                <span className="font-bold text-slate-950 dark:text-slate-100">{activeClass.courseCode} - {activeClass.courseName}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed font-medium">
              📣 <strong>How to mark your attendance:</strong> To verify your attendance, walk up to the lecturer's device/attendance kiosk at the classroom door. The kiosk scanner will check your face profile and log your presence.
            </div>

            <button
              onClick={handleReset}
              className="flex items-center justify-center w-full py-4 rounded-xl text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 shadow-md active:scale-[0.98] transition-all"
            >
              Register Another Course
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function StudentPortal() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <StudentPortalContent />
      </Suspense>
    </div>
  );
}
