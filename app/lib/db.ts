"use client";

export interface Course {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  faceTemplate?: string; // base64 representation of registered face photo
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  courseId: string;
  courseName: string;
  timestamp: string; // ISO format
  status: 'Present' | 'Absent';
  similarityScore: number;
}

const DB_KEYS = {
  COURSES: 'facial_attendance_courses',
  STUDENTS: 'facial_attendance_students',
  LOGS: 'facial_attendance_logs',
};

const SEED_COURSES: Course[] = [
  { id: 'c1', name: 'Introduction to Computer Science', code: 'CS-101' },
  { id: 'c2', name: 'Data Structures & Algorithms', code: 'CS-202' },
  { id: 'c3', name: 'Artificial Intelligence & Machine Learning', code: 'CS-303' },
];

const SEED_STUDENTS: Student[] = [
  { id: 's1', name: 'Alex Rivera', rollNumber: '2026-CS-001' },
  { id: 's2', name: 'Sarah Jenkins', rollNumber: '2026-CS-002' },
  { id: 's3', name: 'Michael Chang', rollNumber: '2026-CS-003' },
  { id: 's4', name: 'Emily Rodriguez', rollNumber: '2026-CS-004' },
];

// Helper to check environment
const isClient = () => typeof window !== 'undefined';

export function initializeDB(): void {
  if (!isClient()) return;

  if (!localStorage.getItem(DB_KEYS.COURSES)) {
    localStorage.setItem(DB_KEYS.COURSES, JSON.stringify(SEED_COURSES));
  }

  if (!localStorage.getItem(DB_KEYS.STUDENTS)) {
    localStorage.setItem(DB_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
  }

  if (!localStorage.getItem(DB_KEYS.LOGS)) {
    // Generate some mock history logs for the last few days
    const mockLogs: AttendanceLog[] = [];
    const now = new Date();
    
    // Day -2
    mockLogs.push({
      id: 'l1',
      studentId: 's1',
      studentName: 'Alex Rivera',
      studentRollNumber: '2026-CS-001',
      courseId: 'c1',
      courseName: 'Introduction to Computer Science',
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: 'Present',
      similarityScore: 94.2,
    });
    mockLogs.push({
      id: 'l2',
      studentId: 's2',
      studentName: 'Sarah Jenkins',
      studentRollNumber: '2026-CS-002',
      courseId: 'c1',
      courseName: 'Introduction to Computer Science',
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 3.8 * 60 * 60 * 1000).toISOString(),
      status: 'Present',
      similarityScore: 89.7,
    });

    // Day -1
    mockLogs.push({
      id: 'l3',
      studentId: 's1',
      studentName: 'Alex Rivera',
      studentRollNumber: '2026-CS-001',
      courseId: 'c2',
      courseName: 'Data Structures & Algorithms',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: 'Present',
      similarityScore: 92.5,
    });
    mockLogs.push({
      id: 'l4',
      studentId: 's3',
      studentName: 'Michael Chang',
      studentRollNumber: '2026-CS-003',
      courseId: 'c2',
      courseName: 'Data Structures & Algorithms',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 1.9 * 60 * 60 * 1000).toISOString(),
      status: 'Present',
      similarityScore: 91.1,
    });
    
    localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(mockLogs));
  }
}

// Course operations
export function getCourses(): Course[] {
  if (!isClient()) return [];
  initializeDB();
  const data = localStorage.getItem(DB_KEYS.COURSES);
  return data ? JSON.parse(data) : [];
}

export function addCourse(course: Omit<Course, 'id'>): Course {
  if (!isClient()) throw new Error('Client-side operation only');
  const courses = getCourses();
  const newCourse = { ...course, id: 'c_' + Math.random().toString(36).substr(2, 9) };
  courses.push(newCourse);
  localStorage.setItem(DB_KEYS.COURSES, JSON.stringify(courses));
  return newCourse;
}

// Student operations
export function getStudents(): Student[] {
  if (!isClient()) return [];
  initializeDB();
  const data = localStorage.getItem(DB_KEYS.STUDENTS);
  return data ? JSON.parse(data) : [];
}

export function addStudent(student: Omit<Student, 'id' | 'faceTemplate'>): Student {
  if (!isClient()) throw new Error('Client-side operation only');
  const students = getStudents();
  const newStudent = { ...student, id: 's_' + Math.random().toString(36).substr(2, 9) };
  students.push(newStudent);
  localStorage.setItem(DB_KEYS.STUDENTS, JSON.stringify(students));
  return newStudent;
}

export function updateStudentFace(studentId: string, faceTemplate: string): boolean {
  if (!isClient()) return false;
  const students = getStudents();
  const index = students.findIndex(s => s.id === studentId);
  if (index !== -1) {
    students[index].faceTemplate = faceTemplate;
    localStorage.setItem(DB_KEYS.STUDENTS, JSON.stringify(students));
    return true;
  }
  return false;
}

export function deleteStudent(studentId: string): boolean {
  if (!isClient()) return false;
  let students = getStudents();
  students = students.filter(s => s.id !== studentId);
  localStorage.setItem(DB_KEYS.STUDENTS, JSON.stringify(students));
  return true;
}

// Attendance Log operations
export function getAttendanceLogs(): AttendanceLog[] {
  if (!isClient()) return [];
  initializeDB();
  const data = localStorage.getItem(DB_KEYS.LOGS);
  return data ? JSON.parse(data) : [];
}

export function logAttendance(log: Omit<AttendanceLog, 'id' | 'timestamp'>): AttendanceLog {
  if (!isClient()) throw new Error('Client-side operation only');
  const logs = getAttendanceLogs();
  const newLog: AttendanceLog = {
    ...log,
    id: 'l_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog); // Prepend to show latest first
  localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
}

export function clearAttendanceLogs(): void {
  if (!isClient()) return;
  localStorage.setItem(DB_KEYS.LOGS, JSON.stringify([]));
}
