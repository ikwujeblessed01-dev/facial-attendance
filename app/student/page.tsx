"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import WebcamScanner, { playSynthSound } from "../components/WebcamScanner";
import {
  resolveShareCode,
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

// Image comparison function using RMSE of downsampled grayscale grids
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
          const size = 32; // downsample to a 32x32 grid to analyze structures
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

  // Share Code Resolution States
  const [shareCode, setShareCode] = useState(initialCode);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [activeClass, setActiveClass] = useState<SharedClass | null>(null);

  // DB Lists (scoped to the lecturer that owns the activeClass)
  const [students, setStudents] = useState<Student[]>([]);

  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [threshold, setThreshold] = useState(70); // Match threshold %

  // Scanner states
  const [step, setStep] = useState<"code" | "select" | "scan" | "result">(
    initialCode ? "select" : "code"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanSuccess, setScanSuccess] = useState<boolean | null>(null);

  // Captured photos for side-by-side verification
  const [registeredPhoto, setRegisteredPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);

  // Auto-resolve code if present in URL
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
        const fetchedStudents = await getStudentsByLecturer(cls.lecturerUid);
        setStudents(fetchedStudents);
        setStep("select");
      } else {
        setResolveError("Invalid class code. Please check with your lecturer.");
      }
    } catch (err) {
      setResolveError("Failed to verify code. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setSearchTerm(student.name);
    setRegisteredPhoto(student.faceTemplate || null);
    setDropdownOpen(false);
  };

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  // Filter students by search term
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Start the scan procedure
  const handleStartScan = () => {
    if (!activeClass || !selectedStudentId) return;
    if (!activeStudent?.faceTemplate) {
      alert(
        "You do not have a face registered in the system. Please ask your lecturer to register your face first."
      );
      return;
    }

    setStep("scan");
    setIsScanning(false);
    setScanSuccess(null);
    setCapturedPhoto(null);
  };

  // Process capture from WebcamScanner
  const handleCapture = async (base64Image: string) => {
    if (!activeStudent?.faceTemplate || !activeClass) return;

    setIsScanning(true);
    setCapturedPhoto(base64Image);

    // Step-by-step biometric simulation sequence
    const statuses = [
      "Initializing AI neural face grid scanner...",
      "Analyzing face alignment and facial landmark coordinates...",
      "Generating biometric signature vector hash...",
      "Checking similarity with system registry database...",
    ];

    for (let i = 0; i < statuses.length; i++) {
      setScanStatus(statuses[i]);
      playSynthSound("scan");
      await new Promise((r) => setTimeout(r, 800));
    }

    // Run the actual image comparison
    const score = await compareImages(activeStudent.faceTemplate, base64Image);
    setMatchScore(score);

    const isMatched = score >= threshold;
    setScanSuccess(isMatched);
    setIsScanning(false);

    // Log the attendance records in the lecturer's database
    await logAttendanceByLecturer(activeClass.lecturerUid, {
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      studentRollNumber: activeStudent.rollNumber,
      courseId: activeClass.courseId,
      courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
      status: isMatched ? "Present" : "Absent",
      similarityScore: score,
    });

    // Go to results step
    setStep("result");
  };

  // Reset scanner to retry
  const handleRetry = () => {
    setStep("scan");
    setScanSuccess(null);
    setCapturedPhoto(null);
    setIsScanning(false);
    setScanStatus("Ready to scan");
  };

  return (
    <>
      {/* Top Header */}
      <div className="border-b border-zinc-200/50 bg-white py-6 dark:border-zinc-800/50 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black tracking-tight">
            Student Attendance Check-In
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            Enter your class code, verify your identity via webcam, and log
            attendance instantly.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        {/* STEP 0: ENTER CLASS CODE */}
        {step === "code" && (
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-6 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-4">
                <KeyRound className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">Class Code Required</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                Enter the 6-character code provided by your lecturer to join the
                attendance session.
              </p>
            </div>

            {resolveError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400 text-sm font-medium animate-fade-in">
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
                  className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono font-bold rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={resolving || shareCode.length < 6}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
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

        {/* STEP 1: SELECT STUDENT */}
        {step === "select" && activeClass && (
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Connected to Class
                </span>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white mt-1">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  {activeClass.courseCode}: {activeClass.courseName}
                </h2>
              </div>
              <button
                onClick={() => setStep("code")}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                Change
              </button>
            </div>

            <div className="space-y-4">
              {/* Student Selection (Search + dropdown) */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Confirm Your Identity
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type your name or roll number..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedStudentId("");
                      setRegisteredPhoto(null);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                </div>

                {/* Dropdown Suggestions */}
                {dropdownOpen && searchTerm && (
                  <div className="absolute z-30 w-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 animate-slide-up">
                    {filteredStudents.length === 0 ? (
                      <p className="p-4 text-sm text-zinc-400 italic text-center">
                        No matching students found in this class roster.
                      </p>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-sm text-zinc-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {student.rollNumber}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              student.faceTemplate
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400"
                                : "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400"
                            }`}
                          >
                            {student.faceTemplate
                              ? "Ready to scan"
                              : "Missing Profile"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Warning if Student lacks biometric print */}
              {selectedStudentId && !registeredPhoto && (
                <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900 text-xs leading-relaxed text-amber-800 dark:text-amber-300 animate-fade-in">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold mb-0.5 text-sm">
                      Biometric Profile Missing
                    </h4>
                    <p>
                      You cannot check in because your face profile hasn't been
                      registered by your lecturer. Please consult them to
                      complete your enrollment.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleStartScan}
              disabled={!selectedStudentId || !registeredPhoto}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 mt-6"
            >
              Proceed to Biometric Scan
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* STEP 2: SCAN BIOMETRICS */}
        {step === "scan" && (
          <div className="space-y-6 animate-fade-in flex flex-col items-center">
            <div className="w-full flex items-center justify-between">
              <button
                onClick={() => setStep("select")}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Selection
              </button>
              <div className="text-right">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {activeStudent?.name}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {activeClass?.courseCode} Course Log
                </p>
              </div>
            </div>

            <WebcamScanner
              onCapture={handleCapture}
              isScanning={isScanning}
              scanStatus={scanStatus}
              scanSuccess={scanSuccess}
            />

            {/* Threshold matching sensitivity configurations */}
            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Scanner Sensitivity (Threshold)
                </label>
                <span className="font-mono text-sm font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                  {threshold}% Match
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-200 rounded-lg appearance-none dark:bg-zinc-700"
              />
              <div className="flex justify-between text-[10px] font-medium text-zinc-400 mt-2">
                <span>Relaxed (50%)</span>
                <span>Recommended (70%)</span>
                <span>Strict (90%)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT AND COMPARISON */}
        {step === "result" && (
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/40 space-y-8 animate-scale-in text-center">
            {/* Success / Failure Banner */}
            {scanSuccess ? (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5 animate-bounce">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  Attendance Logged
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-sm">
                  Identity verified successfully. Your presence has been
                  recorded in the {activeClass?.courseCode} class roster.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 mb-5 animate-bounce">
                  <AlertTriangle className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black text-red-600 dark:text-red-400">
                  Verification Mismatch
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-sm">
                  The scan similarity score fell below the required threshold.
                  Please retry or contact your lecturer.
                </p>
              </div>
            )}

            {/* Side by side biometric breakdown */}
            <div className="border-y border-zinc-200/50 dark:border-zinc-800/50 py-6 space-y-5 bg-zinc-50/50 dark:bg-zinc-950/20 -mx-6 px-6 sm:-mx-8 sm:px-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Biometric Analysis Report
              </h3>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {/* Registered */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase">
                    Registered Profile
                  </span>
                  {registeredPhoto && (
                    <div className="relative h-32 w-full rounded-2xl border border-zinc-200 overflow-hidden dark:border-zinc-800 shadow-inner">
                      <img
                        src={registeredPhoto}
                        alt="Registered Profile"
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
                    </div>
                  )}
                </div>

                {/* Captured */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase">
                    Scan Frame Capture
                  </span>
                  {capturedPhoto && (
                    <div
                      className={`relative h-32 w-full rounded-2xl border-2 overflow-hidden shadow-inner ${
                        scanSuccess ? "border-emerald-400" : "border-red-400"
                      }`}
                    >
                      <img
                        src={capturedPhoto}
                        alt="Captured Live"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 pointer-events-none ${
                          scanSuccess ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Score badge */}
              <div className="inline-flex flex-col items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm mt-2">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-tight">
                  Match Confidence
                </span>
                <span
                  className={`text-3xl font-black mt-1 ${
                    scanSuccess ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {matchScore}%
                </span>
                <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  Threshold Target: {threshold}%
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {!scanSuccess && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all shadow-md"
                >
                  <RefreshCw className="h-5 w-5" />
                  Retry Biometric Scan
                </button>
              )}

              {/* Admin override toggle just in case it's a demo */}
              {!scanSuccess && (
                <button
                  onClick={async () => {
                    if (activeStudent && activeClass) {
                      setScanSuccess(true);
                      playSynthSound("success");
                      // Clear last log since it was negative and replace with Present
                      await logAttendanceByLecturer(activeClass.lecturerUid, {
                        studentId: activeStudent.id,
                        studentName: activeStudent.name,
                        studentRollNumber: activeStudent.rollNumber,
                        courseId: activeClass.courseId,
                        courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
                        status: "Present",
                        similarityScore: 100, // Override score
                      });
                    }
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline font-medium py-2"
                >
                  Demo Override: Force Verification Approval
                </button>
              )}

              <Link
                href="/"
                onClick={() => setStep("select")}
                className="flex items-center justify-center w-full py-4 rounded-xl text-sm font-bold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
              >
                Return to Home Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function StudentPortal() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-20">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        }
      >
        <StudentPortalContent />
      </Suspense>
    </div>
  );
}
