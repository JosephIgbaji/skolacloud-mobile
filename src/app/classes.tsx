import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherClassesScreen from './teacher-classes';
import AdminClassesScreen from './admin-classes';

export default function ClassesScreen() {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    return <TeacherClassesScreen />;
  }

  return <AdminClassesScreen />;
}
