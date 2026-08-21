import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherSubjectsScreen from './teacher-subjects';
import AdminSubjectsScreen from './admin-subjects';

export default function SubjectsScreen() {
  const { user } = useAuth();
  const role = (user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    return <TeacherSubjectsScreen />;
  }

  return <AdminSubjectsScreen />;
}
