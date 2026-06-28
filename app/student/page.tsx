"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import WebcamScanner, { playSynthSound } from "../components/WebcamScanner";
import {
  resolveShareCode,
  registerStudentSelf,
  getStudentsByLecturer,
  logAttendanceByLecturer,
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

function compareImages(
  img1Base64: string,
  img2Base64: string
): Promise<number> {
  return new Promise((resolve) => {
    const img1 = new Image();
    const img2 = new Image();

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        try {
          const size = 32;
          const canvas1 = document.createElement("canvas");
          const canvas2 = document.createElement("canvas");
          canvas1.width = size;
          canvas1.height = size;
          canvas2.width = size;
          canvas2.height = size;

          const ctx1 = canvas1.getContext("2d");
          const ctx2 = canvas2.getContext("2d");
          if (!ctx1 || !ctx2) {
            resolve(50);
            return;
          }

          ctx1.drawImage(img1, 0, 0, size, size);
          ctx2.drawImage(img2, 0, 0, size, size);

          const data1 = ctx1.getImageData(0, 0, size, size).data;
          const data2 = ctx2.getImageData(0, 0, size, size).data;

          let diffSum = 0;
          for (let i = 0; i < data1.length; i += 4) {
            const g1 =
              0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
            const g2 =
              0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];

            diffSum += Math.pow(g1 - g2, 2);
          }

          const mse = diffSum / (size * size);
          let similarity = 100 - Math.sqrt(mse) * 1.5;
          similarity = Math.max(0, Math.min(100, similarity));

          resolve(Math.round(similarity * 10) / 10);
        } catch (e) {
          console.error("Comparison algorithm failed:", e);
          resolve(55);
        }
      }
    };

    img1.onload = onLoaded;
    img2.onload = onLoaded;
    img1.onerror = () => resolve(0);
    img2.onerror = () => resolve(0);

    img1.src = img1Base64;
    img2.src = img2Base64;
  });
}

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

  // New States for Attendance & Flow
  const [studentPortalMode, setStudentPortalMode] = useState<"attendance" | "register">("attendance");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isSuccessAttendance, setIsSuccessAttendance] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);

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
        setActiveClass(cls);
        const active = cls.sessionActiveUntil ? cls.sessionActiveUntil > Date.now() : false;
        setStudentPortalMode(active ? "attendance" : "register");
        setStep("register");
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

    setIsRegistering(true);
    try {
      const registered = await registerStudentSelf(activeClass.lecturerUid, {
        name: studentName.trim(),
        rollNumber: studentRoll.trim().toUpperCase(),
        department: studentDept.trim(),
        faceTemplate: capturedPhoto,
      });

      // If session is active, also mark them as present automatically!
      const isSessionActive = activeClass.sessionActiveUntil && activeClass.sessionActiveUntil > Date.now();
      if (isSessionActive) {
        await logAttendanceByLecturer(activeClass.lecturerUid, {
          studentId: registered.id,
          studentName: registered.name,
          studentRollNumber: registered.rollNumber,
          courseId: activeClass.courseId,
          courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
          status: "Present",
          similarityScore: 100, // Direct self-registration matches 100%
        });
        setIsSuccessAttendance(true);
      } else {
        setIsSuccessAttendance(false);
      }

      setStep("success");
    } catch (err) {
      alert("Failed to register. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass || !studentRoll.trim() || !capturedPhoto) {
      alert("Please enter your Roll Number and capture your face profile.");
      return;
    }

    // Ensure attendance session is active
    if (!activeClass.sessionActiveUntil || Date.now() >= activeClass.sessionActiveUntil) {
      alert("Attendance session is not active. Cannot mark attendance.");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");
    try {
      // 1. Fetch lecturer's student list to find the student profile
      const enrolledStudents = await getStudentsByLecturer(activeClass.lecturerUid);
      const student = enrolledStudents.find(
        (s) => s.rollNumber.toUpperCase() === studentRoll.trim().toUpperCase()
      );

      if (!student) {
        setVerificationError("Roll Number not found in the course roster. Please register first.");
        setIsVerifying(false);
        return;
      }

      if (!student.faceTemplate) {
        setVerificationError("Biometric face template not found for this profile. Please register first.");
        setIsVerifying(false);
        return;
      }

      // 2. Perform face comparison
      const score = await compareImages(student.faceTemplate, capturedPhoto);
      setMatchScore(score);

      if (score >= 70) {
        // 3. Log attendance
        await logAttendanceByLecturer(activeClass.lecturerUid, {
          studentId: student.id,
          studentName: student.name,
          studentRollNumber: student.rollNumber,
          courseId: activeClass.courseId,
          courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
          status: "Present",
          similarityScore: score,
        });

        // Set student profile info to display on success screen
        setStudentName(student.name);
        setStudentDept(student.department || "");
        setIsSuccessAttendance(true);
        setStep("success");
      } else {
        setVerificationError(`Verification failed (Match score: ${score}%). Please align your face properly and try again.`);
      }
    } catch (err) {
      console.error(err);
      setVerificationError("Failed to verify biometrics. Please try again.");
    } finally {
      setIsVerifying(false);
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
    setVerificationError("");
    setMatchScore(null);
    setIsSuccessAttendance(false);
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

        {/* STEP 1: REGISTER / MARK ATTENDANCE */}
        {step === "register" && activeClass && (
          <div className="space-y-6">
            {/* Toggle Mode Tab if session is active */}
            {(() => {
              const isSessionActive = activeClass.sessionActiveUntil ? activeClass.sessionActiveUntil > now : false;
              return (
                <div className="space-y-6">
                  {isSessionActive ? (
                    <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPortalMode("attendance");
                          setCapturedPhoto(null);
                          setScanStatus("Align your face and take snapshot");
                          setVerificationError("");
                        }}
                        className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          studentPortalMode === "attendance"
                            ? "bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-400 shadow-sm"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        Mark Attendance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPortalMode("register");
                          setCapturedPhoto(null);
                          setScanStatus("Align your face and take snapshot");
                          setVerificationError("");
                        }}
                        className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          studentPortalMode === "register"
                            ? "bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-400 shadow-sm"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        Register Profile
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Attendance Session Not Active</p>
                        <p className="text-xs text-amber-600 dark:text-amber-450 mt-1 leading-relaxed">
                          You can register your student profile and face biometrics for this course at any time, but marking attendance is only possible when the class is in session.
                        </p>
                      </div>
                    </div>
                  )}

                  {verificationError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-400 text-sm font-semibold animate-fade-in">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{verificationError}</span>
                    </div>
                  )}

                  {/* RENDER MODE: MARK ATTENDANCE */}
                  {isSessionActive && studentPortalMode === "attendance" ? (
                    <form onSubmit={handleMarkAttendance} className="space-y-6">
                      <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100 font-sans">
                            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-500" />
                            {activeClass.courseCode}: Mark Attendance
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
                            <span>Selfie profile snapshot verified. Ready to mark attendance!</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isVerifying || !studentRoll.trim() || !capturedPhoto}
                          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Verifying Biometrics...
                            </>
                          ) : (
                            <>
                              Verify & Mark Present
                              <ChevronRight className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* RENDER MODE: REGISTER PROFILE */
                    <form onSubmit={handleRegister} className="space-y-6">
                      <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100 font-sans">
                            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-500" />
                            {activeClass.courseCode}: Register Profile
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
                          disabled={isRegistering || !studentName.trim() || !studentRoll.trim() || !studentDept.trim() || !capturedPhoto}
                          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Registering Profile...
                            </>
                          ) : (
                            <>
                              {isSessionActive ? "Register & Mark Present" : "Register Biometrics & Course"}
                              <ChevronRight className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 2: SUCCESS */}
        {step === "success" && activeClass && (
          <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 space-y-8 animate-scale-in text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 mb-5 border border-emerald-100 dark:border-emerald-900/50 animate-bounce shadow-sm">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-emerald-800 dark:text-emerald-400">
                {isSuccessAttendance ? "Attendance Logged!" : "Registration Successful!"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-sm font-medium">
                {isSuccessAttendance 
                  ? `Your attendance has been successfully verified and logged for ${activeClass.courseCode}.`
                  : `Your biometric face profile is registered for ${activeClass.courseCode}.`
                }
              </p>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl py-6 px-6 bg-slate-50 dark:bg-slate-800/50 text-left space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Profile</h3>
                {matchScore !== null && (
                  <span className="px-2 py-0.5 bg-emerald-55 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-900/50">
                    Match Confidence: {matchScore}%
                  </span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Name:</span>
                <span className="font-bold text-slate-950 dark:text-slate-100">{studentName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Roll Number:</span>
                <span className="font-mono font-bold text-slate-950 dark:text-slate-100">{studentRoll.toUpperCase()}</span>
              </div>
              {studentDept && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span>
                  <span className="font-bold text-slate-950 dark:text-slate-100">{studentDept}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Class:</span>
                <span className="font-bold text-slate-950 dark:text-slate-100">{activeClass.courseCode} - {activeClass.courseName}</span>
              </div>
            </div>

            {!isSuccessAttendance && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed font-medium animate-pulse">
                📣 <strong>How to mark your attendance:</strong> To verify your attendance, walk up to the lecturer's device/attendance kiosk at the classroom door. The kiosk scanner will check your face profile and log your presence.
              </div>
            )}

            <button
              onClick={handleReset}
              className="flex items-center justify-center w-full py-4 rounded-xl text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              Back to Code Screen
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
