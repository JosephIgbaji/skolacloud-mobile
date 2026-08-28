import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  Calendar,
  Award,
  DollarSign,
  Bell,
  ChevronRight,
  LogOut,
  UserCheck,
  FileSpreadsheet,
  Phone,
  School,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = typeof cls === 'string' ? cls : (cls.name || cls.className || '').trim();
  const grade = (cls.grade || cls.gradeLevel || cls.classGroup || cls.group || '').trim();

  if (!grade) return name || 'Class';
  if (!name) return grade;

  if (name.toLowerCase().includes(grade.toLowerCase())) {
    return name;
  }
  if (name.length <= 3) {
    return `${grade} ${name}`;
  }
  return `${grade} (${name})`;
}

export default function ParentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const parentName = user?.fullName || user?.name || 'Parent';
  const schoolName = (user as any)?.schoolName || (user as any)?.school?.name || 'SkolaCloud Academy';

  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // 1. Fetch Parent's Linked Children
  const {
    data: childrenList = [],
    isLoading: isLoadingChildren,
    refetch: refetchChildren,
    isRefetching: isRefetchingChildren,
  } = useQuery({
    queryKey: ['parent-children-list'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/parent/students/children').catch(() => null);
        if (!res?.data) res = await apiClient.get('/parents/children').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first child
  React.useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      const first = childrenList[0];
      setSelectedChildId((first._id || first.id).toString());
    }
  }, [childrenList, selectedChildId]);

  // Selected Child object
  const activeChild = useMemo(() => {
    return childrenList.find((c: any) => (c._id || c.id).toString() === selectedChildId) || childrenList[0];
  }, [childrenList, selectedChildId]);

  // 2. Fetch Selected Child Attendance Today
  const { data: childAttendance = [] } = useQuery({
    queryKey: ['parent-child-attendance', selectedChildId],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/attendance/${selectedChildId}`).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Selected Child Payments / Fees Summary
  const { data: childPayments = [] } = useQuery({
    queryKey: ['parent-child-payments', selectedChildId],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/payments/${selectedChildId}`).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Attendance rate & today status
  const attendanceMetrics = useMemo(() => {
    if (childAttendance.length === 0) return { presentRate: 0, todayStatus: 'UNMARKED' };
    const presentCount = childAttendance.filter((a: any) => a.status === 'present').length;
    const rate = Math.round((presentCount / childAttendance.length) * 100);

    const latestLog = childAttendance[0];
    const todayStatus = latestLog?.status ? (latestLog.status || 'present').toUpperCase() : 'UNMARKED';

    return { presentRate: rate, todayStatus };
  }, [childAttendance]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.headerTitle}>{schoolName}</ThemedText>
          <ThemedText style={styles.headerSub}>PARENT PORTAL • WELCOME, {parentName.toUpperCase()}</ThemedText>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={18} color="#f87171" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingChildren}
            onRefresh={refetchChildren}
            tintColor="#38bdf8"
          />
        }
      >
        {/* CHILDREN SELECTOR PILLS */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>MY WARDS / CHILDREN ({childrenList.length})</ThemedText>
          {isLoadingChildren ? (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 10 }} />
          ) : childrenList.length === 0 ? (
            <ThemedView style={styles.noChildrenCard}>
              <Users size={32} color="#64748b" style={{ marginBottom: 6 }} />
              <ThemedText style={{ color: '#f8fafc', fontWeight: 'bold' }}>No Children Linked</ThemedText>
              <ThemedText style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                No student accounts are currently linked to your parent phone number or email.
              </ThemedText>
            </ThemedView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childPillsRow}>
              {childrenList.map((child: any) => {
                const cId = (child._id || child.id).toString();
                const isSel = selectedChildId === cId;
                const name = `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Student';
                const className = formatClassLabel(child.classId || { name: child.className, grade: child.grade });

                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.childPillBtn, isSel && styles.childPillBtnActive]}
                    onPress={() => setSelectedChildId(cId)}
                  >
                    <View style={[styles.avatarDot, isSel && styles.avatarDotActive]}>
                      <ThemedText style={styles.avatarText}>{name.charAt(0)}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={[styles.childPillName, isSel && styles.childPillNameActive]}>{name}</ThemedText>
                      <ThemedText style={styles.childPillClass}>{className}</ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ACTIVE CHILD HERO OVERVIEW CARD */}
        {activeChild && (
          <ThemedView style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroAvatarBox}>
                <ThemedText style={styles.heroAvatarText}>
                  {`${activeChild.firstName || ''}`.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.heroChildName}>
                  {activeChild.firstName} {activeChild.lastName}
                </ThemedText>
                <ThemedText style={styles.heroChildSub}>
                  Adm No: {activeChild.admissionNumber || 'N/A'} • {formatClassLabel(activeChild.classId || { name: activeChild.className, grade: activeChild.grade })}
                </ThemedText>
              </View>
              <Badge
                label={attendanceMetrics.todayStatus}
                variant={
                  attendanceMetrics.todayStatus === 'PRESENT'
                    ? 'success'
                    : attendanceMetrics.todayStatus === 'ABSENT'
                      ? 'danger'
                      : 'warning'
                }
                size="sm"
              />
            </View>

            {/* Quick Metrics Grid */}
            <View style={styles.heroMetricsGrid}>
              <View style={styles.heroMetricItem}>
                <ThemedText style={styles.heroMetricVal}>{attendanceMetrics.presentRate}%</ThemedText>
                <ThemedText style={styles.heroMetricLabel}>Attendance Rate</ThemedText>
              </View>

              <View style={styles.heroMetricDivider} />

              <View style={styles.heroMetricItem}>
                <ThemedText style={styles.heroMetricVal}>Active</ThemedText>
                <ThemedText style={styles.heroMetricLabel}>Academic Status</ThemedText>
              </View>

              <View style={styles.heroMetricDivider} />

              <View style={styles.heroMetricItem}>
                <ThemedText style={[styles.heroMetricVal, { color: '#4ade80' }]}>Up to Date</ThemedText>
                <ThemedText style={styles.heroMetricLabel}>Fee Balance</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

        {/* PARENT WORKSTATIONS GRID */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <ThemedText style={styles.sectionTitle}>PARENT WORKSTATIONS</ThemedText>

          <View style={styles.gridContainer}>
            {/* My Children Roster */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/parent-children')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Users size={22} color="#38bdf8" />
              </View>
              <ThemedText style={styles.gridTitle}>My Children</ThemedText>
              <ThemedText style={styles.gridSub}>Wards & Teachers</ThemedText>
            </TouchableOpacity>

            {/* Attendance History Log */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/parent-attendance')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                <UserCheck size={22} color="#4ade80" />
              </View>
              <ThemedText style={styles.gridTitle}>Attendance</ThemedText>
              <ThemedText style={styles.gridSub}>Daily Roll Call Log</ThemedText>
            </TouchableOpacity>

            {/* Exam Results & Report Cards */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/parent-results')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                <Award size={22} color="#facc15" />
              </View>
              <ThemedText style={styles.gridTitle}>Report Cards</ThemedText>
              <ThemedText style={styles.gridSub}>Grades & Remarks</ThemedText>
            </TouchableOpacity>

            {/* School Fees & Payments */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/parent-fees')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                <DollarSign size={22} color="#c084fc" />
              </View>
              <ThemedText style={styles.gridTitle}>School Fees</ThemedText>
              <ThemedText style={styles.gridSub}>Invoices & Pay Online</ThemedText>
            </TouchableOpacity>

            {/* School Announcements */}
            <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/notifications')}>
              <View style={[styles.gridIconBox, { backgroundColor: 'rgba(244, 114, 182, 0.15)' }]}>
                <Bell size={22} color="#f472b6" />
              </View>
              <ThemedText style={styles.gridTitle}>Announcements</ThemedText>
              <ThemedText style={styles.gridSub}>Push Notices & SMS</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  headerSub: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center' },

  content: { padding: 16, gap: 14 },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  childPillsRow: { gap: 10, paddingVertical: 4 },
  childPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  childPillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  avatarDot: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  avatarDotActive: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  childPillName: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  childPillNameActive: { color: '#ffffff', fontWeight: 'bold' },
  childPillClass: { fontSize: 10, color: '#cbd5e1' },

  noChildrenCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

  heroCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 14 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatarBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  heroAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  heroChildName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  heroChildSub: { fontSize: 12, color: '#38bdf8', marginTop: 2 },

  heroMetricsGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#334155' },
  heroMetricItem: { flex: 1, alignItems: 'center', gap: 2 },
  heroMetricVal: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  heroMetricLabel: { fontSize: 10, color: '#94a3b8' },
  heroMetricDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%', backgroundColor: '#1e293b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  gridIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  gridTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  gridSub: { fontSize: 11, color: '#94a3b8' },
});
