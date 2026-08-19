export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'accountant';

export interface School {
  _id: string;
  id?: string;
  name: string;
  subdomain: string;
  address?: string;
  state?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  active?: boolean;
  subscriptionStatus?: string;
}

export interface SkolaUser {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
  school?: School;
  studentId?: string;
  isActive?: boolean;
  requiresPasswordChange?: boolean;
  avatarUrl?: string;
}

export interface Student {
  _id: string;
  id?: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender?: string;
  className?: string;
  classId?: string;
  parentPhone?: string;
  parentEmail?: string;
}

export interface AttendanceRecord {
  _id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  studentName?: string;
  className?: string;
}

export interface FeeInvoice {
  _id: string;
  title: string;
  amount: number;
  amountPaid: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
  term?: string;
  session?: string;
}

export interface SubjectResult {
  subjectName: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark?: string;
}

export interface TermResult {
  _id: string;
  term: string;
  session: string;
  gpa?: number;
  percentage?: number;
  subjects: SubjectResult[];
  teacherRemark?: string;
  principalRemark?: string;
}

export interface TimetablePeriod {
  _id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
}
