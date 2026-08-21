import React, { useState, useEffect, useMemo } from 'react';
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
  BookOpen,
  MapPin,
  RefreshCw,
  Layers,
  Filter,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TeacherTimetableScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Set default day to today if it's a weekday, otherwise Monday
  const todayName = useMemo(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(day) ? day : 'Monday';
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(todayName);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Fetch Teacher Assigned Classes
  const {
    data: teacherClasses = [],
    isLoading: isLoadingClasses,
  } = useQuery({
    queryKey: ['teacher-assigned-classes'],
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

  // Fetch Teacher Timetable Schedule
  const {
    data: timetableSlots = [],
    isLoading: isLoadingTimetable,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['teacher-timetable', selectedDay, selectedClassId, user?.id || (user as any)?._id],
    queryFn: async () => {
      try {
        const params: any = { day: selectedDay };
        if (selectedClassId && selectedClassId !== 'all') {
          params.classId = selectedClassId;
        }
        const teacherId = user?.id || (user as any)?._id || (user as any)?.teacherId;
        if (teacherId) {
          params.teacherId = teacherId;
        }

        const res = await apiClient.get('/timetable', { params }).catch(() => null);
        const raw = res?.data;
        let list: any[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data)) list = raw.data;

        // If backend returned all slots, filter by day & class on client as safety fallback
        list = list.filter((slot: any) => {
          const dayMatch = !slot.day || slot.day.toLowerCase() === selectedDay.toLowerCase();
          const classMatch =
            selectedClassId === 'all' ||
            (typeof slot.classId === 'string'
              ? slot.classId === selectedClassId
              : slot.classId?._id === selectedClassId || slot.classId?.id === selectedClassId);
          return dayMatch && classMatch;
        });

        return list;
      } catch {
        return [];
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>My Teaching Schedule</ThemedText>
          <ThemedText style={styles.sub}>Weekly Class & Period Roster</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#38bdf8"
            colors={['#38bdf8']}
          />
        }
      >
        {/* Class Filter Horizontal Scroll */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Filter size={14} color="#94a3b8" />
            <ThemedText style={styles.filterLabel}>ASSIGNED CLASSES</ThemedText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.classPill, selectedClassId === 'all' && styles.classPillActive]}
              onPress={() => setSelectedClassId('all')}
            >
              <ThemedText style={[styles.classPillText, selectedClassId === 'all' && styles.classPillTextActive]}>
                All My Classes
              </ThemedText>
            </TouchableOpacity>

            {teacherClasses.map((cls: any) => {
              const cId = (cls._id || cls.id || '').toString();
              const isSel = selectedClassId === cId;
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.classPill, isSel && styles.classPillActive]}
                  onPress={() => setSelectedClassId(cId)}
                >
                  <ThemedText style={[styles.classPillText, isSel && styles.classPillTextActive]}>
                    {cls.name} {cls.grade ? `(${cls.grade})` : ''}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Day Selector Buttons */}
        <View style={styles.dayRow}>
          {DAYS.map((day) => {
            const isSel = selectedDay === day;
            const isToday = day === todayName;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayBtn, isSel && styles.dayBtnActive]}
                onPress={() => setSelectedDay(day)}
              >
                <ThemedText style={[styles.dayBtnText, isSel && styles.dayBtnTextActive]}>
                  {day.slice(0, 3).toUpperCase()}
                </ThemedText>
                {isToday && (
                  <View style={[styles.todayDot, isSel && styles.todayDotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Schedule Summary Banner */}
        <View style={styles.summaryBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#38bdf8" />
            <ThemedText style={styles.summaryTitle}>{selectedDay} Roster</ThemedText>
          </View>
          <Badge variant="outline" style={styles.countBadge}>
            <ThemedText style={styles.countBadgeText}>{timetableSlots.length} Periods</ThemedText>
          </Badge>
        </View>

        {/* Period Slots List */}
        {isLoadingTimetable ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <ThemedText style={styles.loadingText}>Loading schedule...</ThemedText>
          </View>
        ) : timetableSlots.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Calendar size={44} color="#475569" style={{ marginBottom: 12 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Scheduled</ThemedText>
            <ThemedText style={styles.emptySub}>
              You have no teaching periods assigned for {selectedDay}
              {selectedClassId !== 'all' ? ' in this class' : ''}.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {timetableSlots.map((slot: any, idx: number) => {
              const subjectObj = typeof slot.subjectId === 'object' ? slot.subjectId : null;
              const subjectName = slot.subjectName || subjectObj?.name || (typeof slot.subjectId === 'string' ? slot.subjectId : 'Subject');
              
              const classObj = typeof slot.classId === 'object' ? slot.classId : null;
              const className = slot.className || classObj?.name || 'Assigned Class';
              
              const room = slot.room || slot.venue || classObj?.room || 'Classroom';
              const startTime = slot.startTime || '08:00';
              const endTime = slot.endTime || '08:45';

              return (
                <ThemedView key={slot._id || slot.id || idx} style={styles.slotCard}>
                  {/* Left Column: Time */}
                  <View style={styles.timeContainer}>
                    <View style={styles.clockIconBox}>
                      <Clock size={16} color="#38bdf8" />
                    </View>
                    <ThemedText style={styles.startTimeText}>{startTime}</ThemedText>
                    <ThemedText style={styles.endTimeText}>{endTime}</ThemedText>
                  </View>

                  {/* Right Column: Details */}
                  <View style={styles.slotDetails}>
                    <View style={styles.slotHeaderRow}>
                      <ThemedText style={styles.subjectName}>{subjectName}</ThemedText>
                      <Badge style={styles.periodPill}>
                        <ThemedText style={styles.periodPillText}>Period {idx + 1}</ThemedText>
                      </Badge>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Layers size={13} color="#94a3b8" />
                        <ThemedText style={styles.metaText}>{className}</ThemedText>
                      </View>
                      <View style={styles.metaDot} />
                      <View style={styles.metaItem}>
                        <MapPin size={13} color="#94a3b8" />
                        <ThemedText style={styles.metaText}>{room}</ThemedText>
                      </View>
                    </View>
                  </View>
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sub: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  classPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  classPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  classPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  classPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  dayBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  dayBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  dayBtnTextActive: {
    color: '#ffffff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
    marginTop: 4,
  },
  todayDotActive: {
    backgroundColor: '#ffffff',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  countBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
    gap: 14,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    minWidth: 70,
  },
  clockIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  startTimeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  endTimeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  slotDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  periodPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  periodPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748b',
  },
});
