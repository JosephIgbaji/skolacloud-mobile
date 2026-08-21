import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherStudentAttendanceScreen from './teacher-student-attendance';
import StaffAttendanceScreen from './staff-attendance';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    return <TeacherStudentAttendanceScreen />;
  }

  return <StaffAttendanceScreen />;
}
