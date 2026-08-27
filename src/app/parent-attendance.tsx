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
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function ParentAttendanceScreen() {
  const router = useRouter();

  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // 1. Fetch Children
  const { data: childrenList = [] } = useQuery({
    queryKey: ['parent-children-attendance-list'],
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

  // 2. Fetch Selected Child Attendance Logs
  const {
    data: attendanceLogs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['parent-attendance-logs', selectedChildId],
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

  // Calculate stats
  const stats = useMemo(() => {
    if (attendanceLogs.length === 0) return { total: 0, present: 0, absent: 0, late: 0, rate: 100 };
    const total = attendanceLogs.length;
    const present = attendanceLogs.filter((a: any) => a.status === 'present').length;
    const absent = attendanceLogs.filter((a: any) => a.status === 'absent').length;
    const late = attendanceLogs.filter((a: any) => a.status === 'late').length;
    const rate = Math.round((present / total) * 100);
    return { total, present, absent, late, rate };
  }, [attendanceLogs]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Child Attendance Log</ThemedText>
          <ThemedText style={styles.sub}>Daily Roll Call & Presence Rate</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />
        }
      >
        {/* Child Selector Pills */}
        {childrenList.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {childrenList.map((child: any) => {
              const cId = (child._id || child.id).toString();
              const isSel = selectedChildId === cId;
              const name = `${child.firstName || ''} ${child.lastName || ''}`.trim();
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                  onPress={() => setSelectedChildId(cId)}
                >
                  <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>{name}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Stats Header Summary */}
        <ThemedView style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statVal}>{stats.rate}%</ThemedText>
            <ThemedText style={styles.statLabel}>Presence Rate</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statVal, { color: '#4ade80' }]}>{stats.present}</ThemedText>
            <ThemedText style={styles.statLabel}>Present Days</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statVal, { color: '#f87171' }]}>{stats.absent}</ThemedText>
            <ThemedText style={styles.statLabel}>Absent Days</ThemedText>
          </View>
        </ThemedView>

        {/* Attendance History List */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>ATTENDANCE HISTORY</ThemedText>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
          ) : attendanceLogs.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <Calendar size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Attendance Records</ThemedText>
              <ThemedText style={styles.emptySub}>No attendance logs recorded for this child yet.</ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {attendanceLogs.map((log: any) => {
                const dateStr = new Date(log.date || log.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const status = (log.status || 'present').toLowerCase();

                return (
                  <ThemedView key={log._id || log.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} color="#38bdf8" />
                        <ThemedText style={styles.logDate}>{dateStr}</ThemedText>
                      </View>

                      <Badge
                        label={status.toUpperCase()}
                        variant={
                          status === 'present'
                            ? 'success'
                            : status === 'absent'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      />
                    </View>

                    {log.remark && (
                      <ThemedText style={styles.logRemark}>Remark: "{log.remark}"</ThemedText>
                    )}
                  </ThemedView>
                );
              })}
            </View>
          )}
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
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },

  content: { padding: 16, gap: 14 },

  pillsRow: { gap: 8, paddingVertical: 2 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  statsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 10, color: '#94a3b8' },
  statDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  logCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  logRemark: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
