"use client";

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  code: string;
  shareCode?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  faceTemplate?: string; // base64 of registered face
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  courseId: string;
  courseName: string;
  timestamp: string; // ISO string
  status: "Present" | "Absent";
  similarityScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function userRef(uid: string) {
  return doc(db, "users", uid);
}

function coursesCol(uid: string) {
  return collection(db, "users", uid, "courses");
}

function studentsCol(uid: string) {
  return collection(db, "users", uid, "students");
}

function logsCol(uid: string) {
  return collection(db, "users", uid, "logs");
}

// ─── Course Operations ──────────────────────────────────────────────

export async function getCourses(uid: string): Promise<Course[]> {
  const snap = await getDocs(coursesCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function addCourse(
  uid: string,
  course: Omit<Course, "id">
): Promise<Course> {
  // Generate a short share code (6 chars)
  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const docRef = await addDoc(coursesCol(uid), {
    ...course,
    shareCode,
  });

  // Also register in the global shared_classes collection
  await setDoc(doc(db, "shared_classes", shareCode), {
    lecturerUid: uid,
    courseId: docRef.id,
    courseName: course.name,
    courseCode: course.code,
  });

  return { id: docRef.id, ...course, shareCode };
}

// ─── Student Operations ─────────────────────────────────────────────

export async function getStudents(uid: string): Promise<Student[]> {
  const snap = await getDocs(studentsCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}

export async function addStudent(
  uid: string,
  student: Omit<Student, "id" | "faceTemplate">
): Promise<Student> {
  const docRef = await addDoc(studentsCol(uid), student);
  return { id: docRef.id, ...student };
}

export async function updateStudentFace(
  uid: string,
  studentId: string,
  faceTemplate: string
): Promise<boolean> {
  try {
    await updateDoc(doc(db, "users", uid, "students", studentId), {
      faceTemplate,
    });
    return true;
  } catch (err) {
    console.error("Failed to update face template:", err);
    return false;
  }
}

export async function deleteStudent(
  uid: string,
  studentId: string
): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "students", studentId));
    return true;
  } catch (err) {
    console.error("Failed to delete student:", err);
    return false;
  }
}

// ─── Attendance Log Operations ──────────────────────────────────────

export async function getAttendanceLogs(
  uid: string
): Promise<AttendanceLog[]> {
  const snap = await getDocs(logsCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceLog));
}

export async function logAttendance(
  uid: string,
  log: Omit<AttendanceLog, "id" | "timestamp">
): Promise<AttendanceLog> {
  const timestamp = new Date().toISOString();
  const docRef = await addDoc(logsCol(uid), {
    ...log,
    timestamp,
  });
  return { id: docRef.id, ...log, timestamp };
}

export async function clearAttendanceLogs(uid: string): Promise<void> {
  const snap = await getDocs(logsCol(uid));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Shared Class Lookup (for Student Portal) ───────────────────────

import { getDoc } from "firebase/firestore";

export interface SharedClass {
  lecturerUid: string;
  courseId: string;
  courseName: string;
  courseCode: string;
}

export async function resolveShareCode(
  code: string
): Promise<SharedClass | null> {
  const snap = await getDoc(doc(db, "shared_classes", code.toUpperCase()));
  if (!snap.exists()) return null;
  return snap.data() as SharedClass;
}

export async function getStudentsByLecturer(
  lecturerUid: string
): Promise<Student[]> {
  const snap = await getDocs(studentsCol(lecturerUid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}

export async function logAttendanceByLecturer(
  lecturerUid: string,
  log: Omit<AttendanceLog, "id" | "timestamp">
): Promise<AttendanceLog> {
  const timestamp = new Date().toISOString();
  const docRef = await addDoc(logsCol(lecturerUid), {
    ...log,
    timestamp,
  });
  return { id: docRef.id, ...log, timestamp };
}
