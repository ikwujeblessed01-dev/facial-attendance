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

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [threshold, setThreshold] = useState(70);

  const [step, setStep] = useState<"code" | "select" | "scan" | "result">(
    initialCode ? "select" : "code"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanSuccess, setScanSuccess] = useState<boolean | null>(null);

  const [registeredPhoto, setRegisteredPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number>(0);

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

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleCapture = async (base64Image: string) => {
    if (!activeStudent?.faceTemplate || !activeClass) return;

    setIsScanning(true);
    setCapturedPhoto(base64Image);

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

    const score = await compareImages(activeStudent.faceTemplate, base64Image);
    setMatchScore(score);

    const isMatched = score >= threshold;
    setScanSuccess(isMatched);
    setIsScanning(false);

    await logAttendanceByLecturer(activeClass.lecturerUid, {
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      studentRollNumber: activeStudent.rollNumber,
      courseId: activeClass.courseId,
      courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
      status: isMatched ? "Present" : "Absent",
      similarityScore: score,
    });

    setStep("result");
  };

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
      <div className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Student Check-In Kiosk
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your class code, verify your identity via webcam, and log
            attendance instantly.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        {/* STEP 0: ENTER CLASS CODE */}
        {step === "code" && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900 mb-4 border border-emerald-100">
                <KeyRound className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Class Code Required</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Enter the 6-character code provided by your lecturer to join the
                attendance session.
              </p>
            </div>

            {resolveError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold animate-fade-in">
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
                  className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all uppercase placeholder-slate-300"
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

        {/* STEP 1: SELECT STUDENT */}
        {step === "select" && activeClass && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Connected to Class
                </span>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 mt-1">
                  <BookOpen className="h-4 w-4 text-emerald-700" />
                  {activeClass.courseCode}: {activeClass.courseName}
                </h2>
              </div>
              <button
                onClick={() => setStep("code")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
              >
                Change Class
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
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
                    className="w-full pl-10 pr-4 py-3.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all font-medium text-slate-900"
                  />
                  <Search className="absolute left-3.5 top-4 h-4 w-4 text-slate-400" />
                </div>

                {dropdownOpen && searchTerm && (
                  <div className="absolute z-30 w-full mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-slide-up">
                    {filteredStudents.length === 0 ? (
                      <p className="p-4 text-sm text-slate-400 font-medium text-center">
                        No matching students found in this class roster.
                      </p>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {student.rollNumber}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              student.faceTemplate
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-orange-50 border-orange-200 text-orange-800"
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

              {selectedStudentId && !registeredPhoto && (
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs leading-relaxed text-orange-800 animate-fade-in font-medium">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
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

            <button
              onClick={handleStartScan}
              disabled={!selectedStudentId || !registeredPhoto}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all duration-200 mt-6"
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
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-900">
                  {activeStudent?.name}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                  {activeClass?.courseCode} Session
                </p>
              </div>
            </div>

            <WebcamScanner
              onCapture={handleCapture}
              isScanning={isScanning}
              scanStatus={scanStatus}
              scanSuccess={scanSuccess}
            />

            <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Scanner Sensitivity
                </label>
                <span className="font-mono text-sm font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {threshold}% Match
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-emerald-900 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
                <span>Relaxed (50%)</span>
                <span>Recommended (70%)</span>
                <span>Strict (90%)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT AND COMPARISON */}
        {step === "result" && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 space-y-8 animate-scale-in text-center">
            {scanSuccess ? (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mb-5 border border-emerald-100 animate-bounce shadow-sm">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black text-emerald-800">
                  Attendance Logged
                </h2>
                <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                  Identity verified successfully. Your presence has been
                  recorded in the {activeClass?.courseCode} roster.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 mb-5 border border-red-100 animate-bounce shadow-sm">
                  <AlertTriangle className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black text-red-700">
                  Verification Failed
                </h2>
                <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                  The scan similarity score fell below the required threshold.
                  Please retry or contact your lecturer.
                </p>
              </div>
            )}

            <div className="border border-slate-100 rounded-3xl py-6 space-y-5 bg-slate-50 px-6 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Biometric Analysis Report
              </h3>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 mb-2 uppercase">
                    Registered Profile
                  </span>
                  {registeredPhoto && (
                    <div className="relative h-32 w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <img
                        src={registeredPhoto}
                        alt="Registered"
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 mb-2 uppercase">
                    Live Scan Frame
                  </span>
                  {capturedPhoto && (
                    <div
                      className={`relative h-32 w-full rounded-2xl border-4 overflow-hidden shadow-sm ${
                        scanSuccess ? "border-emerald-500" : "border-red-500"
                      }`}
                    >
                      <img
                        src={capturedPhoto}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="inline-flex flex-col items-center p-4 rounded-2xl bg-white border border-slate-200 shadow-sm mt-2 min-w-[150px]">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-tight">
                  Match Confidence
                </span>
                <span
                  className={`text-3xl font-black mt-1 ${
                    scanSuccess ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {matchScore}%
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded">
                  Threshold Target: {threshold}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!scanSuccess && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all shadow-md"
                >
                  <RefreshCw className="h-5 w-5" />
                  Retry Biometric Scan
                </button>
              )}

              {!scanSuccess && (
                <button
                  onClick={async () => {
                    if (activeStudent && activeClass) {
                      setScanSuccess(true);
                      playSynthSound("success");
                      await logAttendanceByLecturer(activeClass.lecturerUid, {
                        studentId: activeStudent.id,
                        studentName: activeStudent.name,
                        studentRollNumber: activeStudent.rollNumber,
                        courseId: activeClass.courseId,
                        courseName: `${activeClass.courseCode}: ${activeClass.courseName}`,
                        status: "Present",
                        similarityScore: 100,
                      });
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium py-2"
                >
                  Demo Override: Force Verification Approval
                </button>
              )}

              <Link
                href="/"
                onClick={() => setStep("select")}
                className="flex items-center justify-center w-full py-4 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-[0.98] transition-all"
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
    <div className="min-h-screen bg-slate-50 font-sans">
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
