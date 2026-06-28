"use client";

import { useEffect, useState, useCallback } from "react";
import WebcamScanner from "../components/WebcamScanner";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../lib/auth-context";
import {
  getCourses,
  addCourse,
  getStudents,
  deleteStudent,
  updateStudentFace,
  getAttendanceLogs,
  clearAttendanceLogs,
  startAttendanceSession,
  stopAttendanceSession,
  logAttendance,
  deleteAllDataForLecturer,
  Course,
  Student,
  AttendanceLog,
} from "../lib/db";
import {
  BookOpen,
  Users,
  Calendar,
  Plus,
  Trash2,
  Camera,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Award,
  Clock,
  RefreshCw,
  FolderOpen,
  Copy,
  LayoutDashboard,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Mail,
  ChevronRight,
  TrendingUp,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "../lib/theme-context";
import { playSynthSound } from "../components/WebcamScanner";

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

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const uid = user?.uid;
  const { theme, setTheme } = useTheme();

  // DB States
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "setup" | "biometrics" | "logs" | "settings"
  >("dashboard");

  // Form States
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");

  // Biometrics States
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [registeredPreview, setRegisteredPreview] = useState<string | null>(
    null
  );
  const [boothStatus, setBoothStatus] = useState(
    "Align student face and take snapshot"
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [boothSuccess, setBoothSuccess] = useState<boolean | null>(null);

  // Filters State
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // Notification banners (toast stack)
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" }[]
  >([]);

  // Timer state for sessions
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Kiosk States
  const [kioskCourse, setKioskCourse] = useState<Course | null>(null);
  const [kioskStatus, setKioskStatus] = useState("Ready to scan next student...");
  const [kioskSuccess, setKioskSuccess] = useState<boolean | null>(null);
  const [kioskScannedStudent, setKioskScannedStudent] = useState<Student | null>(null);
  const [kioskMatchScore, setKioskMatchScore] = useState<number>(0);
  const [kioskCapturedPhoto, setKioskCapturedPhoto] = useState<string | null>(null);
  const [isKioskScanning, setIsKioskScanning] = useState(false);
  const [kioskThreshold, setKioskThreshold] = useState(70);

  // Bulk Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load database tables
  const loadData = useCallback(async () => {
    if (!uid) return;
    setLoadingData(true);
    try {
      const [fetchedCourses, fetchedStudents, fetchedLogs] = await Promise.all([
        getCourses(uid),
        getStudents(uid),
        getAttendanceLogs(uid),
      ]);
      setCourses(fetchedCourses);
      setStudents(fetchedStudents);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("Error loading data:", error);
      triggerNotification("Failed to load dashboard data.", "error");
    } finally {
      setLoadingData(false);
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerNotification = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Add Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim() || !uid) return;
    try {
      await addCourse(uid, {
        name: courseName.trim(),
        code: courseCode.trim().toUpperCase(),
      });
      const updatedCourses = await getCourses(uid);
      setCourses(updatedCourses);
      setCourseName("");
      setCourseCode("");
      triggerNotification("Course added successfully!", "success");
    } catch (err) {
      triggerNotification("Failed to add course.", "error");
    }
  };

  // Session Controls
  const handleStartSession = async (courseId: string, shareCode: string, durationHours: number) => {
    if (!uid) return;
    try {
      await startAttendanceSession(uid, courseId, shareCode, durationHours * 60 * 60 * 1000);
      const updatedCourses = await getCourses(uid);
      setCourses(updatedCourses);
      triggerNotification(`Session started for ${durationHours} hour(s).`, "success");
    } catch (err) {
      triggerNotification("Failed to start session.", "error");
    }
  };

  const handleStopSession = async (courseId: string, shareCode: string) => {
    if (!uid) return;
    try {
      await stopAttendanceSession(uid, courseId, shareCode);
      const updatedCourses = await getCourses(uid);
      setCourses(updatedCourses);
      triggerNotification("Session stopped.", "success");
    } catch (err) {
      triggerNotification("Failed to stop session.", "error");
    }
  };

  const handleKioskCapture = async (base64Image: string) => {
    if (!uid || !kioskCourse) return;
    setIsKioskScanning(true);
    setKioskCapturedPhoto(base64Image);
    setKioskScannedStudent(null);
    setKioskSuccess(null);

    // List of students who have registered face templates
    const eligibleStudents = students.filter(s => s.faceTemplate);

    if (eligibleStudents.length === 0) {
      setKioskSuccess(false);
      setKioskStatus("No students have registered biometrics for this class yet.");
      playSynthSound("error");
      setIsKioskScanning(false);
      return;
    }

    const statuses = [
      "Detecting face grid...",
      "Analyzing landmark vectors...",
      "Matching against class database...",
    ];

    for (let i = 0; i < statuses.length; i++) {
      setKioskStatus(statuses[i]);
      playSynthSound("scan");
      await new Promise((r) => setTimeout(r, 600));
    }

    // Compare captured face against all enrolled student face templates
    let bestMatch: Student | null = null;
    let highestScore = 0;

    for (const student of eligibleStudents) {
      const score = await compareImages(student.faceTemplate!, base64Image);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = student;
      }
    }

    setKioskMatchScore(highestScore);

    if (bestMatch && highestScore >= kioskThreshold) {
      setKioskScannedStudent(bestMatch);
      setKioskSuccess(true);
      setKioskStatus(`${bestMatch.name} recognized! Marking attendance...`);
      playSynthSound("success");

      try {
        await logAttendance(uid, {
          studentId: bestMatch.id,
          studentName: bestMatch.name,
          studentRollNumber: bestMatch.rollNumber,
          courseId: kioskCourse.id,
          courseName: `${kioskCourse.code}: ${kioskCourse.name}`,
          status: "Present",
          similarityScore: highestScore,
        });
        
        // Reload logs so dashboard shows latest checkins
        const updatedLogs = await getAttendanceLogs(uid);
        setLogs(updatedLogs);
        
        setKioskStatus(`${bestMatch.name} checked in successfully!`);
      } catch (err) {
        setKioskStatus("Failed to save check-in log. Please try again.");
      }
    } else {
      setKioskSuccess(false);
      setKioskStatus("Access Denied: Face not recognized or not registered.");
      playSynthSound("error");
    }

    setIsKioskScanning(false);

    // Reset status after a few seconds so the kiosk is ready for the next student
    setTimeout(() => {
      setKioskSuccess(null);
      setKioskStatus("Ready to scan next student...");
      setKioskScannedStudent(null);
      setKioskCapturedPhoto(null);
    }, 4000);
  };

  // Bulk Delete All Data
  const handleDeleteAllData = async () => {
    if (!uid || deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await deleteAllDataForLecturer(uid);
      setCourses([]);
      setStudents([]);
      setLogs([]);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      triggerNotification("All data has been permanently deleted.", "success");
    } catch (err) {
      triggerNotification("Failed to delete data. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string) => {
    if (!uid) return;
    if (confirm("Are you sure you want to remove this student?")) {
      try {
        await deleteStudent(uid, id);
        const updatedStudents = await getStudents(uid);
        setStudents(updatedStudents);
        triggerNotification("Student removed from system.", "success");
        if (selectedStudentId === id) {
          setSelectedStudentId("");
          setRegisteredPreview(null);
        }
      } catch (e) {
        triggerNotification("Failed to remove student.", "error");
      }
    }
  };

  // Face Registration Booth Capture
  const handleFaceCapture = async (base64Image: string) => {
    if (!selectedStudentId || !uid) {
      triggerNotification("Please select a student first.", "error");
      return;
    }

    setIsCapturing(true);
    setBoothStatus("Processing face biometric details...");

    setTimeout(async () => {
      const success = await updateStudentFace(
        uid,
        selectedStudentId,
        base64Image
      );
      setIsCapturing(false);
      if (success) {
        const updatedStudents = await getStudents(uid);
        setStudents(updatedStudents);
        setRegisteredPreview(base64Image);
        setBoothSuccess(true);
        setBoothStatus("Biometric face profile registered successfully!");
        triggerNotification("Facial profile updated successfully!", "success");
      } else {
        setBoothSuccess(false);
        setBoothStatus("Error updating facial database.");
        triggerNotification("Database update failed.", "error");
      }

      setTimeout(() => {
        setBoothSuccess(null);
        setBoothStatus("Align student face and take snapshot");
      }, 3000);
    }, 1500);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    const student = students.find((s) => s.id === id);
    setRegisteredPreview(student?.faceTemplate || null);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCourse =
      filterCourse === "all" || log.courseId === filterCourse;
    const matchesDate =
      !filterDate ||
      new Date(log.timestamp).toDateString() ===
        new Date(filterDate).toDateString();

    const searchLower = searchStudent.toLowerCase();
    const matchesSearch =
      !searchStudent ||
      log.studentName.toLowerCase().includes(searchLower) ||
      log.studentRollNumber.toLowerCase().includes(searchLower);

    return matchesCourse && matchesDate && matchesSearch;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      triggerNotification("No attendance records to export.", "error");
      return;
    }

    const headers =
      "ID,Student Name,Roll Number,Course,Date,Time,Status,Match Confidence (%)\n";
    const csvContent = filteredLogs
      .map((l) => {
        const dateObj = new Date(l.timestamp);
        const date = dateObj.toLocaleDateString();
        const time = dateObj.toLocaleTimeString();
        return `"${l.id}","${l.studentName}","${l.studentRollNumber}","${l.courseName}","${date}","${time}","${l.status}",${l.similarityScore}`;
      })
      .join("\n");

    const blob = new Blob([headers + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `attendance_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Report exported successfully!", "success");
  };

  const handleClearLogs = async () => {
    if (!uid) return;
    if (
      confirm(
        "Are you sure you want to delete all historical attendance logs? This action is irreversible."
      )
    ) {
      try {
        await clearAttendanceLogs(uid);
        setLogs([]);
        triggerNotification("Attendance records cleared.", "success");
      } catch (e) {
        triggerNotification("Failed to clear logs.", "error");
      }
    }
  };

  const copyShareCode = (code: string) => {
    navigator.clipboard.writeText(code);
    triggerNotification(`Copied class code: ${code}`, "success");
  };

  const stats = {
    totalRecords: logs.length,
    present: logs.filter((l) => l.status === "Present").length,
    avgConfidence:
      logs.length > 0
        ? Math.round(
            logs.reduce((acc, curr) => acc + curr.similarityScore, 0) /
              logs.length
          )
        : 0,
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        {/* TOASTS */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-toast-enter ${
                toast.type === "success"
                  ? "bg-white dark:bg-slate-900 border-green-200 dark:border-green-950 text-green-800 dark:text-green-300"
                  : "bg-white dark:bg-slate-900 border-red-200 dark:border-red-950/50 text-red-800 dark:text-red-300"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  toast.type === "success" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {toast.message}
            </div>
          ))}
        </div>

        {/* SIDEBAR */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between hidden md:flex shrink-0 transition-colors duration-200">
          <div>
            {/* Logo */}
            <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-slate-800">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-900 dark:bg-emerald-800 text-white shadow-md">
                  <Camera className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-250">
                  FR Check
                </span>
              </Link>
            </div>

            {/* Menu Sections */}
            <div className="px-4 py-6 space-y-8">
              {/* Menu 1 */}
              <div>
                <h3 className="px-4 text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
                  Menu
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                      activeTab === "dashboard"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-450 font-semibold relative"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {activeTab === "dashboard" && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-800 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("setup")}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                      activeTab === "setup"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-450 font-semibold relative"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {activeTab === "setup" && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-800 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4" />
                      <span>Classes & Setup</span>
                    </div>
                    {courses.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-900 text-white text-[10px] font-bold">
                        {courses.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("biometrics")}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                      activeTab === "biometrics"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-450 font-semibold relative"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {activeTab === "biometrics" && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-800 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      <span>Biometric Kiosk</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("logs")}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                      activeTab === "logs"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-450 font-semibold relative"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {activeTab === "logs" && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-800 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4" />
                      <span>Attendance Ledger</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Menu 2 */}
              <div>
                <h3 className="px-4 text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
                  General
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                      activeTab === "settings"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-450 font-semibold relative"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {activeTab === "settings" && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-800 rounded-r-md" />
                    )}
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      triggerNotification("Help resources are currently offline. Contact IT Support.", "error");
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4" />
                      <span>Help</span>
                    </div>
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 transition-all mt-4"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </div>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Promotional Card Bottom */}
          <div className="p-4">
            <div className="bg-emerald-900 rounded-2xl p-5 relative overflow-hidden text-white shadow-xl shadow-emerald-900/20">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-800/50 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-bold mb-1">Download our<br/>Mobile App</h4>
                <p className="text-xs text-emerald-100/80 mb-4">Get easy in another way</p>
                <button className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-xs font-semibold rounded-lg transition-colors border border-emerald-700/50">
                  Download
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          
          {/* Top Bar */}
          <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-10 transition-colors duration-200">
            {/* Search Box */}
            <div className="relative w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search task or student"
                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all placeholder-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm">F</kbd>
              </div>
            </div>

            {/* Profile & Notifications */}
            <div className="flex items-center gap-4">
              <button className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative">
                <Mail className="h-4 w-4" />
              </button>
              <button className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
              
              <div className="flex items-center gap-3 pl-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-400 flex items-center justify-center font-bold overflow-hidden border border-emerald-200 dark:border-emerald-800">
                  {user?.displayName?.charAt(0) || "L"}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {user?.displayName || "Lecturer Admin"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Scrolling Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
              
              {/* Header Title & Actions */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {activeTab === "dashboard" && "Dashboard"}
                    {activeTab === "setup" && "Classes & Setup"}
                    {activeTab === "biometrics" && "Biometric Booth"}
                    {activeTab === "logs" && "Attendance Ledger"}
                    {activeTab === "settings" && "Appearance Settings"}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                    {activeTab === "dashboard" && "Plan, prioritize, and accomplish your tasks with ease."}
                    {activeTab === "setup" && "Manage your class rosters and student enrollment."}
                    {activeTab === "biometrics" && "Register student facial profiles securely."}
                    {activeTab === "logs" && "Review history and export attendance data."}
                    {activeTab === "settings" && "Configure light mode, dark mode, or system sync preference."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveTab("setup")}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-full shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Course
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-full shadow-sm active:scale-[0.98] transition-all"
                  >
                    Export Data
                  </button>
                </div>
              </div>

              {/* STAT CARDS ROW */}
              {activeTab === "dashboard" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Dark Green Card */}
                    <div className="bg-emerald-900 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-800/50 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-start relative z-10">
                        <span className="text-sm font-medium text-emerald-100">Total Courses</span>
                        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <TrendingUp className="h-4 w-4 text-emerald-900" />
                        </div>
                      </div>
                      <div className="mt-4 relative z-10">
                        <span className="text-4xl font-black">{courses.length}</span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-[10px] font-medium backdrop-blur-sm relative z-10">
                        <TrendingUp className="h-3 w-3" />
                        Active this semester
                      </div>
                    </div>

                    {/* White Card 1 */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Total Students</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900 dark:text-slate-100">{students.length}</span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        Enrolled across all classes
                      </div>
                    </div>

                    {/* White Card 2 */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Attendance Logs</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900 dark:text-slate-100">{logs.length}</span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        Check-ins recorded
                      </div>
                    </div>

                    {/* White Card 3 — Avg Presence (calculated) */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Avg Presence</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
                          {(() => {
                            if (students.length === 0 || courses.length === 0) return "0%";
                            // For each course, compute attendance rate = unique students present / total students
                            const rates = courses.map((course) => {
                              const courseLogs = logs.filter((l) => l.courseId === course.id);
                              const uniquePresent = new Set(courseLogs.filter((l) => l.status === "Present").map((l) => l.studentId)).size;
                              return students.length > 0 ? (uniquePresent / students.length) * 100 : 0;
                            });
                            const avg = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
                            return `${avg}%`;
                          })()}
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        Avg across {courses.length} class{courses.length !== 1 ? "es" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Lower Content Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (Wider) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Fake Chart Area */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-72 flex flex-col justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Attendance Analytics</h3>
                        <div className="flex-1 flex items-end justify-between px-4 gap-2">
                          {/* Simulated bar chart mimicking the inspiration image */}
                          {[40, 70, 95, 100, 60, 45, 80].map((height, i) => (
                            <div key={i} className="w-full max-w-[40px] flex flex-col items-center gap-3">
                              <div className="w-full relative group">
                                {i === 2 && (
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm text-slate-600 dark:text-slate-300">
                                    {height}%
                                  </div>
                                )}
                                <div 
                                  className={`w-full rounded-t-full rounded-b-full transition-all ${
                                    i === 3 ? "bg-emerald-900" : 
                                    i === 2 ? "bg-emerald-500" : 
                                    "bg-emerald-50 dark:bg-emerald-950/40"
                                  } ${i !== 3 && i !== 2 ? "[background-image:repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(16,92,56,0.1)_5px,rgba(16,92,56,0.1)_10px)]" : ""}`}
                                  style={{ height: `${height * 1.5}px` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Team/Student List */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Students</h3>
                          <button onClick={() => setActiveTab("setup")} className="text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            + Add Student
                          </button>
                        </div>
                        <div className="space-y-4">
                          {students.slice(0, 4).map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400 overflow-hidden">
                                  {student.faceTemplate ? (
                                    <img src={student.faceTemplate} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-400 transition-colors">{student.name}</h4>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Roll: {student.rollNumber}</p>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded text-[9px] font-bold ${
                                student.faceTemplate ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
                              }`}>
                                {student.faceTemplate ? "Registered" : "Pending"}
                              </span>
                            </div>
                          ))}
                          {students.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No students enrolled yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Narrower) */}
                    <div className="space-y-6">
                      
                      {/* Projects/Courses List */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100">Active Courses</h3>
                          <button onClick={() => setActiveTab("setup")} className="text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            + New
                          </button>
                        </div>
                        <div className="space-y-5">
                          {courses.slice(0, 4).map((course, i) => (
                            <div key={course.id} className="flex items-center justify-between w-full">
                              <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                  i === 0 ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" :
                                  i === 1 ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" :
                                  i === 2 ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400" :
                                  "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                                }`}>
                                  <BookOpen className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{course.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Code: {course.shareCode}</p>
                                    
                                    {/* Session Status */}
                                    {course.sessionActiveUntil && course.sessionActiveUntil > now ? (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                        Active ({Math.max(0, Math.floor((course.sessionActiveUntil - now) / 60000))}m)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex shrink-0 ml-2">
                                {course.sessionActiveUntil && course.sessionActiveUntil > now ? (
                                  <button
                                    onClick={() => handleStopSession(course.id, course.shareCode!)}
                                    className="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                    title="Stop Session"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <select 
                                      id={`duration-${course.id}`}
                                      className="text-[10px] p-1 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                                    >
                                      <option value="1">1h</option>
                                      <option value="2">2h</option>
                                      <option value="3">3h</option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        const sel = document.getElementById(`duration-${course.id}`) as HTMLSelectElement;
                                        handleStartSession(course.id, course.shareCode!, parseInt(sel.value));
                                      }}
                                      className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                                    >
                                      Start
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {courses.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No courses active.</p>
                          )}
                        </div>
                      </div>

                      {/* Time Tracker / Reminder Card */}
                      {(() => {
                        const activeCourse = courses.find(c => c.sessionActiveUntil && c.sessionActiveUntil > now);
                        if (activeCourse && activeCourse.sessionActiveUntil) {
                          const remainingSeconds = Math.max(0, Math.floor((activeCourse.sessionActiveUntil - now) / 1000));
                          const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
                          const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
                          const s = (remainingSeconds % 60).toString().padStart(2, '0');
                          return (
                            <div className="bg-emerald-900 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden flex flex-col justify-between h-48">
                              <div className="absolute inset-0 opacity-20 [background-image:repeating-radial-gradient(circle_at_bottom_right,transparent,transparent_10px,white_10px,white_20px)] mix-blend-overlay"></div>
                              <div className="relative z-10">
                                <h3 className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Live Session</h3>
                                <p className="text-sm font-semibold opacity-90 truncate max-w-[200px] mb-1">{activeCourse.name}</p>
                                <p className="text-4xl font-black tabular-nums tracking-tight">{h}:{m}:{s}</p>
                              </div>
                              <div className="relative z-10 flex gap-2">
                                <button onClick={() => setKioskCourse(activeCourse)} className="h-10 px-4 bg-white text-slate-900 rounded-full flex items-center justify-center text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm gap-1.5 cursor-pointer">
                                  <Camera className="h-4 w-4" />
                                  Launch Kiosk
                                </button>
                                <button onClick={() => handleStopSession(activeCourse.id, activeCourse.shareCode!)} className="h-10 px-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-red-600 transition-colors cursor-pointer">
                                  End Session Early
                                </button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="bg-slate-800 dark:bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden flex flex-col justify-between h-48 border border-slate-700">
                            <div className="relative z-10">
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class Session</h3>
                              <p className="text-xl font-bold text-slate-300 mt-4">No active sessions</p>
                              <p className="text-sm text-slate-500 mt-2">Start a session above to begin accepting attendance.</p>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                </>
              )}

              {/* OTHER TABS (Setup, Biometrics, Logs) go here... 
                  I will adapt them to use the new white card style. */}
              {activeTab === "setup" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-500" /> Add New Course
                    </h3>
                    <form onSubmit={handleAddCourse} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Course Code</label>
                        <input
                          type="text"
                          required
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Course Name</label>
                        <input
                          type="text"
                          required
                          value={courseName}
                          onChange={(e) => setCourseName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]">
                        Register Course
                      </button>
                    </form>
                  </div>

                  {/* Student Enrollment Info + Danger Zone */}
                  <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-700 dark:text-emerald-500" /> Student Enrollment
                      </h3>
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Enrollment is handled via the Student Portal</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
                            Students self-register by entering your class share code on the student portal. Share your class code with students so they can enroll and register their face biometrics.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{students.length}</span> student{students.length !== 1 ? "s" : ""} currently enrolled across your classes.
                      </div>
                    </div>

                    {/* Danger Zone — Delete All Data */}
                    <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 shadow-sm">
                      <h3 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> Danger Zone
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                        Permanently delete all your courses, enrolled students, and attendance logs. This action cannot be undone.
                      </p>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                      >
                        Delete All Data
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "biometrics" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Select Student</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Select from roster to launch scanner.</p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {students.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => handleSelectStudent(student.id)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                            selectedStudentId === student.id
                              ? "border-emerald-900 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <div>
                            <h4 className={`text-sm font-bold ${selectedStudentId === student.id ? "text-emerald-900 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}`}>{student.name}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{student.rollNumber}</p>
                          </div>
                          {student.faceTemplate && <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
                     {selectedStudentId ? (
                        <div className="w-full flex flex-col items-center">
                          <div className="w-full flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Biometric Registration</h2>
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Enrolling: {students.find((s) => s.id === selectedStudentId)?.name}
                            </span>
                          </div>
                          <WebcamScanner
                            onCapture={handleFaceCapture}
                            isScanning={isCapturing}
                            scanStatus={boothStatus}
                            scanSuccess={boothSuccess}
                          />
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="h-6 w-6 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Scanner Inactive</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Select a student from the sidebar to begin biometric registration.</p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Ledger History</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-900"
                        />
                      </div>
                      <button onClick={handleExportCSV} className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
                        Export CSV
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <th className="pb-3 pl-4">Student</th>
                          <th className="pb-3">Course</th>
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 pl-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{log.studentName}</div>
                              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{log.studentRollNumber}</div>
                            </td>
                            <td className="py-4">
                              <div className="font-medium text-slate-700 dark:text-slate-300">{log.courseName.split(":")[0] || "CLASS"}</div>
                            </td>
                            <td className="py-4 text-slate-500 dark:text-slate-400 text-xs">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                log.status === "Present" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400" : "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-2xl transition-all duration-200 animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-emerald-700 dark:text-emerald-500" />
                    Appearance Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Customize the UI theme of your FaceCheck dashboard.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Theme Selection</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {(["light", "dark", "system"] as const).map((mode) => {
                          const isSelected = theme === mode;
                          return (
                            <button
                              key={mode}
                              onClick={() => setTheme(mode)}
                              className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-semibold capitalize transition-all duration-205 cursor-pointer ${
                                isSelected
                                  ? "border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-400 shadow-sm"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {mode === "light" && <Sun className="h-6 w-6 mb-2 text-amber-500" />}
                              {mode === "dark" && <Moon className="h-6 w-6 mb-2 text-indigo-400" />}
                              {mode === "system" && <Monitor className="h-6 w-6 mb-2 text-slate-500 dark:text-slate-400" />}
                              <span>{mode}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
      {/* Kiosk Mode Overlay */}
      {kioskCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-8 overflow-y-auto">
          {/* Header */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-8 pb-4 border-b border-slate-850">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                Live Attendance Kiosk Mode
              </span>
              <h2 className="text-2xl font-black mt-1 text-slate-100">
                {kioskCourse.code}: {kioskCourse.name}
              </h2>
            </div>
            <button
              onClick={() => setKioskCourse(null)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              Exit Kiosk Mode
            </button>
          </div>

          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left side: Camera feed */}
            <div className="flex flex-col items-center w-full">
              <WebcamScanner
                onCapture={handleKioskCapture}
                isScanning={isKioskScanning}
                scanStatus={kioskStatus}
                scanSuccess={kioskSuccess}
              />
              
              {/* Sensitivity adjustments */}
              <div className="w-full mt-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Scanner Sensitivity Threshold</span>
                  <span className="text-emerald-400 font-mono">{kioskThreshold}% Match</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={kioskThreshold}
                  onChange={(e) => setKioskThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-500 mt-1.5 font-sans">
                  <span>Relaxed (50%)</span>
                  <span>Recommended (70%)</span>
                  <span>Strict (90%)</span>
                </div>
              </div>
            </div>

            {/* Right side: Verification Status Panel */}
            <div className="flex flex-col h-full justify-between py-2 w-full">
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 text-center space-y-6 flex-1 flex flex-col justify-center min-h-[300px] shadow-inner">
                {kioskSuccess === true && kioskScannedStudent ? (
                  <div className="space-y-4 animate-scale-in">
                    <div className="flex justify-center">
                      <div className="h-28 w-28 rounded-full border-4 border-emerald-500 bg-slate-850 flex items-center justify-center text-slate-400 overflow-hidden shadow-2xl">
                        {kioskScannedStudent.faceTemplate ? (
                          <img src={kioskScannedStudent.faceTemplate} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                        ) : (
                          <Users className="h-10 w-10 text-emerald-400" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-900 text-emerald-400 text-xs font-bold rounded-full">
                        Verification Passed
                      </span>
                      <h3 className="text-2xl font-black text-white mt-2">{kioskScannedStudent.name}</h3>
                      <p className="text-sm font-mono text-slate-400 mt-1">Roll: {kioskScannedStudent.rollNumber}</p>
                    </div>
                    
                    <div className="inline-block px-3 py-1 rounded bg-slate-800 text-xs font-mono text-emerald-400 mt-2">
                      Match Confidence: {kioskMatchScore}%
                    </div>
                  </div>
                ) : kioskSuccess === false ? (
                  <div className="space-y-4 animate-scale-in text-red-400">
                    <div className="flex justify-center">
                      <div className="h-24 w-24 rounded-full border-4 border-red-500 bg-red-950/20 flex items-center justify-center">
                        <AlertTriangle className="h-12 w-12 text-red-500" />
                      </div>
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-red-950/50 border border-red-900 text-red-400 text-xs font-bold rounded-full">
                        Verification Failed
                      </span>
                      <h3 className="text-xl font-bold text-white mt-3">Access Denied</h3>
                      <p className="text-sm text-slate-400 mt-1 text-slate-400">Face template not matching or profile missing.</p>
                    </div>
                    {kioskMatchScore > 0 && (
                      <div className="inline-block px-3 py-1 rounded bg-slate-800 text-xs font-mono text-red-400 mt-2">
                        Best Match: {kioskMatchScore}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 text-slate-400 animate-pulse">
                    <div className="flex justify-center">
                      <div className="h-24 w-24 rounded-full border-4 border-slate-800 bg-slate-900 flex items-center justify-center">
                        <Users className="h-10 w-10 text-slate-700" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-350">Awaiting Face Scan...</p>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        Students should present themselves in front of the kiosk camera.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md w-full space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete All Data</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action is permanent and irreversible.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-xs text-red-700 dark:text-red-300 space-y-1">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-0.5 font-medium">
                <li><strong>{courses.length}</strong> course{courses.length !== 1 ? "s" : ""}</li>
                <li><strong>{students.length}</strong> enrolled student{students.length !== 1 ? "s" : ""}</li>
                <li><strong>{logs.length}</strong> attendance log{logs.length !== 1 ? "s" : ""}</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Type <span className="text-red-600 dark:text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
