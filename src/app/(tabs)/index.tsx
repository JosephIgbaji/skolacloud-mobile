import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherDashboard from '../teacher-dashboard';
import AdminDashboard from '../admin-dashboard';

export default function DashboardScreen() {
  const { user } = useAuth();
  const rawRole = (user?.role || 'student').toLowerCase();
  const isTeacher = rawRole === 'teacher';

  if (isTeacher) {
    return <TeacherDashboard />;
  }

  return <AdminDashboard />;
}
