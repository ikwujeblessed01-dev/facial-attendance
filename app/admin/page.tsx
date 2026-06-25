"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import WebcamScanner from "../components/WebcamScanner";
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
  Check,
  RefreshCw,
  FolderOpen
} from "lucide-react";

export default function AdminDashboard() {
  // DB States
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"setup" | "biometrics" | "logs">("setup");

  // Form States
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");

  // Biometrics States
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [registeredPreview, setRegisteredPreview] = useState<string | null>(null);
  const [boothStatus, setBoothStatus] = useState("Align student face and take snapshot");
  const [isCapturing, setIsCapturing] = useState(false);
  const [boothSuccess, setBoothSuccess] = useState<boolean | null>(null);

  // Filters State
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // Notification banners
  const [notify, setNotify] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  // Load database tables
  useEffect(() => {
    setCourses(getCourses());
    setStudents(getStudents());
    setLogs(getAttendanceLogs());
  }, []);

  const triggerNotification = (message: string, type: "success" | "error") => {
    setNotify({ message, type });
    setTimeout(() => {
      setNotify({ message: "", type: null });
    }, 4500);
  };

  // Add Course
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim()) return;
    try {
      addCourse({ name: courseName.trim(), code: courseCode.trim().toUpperCase() });
      setCourses(getCourses());
      setCourseName("");
      setCourseCode("");
      triggerNotification("Course added successfully!", "success");
    } catch (err) {
      triggerNotification("Failed to add course.", "error");
    }
  };

  // Add Student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim()) return;
    
    // Check if roll number already exists
    if (students.some(s => s.rollNumber.toLowerCase() === studentRoll.trim().toLowerCase())) {
      triggerNotification("A student with this Roll Number already exists.", "error");
      return;
    }

    try {
      addStudent({ name: studentName.trim(), rollNumber: studentRoll.trim().toUpperCase() });
      setStudents(getStudents());
      setStudentName("");
      setStudentRoll("");
      triggerNotification("Student enrolled successfully!", "success");
    } catch (err) {
      triggerNotification("Failed to enroll student.", "error");
    }
  };

  // Delete Student
  const handleDeleteStudent = (id: string) => {
    if (confirm("Are you sure you want to remove this student?")) {
      deleteStudent(id);
      setStudents(getStudents());
      triggerNotification("Student removed from system.", "success");
      if (selectedStudentId === id) {
        setSelectedStudentId("");
        setRegisteredPreview(null);
      }
    }
  };

  // Face Registration Booth Capture
  const handleFaceCapture = (base64Image: string) => {
    if (!selectedStudentId) {
      triggerNotification("Please select a student first.", "error");
      return;
    }
    
    setIsCapturing(true);
    setBoothStatus("Processing face biometric details...");
    
    setTimeout(() => {
      const success = updateStudentFace(selectedStudentId, base64Image);
      setIsCapturing(false);
      if (success) {
        setStudents(getStudents());
        setRegisteredPreview(base64Image);
        setBoothSuccess(true);
        setBoothStatus("Biometric face profile registered successfully!");
        triggerNotification("Facial profile updated successfully!", "success");
      } else {
        setBoothSuccess(false);
        setBoothStatus("Error updating facial database.");
        triggerNotification("Database update failed.", "error");
      }
      
      // Reset scanner status alert after some time
      setTimeout(() => {
        setBoothSuccess(null);
        setBoothStatus("Align student face and take snapshot");
      }, 3000);
    }, 1500);
  };

  // Handle student select for enrollment
  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    const student = students.find(s => s.id === id);
    setRegisteredPreview(student?.faceTemplate || null);
  };

  // Filter Attendance Logs
  const filteredLogs = logs.filter(log => {
    const matchesCourse = filterCourse === "all" || log.courseId === filterCourse;
    const matchesDate = !filterDate || new Date(log.timestamp).toDateString() === new Date(filterDate).toDateString();
    
    const searchLower = searchStudent.toLowerCase();
    const matchesSearch = !searchStudent || 
      log.studentName.toLowerCase().includes(searchLower) || 
      log.studentRollNumber.toLowerCase().includes(searchLower);

    return matchesCourse && matchesDate && matchesSearch;
  });

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      triggerNotification("No attendance records to export.", "error");
      return;
    }
    
    const headers = "ID,Student Name,Roll Number,Course,Date,Time,Status,Match Confidence (%)\n";
    const csvContent = filteredLogs.map(l => {
      const dateObj = new Date(l.timestamp);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString();
      return `"${l.id}","${l.studentName}","${l.studentRollNumber}","${l.courseName}","${date}","${time}","${l.status}",${l.similarityScore}`;
    }).join("\n");

    const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Report exported successfully!", "success");
  };

  // Clear Attendance logs
  const handleClearLogs = () => {
    if (confirm("Are you sure you want to delete all historical attendance logs? This action is irreversible.")) {
      clearAttendanceLogs();
      setLogs([]);
      triggerNotification("Attendance records cleared.", "success");
    }
  };

  // Statistics calculation for filtered view
  const stats = {
    totalRecords: filteredLogs.length,
    present: filteredLogs.filter(l => l.status === "Present").length,
    absent: filteredLogs.filter(l => l.status === "Absent").length,
    avgConfidence: filteredLogs.length > 0 
      ? Math.round(filteredLogs.reduce((acc, curr) => acc + curr.similarityScore, 0) / filteredLogs.length)
      : 0
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-20">
        
        {/* Banner Notification */}
        {notify.message && (
          <div className="fixed top-20 right-4 z-50 animate-bounce">
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-semibold ${
              notify.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-400" 
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${notify.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}></span>
              <span>{notify.message}</span>
            </div>
          </div>
        )}

        {/* Dashboard Title banner */}
        <div className="relative border-b border-zinc-200/50 bg-white py-8 dark:border-zinc-800/50 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Lecturer Control Panel</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                  Configure student databases, register biometrics, and audit attendance metrics.
                </p>
              </div>

              {/* Tab Selector Links */}
              <div className="flex overflow-x-auto whitespace-nowrap space-x-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl max-w-full md:max-w-md border border-zinc-200/50 dark:border-zinc-800/50">
                <button
                  onClick={() => setActiveTab("setup")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "setup"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Academic Setup
                </button>
                <button
                  onClick={() => setActiveTab("biometrics")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "biometrics"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Biometric Booth
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "logs"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Attendance ledger
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* TAB 1: ACADEMIC SETUP */}
          {activeTab === "setup" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Course Setup Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <h2 className="text-xl font-bold">Add New Course</h2>
                  </div>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Course Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CS-101"
                        required
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Course Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Introduction to Programming"
                        required
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-500/10 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Register Course
                    </button>
                  </form>

                  {/* Course list */}
                  <div className="mt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-3.5">
                      Current Courses ({courses.length})
                    </h3>
                    {courses.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No courses added yet.</p>
                    ) : (
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/55 dark:bg-zinc-950/40 dark:border-zinc-800/40"
                          >
                            <div>
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {course.code}
                              </p>
                              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                {course.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Enrollment Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-xl font-bold">Enroll Student</h2>
                  </div>
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Roll Number / ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2026-CS-042"
                        required
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Liam Martinez"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-500/10 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Roster
                    </button>
                  </form>

                  {/* Student list */}
                  <div className="mt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-3.5">
                      Enrolled Students ({students.length})
                    </h3>
                    {students.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No students added yet.</p>
                    ) : (
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/55 dark:bg-zinc-950/40 dark:border-zinc-800/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 transition-all"
                          >
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                {student.name}
                              </p>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                ROLL: {student.rollNumber}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                                student.faceTemplate
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400"
                                  : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400 animate-pulse"
                              }`}>
                                {student.faceTemplate ? "Face Registered" : "No Face Data"}
                              </span>
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90 transition-all"
                                title="Remove Student"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BIOMETRIC REGISTRATION BOOTH */}
          {activeTab === "biometrics" && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Select student to register */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <h2 className="text-xl font-bold">Select Student</h2>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-4">
                      Select a student from the roster below to launch the capture scanner booth.
                    </p>

                    <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                      {students.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">No students available. Create one in setup tab.</p>
                      ) : (
                        students.map((student) => {
                          const isSelected = selectedStudentId === student.id;
                          return (
                            <button
                              key={student.id}
                              onClick={() => handleSelectStudent(student.id)}
                              className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                                isSelected
                                  ? "bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-950 shadow-sm"
                                  : "bg-zinc-50/50 border-zinc-200/60 dark:bg-zinc-950/20 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40"
                              }`}
                            >
                              <div>
                                <h4 className={`text-xs font-bold ${isSelected ? "text-indigo-800 dark:text-indigo-300" : "text-zinc-800 dark:text-zinc-200"}`}>
                                  {student.name}
                                </h4>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                                  ROLL: {student.rollNumber}
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold border ${
                                student.faceTemplate
                                  ? "bg-emerald-50/60 border-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-amber-50/60 border-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}>
                                {student.faceTemplate ? "Registered" : "Pending"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Registered preview image */}
                  {selectedStudentId && (
                    <div className="mt-6 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-4 flex flex-col items-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
                        Current Biometric Scan
                      </h4>
                      {registeredPreview ? (
                        <div className="relative h-28 w-36 rounded-xl border border-zinc-200 shadow-inner overflow-hidden dark:border-zinc-800">
                          <img
                            src={registeredPreview}
                            alt="Registered Face"
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-2 border-emerald-500/40 rounded-xl"></div>
                          <span className="absolute bottom-1 right-1 rounded bg-zinc-900/80 px-1 py-0.5 text-[8px] font-semibold text-white border border-zinc-800">
                            Registered
                          </span>
                        </div>
                      ) : (
                        <div className="h-28 w-36 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center p-3 text-zinc-400">
                          <Camera className="h-5 w-5 mb-1.5 animate-pulse text-zinc-300" />
                          <span className="text-[10px] leading-tight font-medium">No biometric print captured yet</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* The camera capture booth */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-blue-500" />
                      <h2 className="text-xl font-bold">Biometric Scanning Booth</h2>
                    </div>
                    {selectedStudentId && (
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                        Enrollment Active: {students.find(s => s.id === selectedStudentId)?.name}
                      </span>
                    )}
                  </div>

                  {selectedStudentId ? (
                    <div className="w-full flex flex-col items-center">
                      <WebcamScanner
                        onCapture={handleFaceCapture}
                        isScanning={isCapturing}
                        scanStatus={boothStatus}
                        scanSuccess={boothSuccess}
                      />
                      <div className="mt-4 flex items-start gap-2 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl max-w-md">
                        <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                          <strong className="text-zinc-700 dark:text-zinc-200">How to capture:</strong> Click the camera button below the preview screen. Ensure the student is well-lit and looking directly at the camera.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center p-16 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 aspect-[4/3]">
                      <Users className="h-12 w-12 text-zinc-400 mb-3 animate-bounce" />
                      <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Enrollment Booth Inactive</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
                        Please select a student from the sidebar roster on the left to initiate the webcam facial encoder.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE LEDGER */}
          {activeTab === "logs" && (
            <div className="space-y-6 animate-fade-in">
              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Filtered Records</span>
                    <FolderOpen className="h-4 w-4 text-zinc-400" />
                  </div>
                  <p className="text-2xl font-black mt-2">{stats.totalRecords}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present Count</span>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{stats.present}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Absent Count</span>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-black mt-2 text-red-600 dark:text-red-400">{stats.absent}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Avg Confidence</span>
                    <Award className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-black mt-2 text-blue-600 dark:text-blue-400">{stats.avgConfidence}%</p>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-base font-bold flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-zinc-400" />
                    Query ledger
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                    <button
                      onClick={handleClearLogs}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-50 text-red-700 dark:border-red-950 dark:hover:bg-red-950/40 dark:text-red-400 active:scale-95 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Logs
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  {/* Course selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Filter Course
                    </label>
                    <select
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Courses</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Filter Date
                    </label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Student Search */}
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
                      Search Name / Roll Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm overflow-hidden shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        <th className="p-4">Student Details</th>
                        <th className="p-4">Course Details</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Match Match Rate</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-400 italic">
                            No attendance records matched this query.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const dateObj = new Date(log.timestamp);
                          const formattedDate = dateObj.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                          const formattedTime = dateObj.toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                            >
                              <td className="p-4">
                                <div className="font-bold text-zinc-900 dark:text-white">
                                  {log.studentName}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  {log.studentRollNumber}
                                </div>
                              </td>
                              <td className="p-4 font-medium">
                                <span className="inline-flex rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 font-bold tracking-tight">
                                  {log.courseName.split(':')[0] || "CLASS"}
                                </span>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs mt-0.5">
                                  {log.courseName}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                  <span>{formattedDate} at {formattedTime}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        log.status === "Present" ? "bg-emerald-500" : "bg-red-500"
                                      }`}
                                      style={{ width: `${log.similarityScore}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-mono font-semibold">{log.similarityScore}%</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                                  log.status === "Present"
                                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    log.status === "Present" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                  }`}></span>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
