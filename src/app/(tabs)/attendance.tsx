import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const rawRole = (user?.role || 'student').toLowerCase();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-records', rawRole],
    queryFn: async () => {
      try {
        let endpoint = '/attendance';
        if (rawRole === 'student') endpoint = '/attendance/student';
        if (rawRole === 'teacher') endpoint = '/attendance/staff';

        const res = await apiClient.get(endpoint);
        const rawData = res.data;
        if (Array.isArray(rawData)) return rawData;
        if (Array.isArray(rawData?.data)) return rawData.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  const logs: any[] = data || [];

  const presentCount = logs.filter((l) => (l.status || '').toLowerCase() === 'present').length;
  const lateCount = logs.filter((l) => (l.status || '').toLowerCase() === 'late').length;
  const absentCount = logs.filter((l) => (l.status || '').toLowerCase() === 'absent').length;

  const totalLogs = logs.length;
  const presentRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>Attendance Tracker</ThemedText>
            <ThemedText style={styles.subtitle}>Daily rosters & attendance logs</ThemedText>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
            <RefreshCw size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{presentRate}%</ThemedText>
            <ThemedText style={styles.statLabel}>Present Rate</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#38bdf8' }]}>{presentCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Present</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#fbbf24' }]}>{lateCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Late</ThemedText>
          </ThemedView>
        </View>

        {/* Logs List Section */}
        <ThemedText style={styles.sectionTitle}>Attendance Roster ({logs.length})</ThemedText>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <ThemedText style={styles.loadingText}>Loading attendance records...</ThemedText>
          </View>
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load attendance</ThemedText>
            <ThemedText style={styles.emptySub}>Please check server connection and retry.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : logs.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Clock size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No attendance records</ThemedText>
            <ThemedText style={styles.emptySub}>
              Attendance records taken by class teachers or Bursar will appear here.
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.logsCard}>
            {logs.map((item, idx) => {
              const statusRaw = (item.status || 'Present').toLowerCase();
              const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today';
              const nameStr = item.studentName || item.userName || item.student?.fullName || item.name || 'User Record';

              return (
                <View key={item._id || item.id || idx}>
                  {idx > 0 && <View style={styles.itemDivider} />}
                  <View style={styles.logItem}>
                    <View style={styles.logLeft}>
                      {statusRaw === 'present' && <CheckCircle2 size={20} color="#4ade80" />}
                      {statusRaw === 'late' && <AlertTriangle size={20} color="#fbbf24" />}
                      {statusRaw === 'absent' && <Clock size={20} color="#f87171" />}
                      <View style={{ marginLeft: 12 }}>
                        <ThemedText style={styles.logDate}>{nameStr}</ThemedText>
                        <ThemedText style={styles.logTime}>{dateStr} • {item.time || item.checkInTime || 'Roster'}</ThemedText>
                      </View>
                    </View>
                    <Badge
                      label={item.status || 'Present'}
                      variant={statusRaw === 'present' ? 'success' : statusRaw === 'late' ? 'warning' : 'danger'}
                      size="sm"
                    />
                  </View>
                </View>
              );
            })}
          </ThemedView>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ade80',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 14,
  },
  logsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  logTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0284c7',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
