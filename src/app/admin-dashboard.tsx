import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  Play,
  School as SchoolIcon,
  Square
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
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

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const userDisplayName = user?.name || user?.fullName || 'Admin';
  const schoolName = (user as any)?.schoolName || 'SkolaCloud';

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Fetch fresh GPS position for staff shift clocking
  const getFreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('GPS permission is required to verify campus presence.');
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    } catch {
      return { latitude: undefined, longitude: undefined };
    }
  };

  // Staff Resumption & Duty Shift Status Query
  const { data: staffShiftStatus, isLoading: isLoadingShift } = useQuery({
    queryKey: ['staff-today-status'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/staff-attendance/today-status');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getFreshLocation();
      const res = await apiClient.post('/staff-attendance/clock-in', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        deviceInfo: 'Admin Mobile Dashboard',
      });
      return res.data;
    },
    onSuccess: (resData: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-status'] });
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-my-history'] });
      Alert.alert('Admin Duty Shift Started 🎉', `Clocked in at ${resData?.checkInTime}.`);
    },
    onError: (err: any) => {
      Alert.alert('Clock-In Rejected ❌', err.response?.data?.message || err.message || 'Failed to clock in for shift.');
    },
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getFreshLocation();
      const res = await apiClient.post('/staff-attendance/clock-out', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      return res.data;
    },
    onSuccess: (resData: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-status'] });
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-my-history'] });
      Alert.alert('Duty Shift Ended 🎉', `Clocked out at ${resData?.checkOutTime}.`);
    },
    onError: (err: any) => {
      Alert.alert('Clock-Out Error ❌', err.response?.data?.message || 'Failed to clock out of shift.');
    },
  });

  // Admin Dashboard Overview Stats
  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard-stats-overview'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/dashboard/stats').catch(() => null);
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  // Fallback Students Count Query
  const { data: fallbackStudentsCount } = useQuery({
    queryKey: ['admin-fallback-students-count'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/students', { params: { limit: 1 } });
        return res?.data?.total || res?.data?.length || 0;
      } catch {
        return 0;
      }
    },
  });

  // Admin Per-Class Student Attendance Summary Query
  const { data: adminAttendanceSummary = [] } = useQuery({
    queryKey: ['admin-classes-attendance-summary'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/teachers/attendance/admin-summary');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  const studentCount = dashboardData?.students || fallbackStudentsCount || 0;
  const isClockedIn = staffShiftStatus?.clockedIn;
  const isClockedOut = staffShiftStatus?.clockedOut;

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
            <Badge label="School Administrator" variant="info" size="md" />
            <ThemedText style={styles.dateText}>{currentDateStr}</ThemedText>
          </View>

          <View style={styles.heroBody}>
            <ThemedText style={styles.heroTitle}>School Command Center</ThemedText>
            <ThemedText style={styles.heroSub}>Manage school enrollment, staff attendance, broadsheets, and operations.</ThemedText>
          </View>

          {/* Admin Overview Metrics Row */}
          <View style={styles.metricsRow}>
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
          </View>
        </Card>

        {/* STAFF DUTY SHIFT & RESUMPTION CARD */}
        <ThemedView style={styles.resumptionCard}>
          <View style={styles.resumptionHeader}>
            <View style={styles.resumptionHeaderLeft}>
              <Clock size={20} color="#38bdf8" />
              <View>
                <ThemedText style={styles.resumptionTitle}>Duty Shift Resumption</ThemedText>
                <ThemedText style={styles.resumptionSub}>Record daily school resumption & departure</ThemedText>
              </View>
            </View>

            <Badge
              label={isClockedOut ? 'COMPLETED' : isClockedIn ? 'ON DUTY' : 'OFF DUTY'}
              variant={isClockedOut ? 'info' : isClockedIn ? 'success' : 'neutral'}
              size="sm"
            />
          </View>

          <View style={styles.shiftTimeDetails}>
            <View style={styles.shiftTimeBox}>
              <ThemedText style={styles.shiftTimeLabel}>Clocked In</ThemedText>
              <ThemedText style={styles.shiftTimeVal}>
                {staffShiftStatus?.checkInTime || '--:--'}
              </ThemedText>
            </View>
            <View style={styles.shiftTimeBox}>
              <ThemedText style={styles.shiftTimeLabel}>Clocked Out</ThemedText>
              <ThemedText style={styles.shiftTimeVal}>
                {staffShiftStatus?.checkOutTime || '--:--'}
              </ThemedText>
            </View>
          </View>

          {/* Clock-In / Clock-Out Action Buttons */}
          {isLoadingShift ? (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 10 }} />
          ) : !isClockedIn ? (
            <TouchableOpacity
              style={styles.clockInBtn}
              disabled={clockInMutation.isPending}
              onPress={() => clockInMutation.mutate()}
            >
              {clockInMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Play size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.clockInBtnText}>CLOCK IN FOR DUTY SHIFT</ThemedText>
                </>
              )}
            </TouchableOpacity>
          ) : !isClockedOut ? (
            <TouchableOpacity
              style={styles.clockOutBtn}
              disabled={clockOutMutation.isPending}
              onPress={() => clockOutMutation.mutate()}
            >
              {clockOutMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Square size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.clockOutBtnText}>CLOCK OUT OF SHIFT</ThemedText>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.completedDutyBox}>
              <CheckCircle2 size={18} color="#4ade80" />
              <ThemedText style={styles.completedDutyText}>
                Shift Completed Today ({staffShiftStatus?.checkInTime} - {staffShiftStatus?.checkOutTime})
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* ADMIN PER-CLASS STUDENT ATTENDANCE OVERVIEW WIDGET */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText style={styles.sectionTitle}>Class Attendance Overview</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>Today's student roll call status per class arm</ThemedText>
            </View>
            <TouchableOpacity onPress={() => router.push('/attendance')}>
              <ThemedText style={styles.viewAllLink}>View All</ThemedText>
            </TouchableOpacity>
          </View>

          {adminAttendanceSummary.length === 0 ? (
            <ThemedView style={styles.emptyAttendanceCard}>
              <CheckCircle2 size={24} color="#64748b" style={{ marginBottom: 6 }} />
              <ThemedText style={styles.emptyAttendanceTitle}>No Class Attendance Data</ThemedText>
              <ThemedText style={styles.emptyAttendanceSub}>Class attendance summary will update as teachers take roll call.</ThemedText>
            </ThemedView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {adminAttendanceSummary.map((clsItem: any) => {
                const isDone = clsItem.status === 'COMPLETED';
                return (
                  <TouchableOpacity
                    key={clsItem.classId}
                    style={styles.adminAttendanceCard}
                    onPress={() => router.push('/attendance')}
                  >
                    <View style={styles.adminAttCardHeader}>
                      <ThemedText style={styles.adminAttClassName}>{clsItem.className}</ThemedText>
                      <Badge
                        label={isDone ? `${clsItem.presentPercentage}% PRESENT` : 'PENDING'}
                        variant={isDone ? 'success' : 'warning'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.adminAttStatsRow}>
                      <View style={styles.adminAttStatItem}>
                        <ThemedText style={[styles.adminAttStatNum, { color: '#4ade80' }]}>{clsItem.presentCount}</ThemedText>
                        <ThemedText style={styles.adminAttStatLabel}>Present</ThemedText>
                      </View>
                      <View style={styles.adminAttStatItem}>
                        <ThemedText style={[styles.adminAttStatNum, { color: '#f87171' }]}>{clsItem.absentCount}</ThemedText>
                        <ThemedText style={styles.adminAttStatLabel}>Absent</ThemedText>
                      </View>
                      <View style={styles.adminAttStatItem}>
                        <ThemedText style={[styles.adminAttStatNum, { color: '#fbbf24' }]}>{clsItem.lateCount}</ThemedText>
                        <ThemedText style={styles.adminAttStatLabel}>Late</ThemedText>
                      </View>
                    </View>

                    <ThemedText style={styles.adminAttFooterText}>
                      {isDone ? `Roll Call Saved (${clsItem.markedCount}/${clsItem.totalStudents} Enrolled)` : `Not Yet Submitted (${clsItem.totalStudents} Enrolled)`}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Quick Operational Workstations Grid */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>School Workstations</ThemedText>

          <View style={styles.gridContainer}>
            {/* Student Roster */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/admin-students')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <GraduationCap size={22} color="#38bdf8" />
              </View>
              <ThemedText style={styles.gridTitle}>Students</ThemedText>
              <ThemedText style={styles.gridSub}>School Roster Directory</ThemedText>
            </TouchableOpacity>

            {/* Staff Attendance */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/staff-attendance')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                <Clock size={22} color="#4ade80" />
              </View>
              <ThemedText style={styles.gridTitle}>Staff HRM</ThemedText>
              <ThemedText style={styles.gridSub}>Staff Resumption & GPS</ThemedText>
            </TouchableOpacity>

            {/* Results Broadsheets */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/admin-results')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                <FileSpreadsheet size={22} color="#facc15" />
              </View>
              <ThemedText style={styles.gridTitle}>Results</ThemedText>
              <ThemedText style={styles.gridSub}>Broadsheet Approval</ThemedText>
            </TouchableOpacity>

            {/* Timetables & Master Schedule */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/admin-timetable')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                <Calendar size={22} color="#c084fc" />
              </View>
              <ThemedText style={styles.gridTitle}>Timetable</ThemedText>
              <ThemedText style={styles.gridSub}>Master Schedule Builder</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 16, gap: 16 },
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  schoolRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  schoolBadge: { fontSize: 12, fontWeight: 'bold', color: '#38bdf8' },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  logoutButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  heroCard: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  heroBody: { marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  heroSub: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  metricLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  metricDivider: { width: 1, height: 24, backgroundColor: '#334155' },
  resumptionCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 12 },
  resumptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumptionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resumptionTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  resumptionSub: { fontSize: 12, color: '#94a3b8' },
  shiftTimeDetails: { flexDirection: 'row', gap: 12, backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  shiftTimeBox: { flex: 1, alignItems: 'center' },
  shiftTimeLabel: { fontSize: 11, color: '#94a3b8' },
  shiftTimeVal: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginTop: 2 },
  clockInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 12 },
  clockInBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  clockOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 12 },
  clockOutBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  completedDutyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(74, 222, 128, 0.12)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)' },
  completedDutyText: { fontSize: 12, fontWeight: 'bold', color: '#4ade80' },
  sectionContainer: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sectionSubtitle: { fontSize: 12, color: '#94a3b8' },
  viewAllLink: { fontSize: 12, fontWeight: 'bold', color: '#38bdf8' },
  emptyAttendanceCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyAttendanceTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  emptyAttendanceSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  adminAttendanceCard: { width: 210, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  adminAttCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminAttClassName: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  adminAttStatsRow: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, justifyContent: 'space-between' },
  adminAttStatItem: { alignItems: 'center' },
  adminAttStatNum: { fontSize: 14, fontWeight: 'bold' },
  adminAttStatLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  adminAttFooterText: { fontSize: 10, color: '#94a3b8' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%', backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 8 },
  gridIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gridTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  gridSub: { fontSize: 12, color: '#94a3b8' },
});
