"use client";

import { useEffect, useState, useCallback } from "react";
import WebcamScanner from "../components/WebcamScanner";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../lib/auth-context";
import {
  getCourses,
  addCourse,
  getStudents,
  addStudent,
  deleteStudent,
  updateStudentFace,
  getAttendanceLogs,
  clearAttendanceLogs,
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
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const uid = user?.uid;

  // DB States
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "setup" | "biometrics" | "logs"
  >("dashboard");

  // Form States
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");

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

  // Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim() || !uid) return;

    if (
      students.some(
        (s) => s.rollNumber.toLowerCase() === studentRoll.trim().toLowerCase()
      )
    ) {
      triggerNotification(
        "A student with this Roll Number already exists.",
        "error"
      );
      return;
    }

    try {
      await addStudent(uid, {
        name: studentName.trim(),
        rollNumber: studentRoll.trim().toUpperCase(),
      });
      const updatedStudents = await getStudents(uid);
      setStudents(updatedStudents);
      setStudentName("");
      setStudentRoll("");
      triggerNotification("Student enrolled successfully!", "success");
    } catch (err) {
      triggerNotification("Failed to enroll student.", "error");
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
                  ? "bg-white border-green-200 text-green-800"
                  : "bg-white border-red-200 text-red-800"
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
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex shrink-0">
          <div>
            {/* Logo */}
            <div className="h-20 flex items-center px-8 border-b border-slate-100">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-md">
                  <Camera className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-800">
                  FR
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
                        ? "bg-emerald-50/50 text-emerald-900 font-semibold relative"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                        ? "bg-emerald-50/50 text-emerald-900 font-semibold relative"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                        ? "bg-emerald-50/50 text-emerald-900 font-semibold relative"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                        ? "bg-emerald-50/50 text-emerald-900 font-semibold relative"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                  <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4" />
                      <span>Help</span>
                    </div>
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700 transition-all mt-4"
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
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top Bar */}
          <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
            {/* Search Box */}
            <div className="relative w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search task or student"
                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-900/20 focus:border-emerald-900 transition-all placeholder-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-sm">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-sm">F</kbd>
              </div>
            </div>

            {/* Profile & Notifications */}
            <div className="flex items-center gap-4">
              <button className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative">
                <Mail className="h-4 w-4" />
              </button>
              <button className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 mx-2"></div>
              
              <div className="flex items-center gap-3 pl-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 font-bold overflow-hidden border border-emerald-200">
                  {user?.displayName?.charAt(0) || "L"}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-bold text-slate-800 leading-tight">
                    {user?.displayName || "Lecturer Admin"}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
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
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {activeTab === "dashboard" && "Dashboard"}
                    {activeTab === "setup" && "Classes & Setup"}
                    {activeTab === "biometrics" && "Biometric Booth"}
                    {activeTab === "logs" && "Attendance Ledger"}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1.5">
                    {activeTab === "dashboard" && "Plan, prioritize, and accomplish your tasks with ease."}
                    {activeTab === "setup" && "Manage your class rosters and student enrollment."}
                    {activeTab === "biometrics" && "Register student facial profiles securely."}
                    {activeTab === "logs" && "Review history and export attendance data."}
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
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">Total Students</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900">{students.length}</span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        <TrendingUp className="h-3 w-3" />
                        Enrolled across all classes
                      </div>
                    </div>

                    {/* White Card 2 */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">Attendance Logs</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900">{logs.length}</span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        <TrendingUp className="h-3 w-3" />
                        Check-ins recorded
                      </div>
                    </div>

                    {/* White Card 3 */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md group hover:-translate-y-1 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-slate-800">Avg Presence</span>
                        <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                          <TrendingUp className="h-4 w-4 text-slate-600" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900">
                          {logs.length > 0 ? Math.round((stats.present / logs.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="mt-4 text-[10px] font-medium text-slate-400 pt-1">
                        Overall student presence
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Lower Content Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (Wider) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Fake Chart Area */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-72 flex flex-col justify-between">
                        <h3 className="font-bold text-slate-800 mb-6">Attendance Analytics</h3>
                        <div className="flex-1 flex items-end justify-between px-4 gap-2">
                          {/* Simulated bar chart mimicking the inspiration image */}
                          {[40, 70, 95, 100, 60, 45, 80].map((height, i) => (
                            <div key={i} className="w-full max-w-[40px] flex flex-col items-center gap-3">
                              <div className="w-full relative group">
                                {i === 2 && (
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm text-slate-600">
                                    {height}%
                                  </div>
                                )}
                                <div 
                                  className={`w-full rounded-t-full rounded-b-full transition-all ${
                                    i === 3 ? "bg-emerald-900" : 
                                    i === 2 ? "bg-emerald-500" : 
                                    "bg-emerald-50"
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
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-slate-800">Recent Students</h3>
                          <button onClick={() => setActiveTab("setup")} className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                            + Add Student
                          </button>
                        </div>
                        <div className="space-y-4">
                          {students.slice(0, 4).map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 overflow-hidden">
                                  {student.faceTemplate ? (
                                    <img src={student.faceTemplate} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                                  ) : (
                                    <Users className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">{student.name}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Roll: {student.rollNumber}</p>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded text-[9px] font-bold ${
                                student.faceTemplate ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
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
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-slate-800">Active Courses</h3>
                          <button onClick={() => setActiveTab("setup")} className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                            + New
                          </button>
                        </div>
                        <div className="space-y-5">
                          {courses.slice(0, 4).map((course, i) => (
                            <div key={course.id} className="flex items-start gap-4">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                i === 0 ? "bg-blue-100 text-blue-600" :
                                i === 1 ? "bg-emerald-100 text-emerald-600" :
                                i === 2 ? "bg-purple-100 text-purple-600" :
                                "bg-orange-100 text-orange-600"
                              }`}>
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{course.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">Code: {course.shareCode}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {courses.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No courses active.</p>
                          )}
                        </div>
                      </div>

                      {/* Time Tracker / Reminder Card */}
                      <div className="bg-emerald-900 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden flex flex-col justify-between h-48">
                        {/* Wavy background simulation */}
                        <div className="absolute inset-0 opacity-20 [background-image:repeating-radial-gradient(circle_at_bottom_right,transparent,transparent_10px,white_10px,white_20px)] mix-blend-overlay"></div>
                        <div className="relative z-10">
                          <h3 className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Class Session</h3>
                          <p className="text-4xl font-black tabular-nums tracking-tight">01:24:08</p>
                        </div>
                        <div className="relative z-10 flex gap-2">
                          <button className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-emerald-900 hover:scale-105 transition-transform">
                            <span className="h-3 w-1 bg-emerald-900 rounded-full mx-0.5"></span>
                            <span className="h-3 w-1 bg-emerald-900 rounded-full mx-0.5"></span>
                          </button>
                          <button className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform">
                            <span className="h-3 w-3 bg-white rounded-[2px]"></span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}

              {/* OTHER TABS (Setup, Biometrics, Logs) go here... 
                  I will adapt them to use the new white card style. */}
              {activeTab === "setup" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-700" /> Add New Course
                    </h3>
                    <form onSubmit={handleAddCourse} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Code</label>
                        <input
                          type="text"
                          required
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Course Name</label>
                        <input
                          type="text"
                          required
                          value={courseName}
                          onChange={(e) => setCourseName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]">
                        Register Course
                      </button>
                    </form>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-700" /> Enroll Student
                    </h3>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Roll Number / ID</label>
                        <input
                          type="text"
                          required
                          value={studentRoll}
                          onChange={(e) => setStudentRoll(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-900 focus:ring-1 focus:ring-emerald-900 transition-all"
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]">
                        Add to Roster
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "biometrics" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-2">Select Student</h3>
                    <p className="text-xs text-slate-500 mb-6">Select from roster to launch scanner.</p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {students.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => handleSelectStudent(student.id)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                            selectedStudentId === student.id
                              ? "border-emerald-900 bg-emerald-50 shadow-sm"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div>
                            <h4 className={`text-sm font-bold ${selectedStudentId === student.id ? "text-emerald-900" : "text-slate-800"}`}>{student.name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.rollNumber}</p>
                          </div>
                          {student.faceTemplate && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
                     {selectedStudentId ? (
                        <div className="w-full flex flex-col items-center">
                          <div className="w-full flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Biometric Registration</h2>
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
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
                          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="h-6 w-6 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Scanner Inactive</h3>
                          <p className="text-sm text-slate-500 max-w-sm mx-auto">Select a student from the sidebar to begin biometric registration.</p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800">Ledger History</h3>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-emerald-900"
                        />
                      </div>
                      <button onClick={handleExportCSV} className="text-xs font-semibold bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50 shadow-sm transition-colors">
                        Export CSV
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="pb-3 pl-4">Student</th>
                          <th className="pb-3">Course</th>
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-4">
                              <div className="font-bold text-slate-800">{log.studentName}</div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{log.studentRollNumber}</div>
                            </td>
                            <td className="py-4">
                              <div className="font-medium text-slate-700">{log.courseName.split(":")[0] || "CLASS"}</div>
                            </td>
                            <td className="py-4 text-slate-500 text-xs">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                log.status === "Present" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
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

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
