import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  Laptop,
  LogOut,
  Megaphone,
  School as SchoolIcon,
  UserCheck,
  Users,
  Building2,
  DollarSign,
  Award,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const userDisplayName = useMemo(() => {
    if (!user) return 'User';
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    return user.email || 'User';
  }, [user]);

  const schoolName = user?.school?.name || 'SkolaCloud Academy';
  const rawRole = (user?.role || 'student').toLowerCase();

  // Format role label for display
  const roleLabel = useMemo(() => {
    switch (rawRole) {
      case 'super_admin':
      case 'superadmin':
        return 'SUPER ADMIN';
      case 'admin':
        return 'SCHOOL ADMIN';
      case 'teacher':
        return 'TEACHER';
      case 'parent':
        return 'PARENT';
      case 'accountant':
        return 'BURSAR / ACCOUNTANT';
      case 'student':
      default:
        return 'STUDENT';
    }
  }, [rawRole]);

  // Fetch Dashboard Stats based on role from backend
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-analytics', rawRole],
    queryFn: async () => {
      try {
        if (rawRole === 'student') {
          const res = await apiClient.get('/analytics/student-dashboard').catch(() => null);
          return res?.data || null;
        } else if (rawRole === 'parent') {
          const res = await apiClient.get('/analytics/parent-dashboard').catch(() => null);
          return res?.data || null;
        } else if (rawRole === 'teacher') {
          const res = await apiClient.get('/analytics/teacher-dashboard').catch(() => null);
          return res?.data || null;
        } else if (rawRole === 'accountant') {
          const res = await apiClient.get('/analytics/accountant-dashboard').catch(() => null);
          return res?.data || null;
        } else {
          const res = await apiClient.get('/admin/analytics/dashboard').catch(() => null);
          return res?.data || null;
        }
      } catch {
        return null;
      }
    },
  });

  // Fetch Recent Announcements / Events
  const { data: events } = useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/events');
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Direct fallback query for students list count
  const { data: fallbackStudentsCount } = useQuery({
    queryKey: ['admin-students-fallback-count'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/students');
        const raw = res.data;
        if (Array.isArray(raw)) return raw.length;
        if (typeof raw?.total === 'number') return raw.total;
        if (Array.isArray(raw?.data)) return raw.data.length;
        return 0;
      } catch {
        return 0;
      }
    },
    enabled: rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin',
  });

  const studentCount = dashboardData?.students || fallbackStudentsCount || 0;

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Bar */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={styles.schoolRow}>
              <SchoolIcon size={14} color="#38bdf8" style={{ marginRight: 5 }} />
              <ThemedText style={styles.schoolBadge} numberOfLines={1}>{schoolName}</ThemedText>
            </View>
            <ThemedText style={styles.welcomeText} numberOfLines={1}>
              Welcome, {userDisplayName.split(' ')[0]} 👋
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={20} color="#f87171" />
          </TouchableOpacity>
        </View>

        {/* Hero Role Banner Card */}
        <Card variant="glass" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Badge label={roleLabel} variant="info" size="md" />
            <ThemedText style={styles.dateText}>{currentDateStr}</ThemedText>
          </View>

          {/* Persona Overview Message */}
          {rawRole === 'student' && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>Academic Summary</ThemedText>
              <ThemedText style={styles.heroSub}>Track your daily classes, CBT exams, and term results.</ThemedText>
            </View>
          )}

          {rawRole === 'parent' && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>Ward Portal</ThemedText>
              <ThemedText style={styles.heroSub}>Monitor academic progress, fee balances, and attendance.</ThemedText>
            </View>
          )}

          {rawRole === 'teacher' && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>Teacher Workspace</ThemedText>
              <ThemedText style={styles.heroSub}>Take class attendance, review timetables, and manage grades.</ThemedText>
            </View>
          )}

          {(rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin') && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>School Command Center</ThemedText>
              <ThemedText style={styles.heroSub}>Manage enrollment, staff attendance, fees, and operations.</ThemedText>
            </View>
          )}

          {rawRole === 'accountant' && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>Finance & Invoicing Command</ThemedText>
              <ThemedText style={styles.heroSub}>Fee collections, invoicing, payment tracking & reports.</ThemedText>
            </View>
          )}

          {/* Quick Metrics Bar - Role Scoped */}
          <View style={styles.metricsRow}>
            {/* Admin Metrics */}
            {(rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin') && (
              <>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricValue}>
                    {studentCount}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Students</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#facc15' }]}>
                    {dashboardData?.teachers ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Teachers</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>
                    {dashboardData?.classes ?? 1}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Classes</ThemedText>
                </View>
              </>
            )}

            {/* Teacher Metrics */}
            {rawRole === 'teacher' && (
              <>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricValue}>
                    {dashboardData?.myClassesCount ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>My Classes</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#38bdf8' }]}>
                    {dashboardData?.mySubjectsCount ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>My Subjects</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>
                    {dashboardData?.todayPeriodsCount ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Periods Today</ThemedText>
                </View>
              </>
            )}

            {/* Student Metrics */}
            {rawRole === 'student' && (
              <>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricValue}>
                    {dashboardData?.attendancePercentage ? `${dashboardData.attendancePercentage}%` : '100%'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Attendance</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#c084fc' }]}>
                    {dashboardData?.enrolledSubjectsCount ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Subjects</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>
                    {dashboardData?.feeStatus || 'Cleared'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Fee Status</ThemedText>
                </View>
              </>
            )}

            {/* Parent Metrics */}
            {rawRole === 'parent' && (
              <>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricValue}>
                    {dashboardData?.wardsCount ?? 1}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Wards</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#38bdf8' }]}>
                    {dashboardData?.wardAttendanceRate ? `${dashboardData.wardAttendanceRate}%` : '100%'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Attendance</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#facc15' }]}>
                    {dashboardData?.pendingFees ? `₦${dashboardData.pendingFees.toLocaleString()}` : 'Cleared'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Balance</ThemedText>
                </View>
              </>
            )}

            {/* Accountant Metrics */}
            {rawRole === 'accountant' && (
              <>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricValue}>
                    {dashboardData?.collectedRevenue ? `₦${(dashboardData.collectedRevenue / 1000).toFixed(0)}k` : '₦0'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Collected</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#facc15' }]}>
                    {dashboardData?.outstandingFees ? `₦${(dashboardData.outstandingFees / 1000).toFixed(0)}k` : '₦0'}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Pending</ThemedText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>
                    {dashboardData?.invoicesCount ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.metricLabel}>Invoices</ThemedText>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle}>Essential Services</ThemedText>
          <ThemedText style={styles.sectionSubTitle}>Portal Shortcuts</ThemedText>
        </View>

        <View style={styles.gridContainer}>
          {/* Action 1: Students Directory */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(56, 189, 248, 0.25)' }]}
            onPress={() => router.push('/students')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <GraduationCap size={22} color="#38bdf8" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#38bdf8" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>Students</ThemedText>
            <ThemedText style={styles.gridSub}>Roster & directory</ThemedText>
            <Badge label="Academics" variant="info" />
          </TouchableOpacity>

          {/* Action 2: Attendance Tracker */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(74, 222, 128, 0.25)' }]}
            onPress={() => router.push('/attendance')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                <UserCheck size={22} color="#4ade80" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#4ade80" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>Attendance</ThemedText>
            <ThemedText style={styles.gridSub}>
              {rawRole === 'teacher' ? 'Mark class attendance' : 'View attendance logs'}
            </ThemedText>
            <Badge label="Active Term" variant="success" />
          </TouchableOpacity>

          {/* Action 3: School Fees & Payments */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(250, 204, 21, 0.25)' }]}
            onPress={() => router.push('/fees')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                <CreditCard size={22} color="#facc15" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#facc15" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>School Fees</ThemedText>
            <ThemedText style={styles.gridSub}>Invoices & receipts</ThemedText>
            <Badge label="Finance" variant="gold" />
          </TouchableOpacity>

          {/* Action 4: Account Profile */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(192, 132, 252, 0.25)' }]}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                <BookOpen size={22} color="#c084fc" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#c084fc" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>Account Profile</ThemedText>
            <ThemedText style={styles.gridSub}>School & settings</ThemedText>
            <Badge label="Settings" variant="info" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  schoolBadge: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  heroBody: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
});
