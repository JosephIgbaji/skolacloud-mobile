import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export default function TeacherTimetableScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');

  // Fetch Teacher Schedule
  const { data: scheduleList = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-timetable-schedule', selectedDay],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/timetable', { params: { day: selectedDay } }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>My Teaching Schedule</ThemedText>
          <ThemedText style={styles.sub}>Personal Period Timetable</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Day Pills */}
        <View style={styles.dayRow}>
          {DAYS.map((day) => {
            const isSel = selectedDay === day;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayBtn, isSel && styles.dayBtnActive]}
                onPress={() => setSelectedDay(day)}
              >
                <ThemedText style={[styles.dayBtnText, isSel && styles.dayBtnTextActive]}>
                  {day.slice(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Schedule Slots */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : scheduleList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Calendar size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Scheduled</ThemedText>
            <ThemedText style={styles.emptySub}>You have no assigned teaching periods for {selectedDay}.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {scheduleList.map((slot: any, idx: number) => (
              <ThemedView key={slot._id || idx} style={styles.slotCard}>
                <View style={styles.timeBadge}>
                  <Clock size={14} color="#38bdf8" />
                  <ThemedText style={styles.timeText}>
                    {slot.startTime || '08:00'} - {slot.endTime || '08:45'}
                  </ThemedText>
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.subjectName}>{slot.subjectName || (slot.subjectId as any)?.name || 'Subject'}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} color="#94a3b8" />
                    <ThemedText style={styles.roomText}>Class: {(slot.classId as any)?.name || slot.className || 'Room 10'}</ThemedText>
                  </View>
                </View>
              </ThemedView>
            ))}
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
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },
  content: { padding: 16, gap: 14 },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  dayBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  dayBtnText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  dayBtnTextActive: { color: '#ffffff' },
  slotCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 14 },
  timeBadge: { backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, gap: 4, alignItems: 'center' },
  timeText: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  roomText: { fontSize: 12, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
