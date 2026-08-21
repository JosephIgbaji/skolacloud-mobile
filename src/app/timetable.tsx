import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherTimetableScreen from './teacher-timetable';
import AdminTimetableScreen from './admin-timetable';

export default function TimetableScreen() {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    return <TeacherTimetableScreen />;
  }

  return <AdminTimetableScreen />;
}
