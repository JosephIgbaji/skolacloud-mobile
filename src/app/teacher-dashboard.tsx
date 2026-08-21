import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  School as SchoolIcon,
  LogOut,
  GraduationCap,
  Clock,
  Calendar,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Play,
  Square,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

function formatDigitalHours(statusObj: any): string {
  if (!statusObj) return '0:00';
  const durationText = statusObj.durationText;
  if (durationText && durationText.includes(':')) {
    return durationText;
  }
  const hoursWorked = statusObj.hoursWorked || 0;
  const h = Math.floor(hoursWorked);
  const m = Math.round((hoursWorked - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const userDisplayName = user?.name || user?.fullName || 'Teacher';
  const schoolName = (user as any)?.schoolName || 'SkolaCloud Academy';

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
        throw new Error('GPS permission is required to verify you are on school premises.');
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

  // 1. Staff Resumption & Duty Shift Status Query
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

  // 2. Fetch Teacher's Assigned Classes (Real Count)
  const { data: myClasses = [] } = useQuery({
    queryKey: ['teacher-assigned-classes-dashboard'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/teachers/classes').catch(() => null);
        let list = res?.data;
        if (list && typeof list === 'object' && Array.isArray(list.data)) list = list.data;
        if (!Array.isArray(list)) list = [];

        if (list.length === 0) {
          const fallback = await apiClient.get('/teachers/classes/all').catch(() => null);
          if (Array.isArray(fallback?.data)) list = fallback.data;
        }
        return list;
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Teacher's Enrolled Students (Real Count)
  const { data: myStudents = [] } = useQuery({
    queryKey: ['teacher-assigned-students-dashboard'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/teachers/students').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
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
        deviceInfo: 'Teacher Mobile Dashboard',
      });
      return res.data;
    },
    onSuccess: (resData: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-status'] });
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-my-history'] });
      const isLate = resData?.isLate;
      Alert.alert(
        isLate ? 'Clocked In (Late) ⚠️' : 'Resumption Clocked In 🎉',
        isLate
          ? `Clocked in at ${resData?.checkInTime}. Official start time is 08:00 AM.`
          : `Great job! Clocked in on time at ${resData?.checkInTime}.`
      );
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
      Alert.alert(
        'Duty Shift Ended 🎉',
        `Clocked out at ${resData?.checkOutTime}. Shift duration: ${resData?.durationText || 'Completed'}.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Clock-Out Error ❌', err.response?.data?.message || 'Failed to clock out of shift.');
    },
  });

  const isClockedIn = staffShiftStatus?.clockedIn;
  const isClockedOut = staffShiftStatus?.clockedOut;

  const assignedClassesCount = myClasses.length;
  const enrolledPupilsCount = myStudents.length;
  const shiftHoursFormatted = formatDigitalHours(staffShiftStatus);

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
            <Badge label="Class Teacher" variant="info" size="md" />
            <ThemedText style={styles.dateText}>{currentDateStr}</ThemedText>
          </View>

          <View style={styles.heroBody}>
            <ThemedText style={styles.heroTitle}>Teacher Workstation</ThemedText>
            <ThemedText style={styles.heroSub}>Clock in for duty, mark class roll call, and manage student grades.</ThemedText>
          </View>

          {/* Teacher Real-Time Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <ThemedText style={styles.metricValue}>
                {assignedClassesCount}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>{assignedClassesCount === 1 ? 'Assigned Class' : 'Assigned Classes'}</ThemedText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <ThemedText style={[styles.metricValue, { color: '#38bdf8' }]}>
                {enrolledPupilsCount}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Enrolled Pupils</ThemedText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>
                {shiftHoursFormatted}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Shift Hours</ThemedText>
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

        {/* Quick Operational Workstations Grid */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>Teacher Workstations</ThemedText>

          <View style={styles.gridContainer}>
            {/* Student Roster */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/teacher-students')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <GraduationCap size={22} color="#38bdf8" />
              </View>
              <ThemedText style={styles.gridTitle}>Students</ThemedText>
              <ThemedText style={styles.gridSub}>Class Roster & Calls</ThemedText>
            </TouchableOpacity>

            {/* Attendance Roll Call */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/attendance')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                <Clock size={22} color="#4ade80" />
              </View>
              <ThemedText style={styles.gridTitle}>Roll Call</ThemedText>
              <ThemedText style={styles.gridSub}>Mark Class Attendance</ThemedText>
            </TouchableOpacity>

            {/* Results & Grading */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/teacher-results')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                <FileSpreadsheet size={22} color="#facc15" />
              </View>
              <ThemedText style={styles.gridTitle}>Results</ThemedText>
              <ThemedText style={styles.gridSub}>CA & Exam Entry</ThemedText>
            </TouchableOpacity>

            {/* Timetables & Schedules */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/teacher-timetable')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                <Calendar size={22} color="#c084fc" />
              </View>
              <ThemedText style={styles.gridTitle}>Timetable</ThemedText>
              <ThemedText style={styles.gridSub}>My Daily Schedule</ThemedText>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%', backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 8 },
  gridIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gridTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  gridSub: { fontSize: 12, color: '#94a3b8' },
});
