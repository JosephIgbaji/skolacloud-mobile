import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  Laptop,
  LogOut,
  Megaphone,
  School as SchoolIcon,
  ShieldAlert,
  UserCheck,
  Users,
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

  // Fetch Dashboard Stats based on role
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
        } else {
          const res = await apiClient.get('/analytics/admin-dashboard').catch(() => null);
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
            <ThemedText type="title" style={styles.welcomeText} numberOfLines={1}>
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

          {(rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant') && (
            <View style={styles.heroBody}>
              <ThemedText style={styles.heroTitle}>School Command Center</ThemedText>
              <ThemedText style={styles.heroSub}>Manage enrollment, staff attendance, fees, and operations.</ThemedText>
            </View>
          )}

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <ThemedText style={styles.metricValue}>
                {dashboardData?.students ?? 0}
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
          </View>
        </Card>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle}>Essential Services</ThemedText>
          <ThemedText style={styles.sectionSubTitle}>Portal Shortcuts</ThemedText>
        </View>

        <View style={styles.gridContainer}>
          {/* Action 1: Students Roster */}
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

          {/* Action 5: CBT Exams & Quizzes */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(56, 189, 248, 0.25)' }]}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Laptop size={22} color="#38bdf8" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#38bdf8" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>CBT Practice</ThemedText>
            <ThemedText style={styles.gridSub}>Online tests & quizzes</ThemedText>
            <Badge label="CBT Engine" variant="info" />
          </TouchableOpacity>

          {/* Action 6: School Noticeboard */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.gridCard, { borderColor: 'rgba(244, 114, 182, 0.25)' }]}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
                <Megaphone size={22} color="#f472b6" />
              </View>
              <View style={styles.arrowBox}>
                <ArrowUpRight size={14} color="#f472b6" />
              </View>
            </View>
            <ThemedText style={styles.gridTitle}>Notices</ThemedText>
            <ThemedText style={styles.gridSub}>School announcements</ThemedText>
            <Badge label="Events" variant="neutral" />
          </TouchableOpacity>
        </View>

        {/* Noticeboard Feed Banner */}
        <Card style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <View style={styles.noticeIconBox}>
              <Megaphone size={20} color="#38bdf8" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.noticeTitle}>School Announcement</ThemedText>
              <ThemedText style={styles.noticeSub}>Parent-Teacher Conference & Resumption Schedule</ThemedText>
            </View>
          </View>
        </Card>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  schoolBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  heroBody: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 3,
  },
  gridSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  noticeCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  noticeSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
