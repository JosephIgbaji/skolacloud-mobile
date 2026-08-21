import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherStudentsScreen from './teacher-students';
import AdminStudentsScreen from './admin-students';

export default function StudentsScreen() {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    return <TeacherStudentsScreen />;
  }

  return <AdminStudentsScreen />;
}
