import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Clock, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function TimetableScreen() {
  const router = useRouter();

  const { data: timetableList = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-timetable-list'],
    queryFn: async () => {
      const res = await apiClient.get('/timetable');
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Timetables & Schedules</ThemedText>
          <ThemedText style={styles.sub}>Class period schedules & routines</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <Calendar size={18} color="#f472b6" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{timetableList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Active Routines</ThemedText>
          </ThemedView>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load timetables</ThemedText>
          </ThemedView>
        ) : timetableList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Calendar size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Timetable Schedules</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {timetableList.map((item: any, idx: number) => {
              const day = item.dayOfWeek || item.day || 'Monday';
              const timeStr = `${item.startTime || '08:00 AM'} - ${item.endTime || '08:40 AM'}`;
              const subjectName = item.subjectName || item.subject?.name || 'Subject Period';

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.itemCard}>
                  <View style={styles.iconBox}>
                    <Clock size={18} color="#f472b6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemName}>{subjectName}</ThemedText>
                    <ThemedText style={styles.itemSub}>{day} • {timeStr}</ThemedText>
                  </View>
                  <Badge label={item.className || 'Class Arm'} variant="success" size="sm" />
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  content: { padding: 16 },
  statsRow: { marginBottom: 16 },
  statCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  statLabel: { fontSize: 11, color: '#94a3b8' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(244, 114, 182, 0.12)', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  itemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
});
