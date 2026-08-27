import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import TeacherDashboard from '../teacher-dashboard';
import AdminDashboard from '../admin-dashboard';
import ParentDashboard from '../parent-dashboard';

export default function DashboardScreen() {
  const { user } = useAuth();
  const rawRole = (user?.role || 'student').toLowerCase();

  if (rawRole === 'teacher') {
    return <TeacherDashboard />;
  }

  if (rawRole === 'parent') {
    return <ParentDashboard />;
  }

  return <AdminDashboard />;
}
