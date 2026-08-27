import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  User as UserIcon,
  X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient } from '@/lib/api-client';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = typeof cls === 'string' ? cls : (cls.name || '').trim();
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

export default function AdminTimetableScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Add Period Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: '',
    teacherId: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    room: '',
  });

  // 1. Fetch Classes List
  const { data: allClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['admin-timetable-classes'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/admin/classes').catch(() => null);
        if (!res?.data) res = await apiClient.get('/classes').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first class
  React.useEffect(() => {
    if (allClasses.length > 0 && !selectedClassId) {
      const first = allClasses[0];
      setSelectedClassId((first._id || first.id).toString());
    }
  }, [allClasses, selectedClassId]);

  // Selected Class object
  const selectedClass = useMemo(() => {
    return allClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId) || allClasses[0];
  }, [allClasses, selectedClassId]);

  // 2. Fetch Timetable Entries for Selected Class
  const {
    data: timetableEntries = [],
    isLoading: isLoadingEntries,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-timetable-entries', selectedClassId],
    enabled: Boolean(selectedClassId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/timetable', { params: { classId: selectedClassId } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Subjects
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['admin-timetable-subjects'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subjects', { params: { limit: 100 } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first subject in form
  React.useEffect(() => {
    if (allSubjects.length > 0 && !formData.subjectId) {
      const first = allSubjects[0];
      setFormData((prev) => ({ ...prev, subjectId: (first._id || first.id).toString() }));
    }
  }, [allSubjects, formData.subjectId]);

  // 4. Fetch Teachers
  const { data: allTeachers = [] } = useQuery({
    queryKey: ['admin-timetable-teachers'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/admin/teachers').catch(() => null);
        if (!res?.data) res = await apiClient.get('/users', { params: { role: 'teacher' } }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Filter entries for current selected day & sort by startTime
  const dayEntries = useMemo(() => {
    return timetableEntries
      .filter((entry: any) => entry.day === selectedDay)
      .sort((a: any, b: any) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }, [timetableEntries, selectedDay]);

  // Check Time Conflict
  const conflictError = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return null;
    const nStart = parseTimeToMinutes(formData.startTime);
    const nEnd = parseTimeToMinutes(formData.endTime);

    if (nStart >= nEnd) return 'Start time must be earlier than end time.';

    const dayScheduled = timetableEntries.filter((e: any) => e.day === formData.day);
    for (const entry of dayScheduled) {
      const eStart = parseTimeToMinutes(entry.startTime);
      const eEnd = parseTimeToMinutes(entry.endTime);

      if (nStart < eEnd && nEnd > eStart) {
        const subName = typeof entry.subjectId === 'object' ? entry.subjectId.name : 'existing class';
        return `Conflict with ${subName} (${entry.startTime} - ${entry.endTime})`;
      }
    }
    return null;
  }, [formData, timetableEntries]);

  // Create Timetable Period Mutation
  const createPeriodMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        classId: selectedClassId,
        subjectId: formData.subjectId,
        teacherId: formData.teacherId === 'none' ? undefined : formData.teacherId || undefined,
        day: formData.day,
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        room: formData.room.trim() || undefined,
      };

      const res = await apiClient.post('/timetable', payload);
      return res.data;
    },
    onSuccess: () => {
      setModalVisible(false);
      setFormData((prev) => ({
        ...prev,
        startTime: '08:00',
        endTime: '08:45',
        room: '',
      }));
      Alert.alert('Period Added 🎉', 'New period slot added to class timetable.');
      queryClient.invalidateQueries({ queryKey: ['admin-timetable-entries', selectedClassId] });
    },
    onError: (err: any) => {
      Alert.alert('Creation Failed ❌', err.response?.data?.message || 'Failed to add period slot.');
    },
  });

  // Delete Timetable Entry Mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/timetable/${id}`);
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Period Deleted 🗑️', 'Period removed from class timetable.');
      queryClient.invalidateQueries({ queryKey: ['admin-timetable-entries', selectedClassId] });
    },
    onError: (err: any) => {
      Alert.alert('Delete Failed ❌', err.response?.data?.message || 'Failed to remove period slot.');
    },
  });

  const handleDelete = (id: string, subjectName: string) => {
    Alert.alert(
      'Remove Period',
      `Are you sure you want to remove ${subjectName} from the timetable?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteEntryMutation.mutate(id),
        },
      ]
    );
  };

  const openAddModal = () => {
    setFormData((prev) => ({ ...prev, day: selectedDay }));
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Timetable Builder</ThemedText>
          <ThemedText style={styles.sub}>
            {selectedClass ? formatClassLabel(selectedClass) : 'Select Class'}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, !selectedClassId && { opacity: 0.5 }]}
          disabled={!selectedClassId}
          onPress={openAddModal}
        >
          <Plus size={16} color="#ffffff" />
          <ThemedText style={styles.addBtnText}>Add Slot</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />
        }
      >
        {/* CLASS SELECTOR PILLS */}
        <View style={{ gap: 6 }}>
          <ThemedText style={styles.inputLabel}>SELECT CLASS:</ThemedText>
          {isLoadingClasses ? (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 6 }} />
          ) : allClasses.length === 0 ? (
            <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>No classes configured yet.</ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {allClasses.map((cls: any) => {
                const cId = (cls._id || cls.id).toString();
                const isSel = selectedClassId === cId;
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                    onPress={() => setSelectedClassId(cId)}
                  >
                    <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>
                      {formatClassLabel(cls)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* DAY SELECTOR SEGMENTED CONTROL */}
        <View style={styles.daySegmentContainer}>
          {DAYS.map((day) => {
            const isSel = selectedDay === day;
            const dayCount = timetableEntries.filter((e: any) => e.day === day).length;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.daySegmentBtn, isSel && styles.daySegmentBtnActive]}
                onPress={() => setSelectedDay(day)}
              >
                <ThemedText style={[styles.daySegmentText, isSel && styles.daySegmentTextActive]}>
                  {day.slice(0, 3).toUpperCase()}
                </ThemedText>
                {dayCount > 0 && (
                  <View style={[styles.dayBadge, isSel && styles.dayBadgeActive]}>
                    <ThemedText style={[styles.dayBadgeText, isSel && styles.dayBadgeTextActive]}>
                      {dayCount}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SCHEDULED PERIOD CARDS FOR SELECTED DAY */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={styles.sectionTitle}>{selectedDay.toUpperCase()} PERIODS ({dayEntries.length})</ThemedText>
          </View>

          {isLoadingEntries ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
          ) : dayEntries.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <Calendar size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Periods Scheduled</ThemedText>
              <ThemedText style={styles.emptySub}>
                No subject classes scheduled for {selectedDay} yet. Click "+ Add Slot" above to add a period slot.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {dayEntries.map((entry: any) => {
                const subName = typeof entry.subjectId === 'object' ? entry.subjectId?.name : entry.subjectId || 'Subject';
                const teacherObj = typeof entry.teacherId === 'object' ? entry.teacherId : null;
                const teacherName = teacherObj ? (teacherObj.fullName || teacherObj.name) : 'No teacher assigned';
                const entryId = (entry._id || entry.id).toString();

                return (
                  <ThemedView key={entryId} style={styles.periodCard}>
                    <View style={styles.periodCardHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.subjectName}>{subName}</ThemedText>
                        <View style={styles.timeRow}>
                          <Clock size={13} color="#38bdf8" />
                          <ThemedText style={styles.timeText}>
                            {entry.startTime} – {entry.endTime}
                          </ThemedText>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(entryId, subName)}
                      >
                        <Trash2 size={16} color="#f87171" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.periodMetaRow}>
                      <View style={styles.metaItem}>
                        <UserIcon size={13} color="#94a3b8" />
                        <ThemedText style={styles.metaText}>{teacherName}</ThemedText>
                      </View>

                      {entry.room && (
                        <View style={styles.metaItem}>
                          <MapPin size={13} color="#94a3b8" />
                          <ThemedText style={styles.metaText}>{entry.room}</ThemedText>
                        </View>
                      )}
                    </View>
                  </ThemedView>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD PERIOD SLOT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Timetable Period Slot</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
              {/* Select Day */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>DAY OF WEEK:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {DAYS.map((d) => {
                    const isSel = formData.day === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.typePillBtn, isSel && styles.typePillBtnActive]}
                        onPress={() => setFormData((prev) => ({ ...prev, day: d }))}
                      >
                        <ThemedText style={[styles.typePillText, isSel && styles.typePillTextActive]}>{d}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Select Subject */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>SUBJECT:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {allSubjects.map((sub: any) => {
                    const sId = (sub._id || sub.id).toString();
                    const isSel = formData.subjectId === sId;
                    return (
                      <TouchableOpacity
                        key={sId}
                        style={[styles.typePillBtn, isSel && styles.typePillBtnActive]}
                        onPress={() => setFormData((prev) => ({ ...prev, subjectId: sId }))}
                      >
                        <ThemedText style={[styles.typePillText, isSel && styles.typePillTextActive]}>{sub.name}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Start Time & End Time */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <ThemedText style={styles.inputLabel}>START TIME (HH:MM):</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="08:00"
                    placeholderTextColor="#64748b"
                    value={formData.startTime}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, startTime: val }))}
                  />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                  <ThemedText style={styles.inputLabel}>END TIME (HH:MM):</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="08:45"
                    placeholderTextColor="#64748b"
                    value={formData.endTime}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, endTime: val }))}
                  />
                </View>
              </View>

              {/* Time Conflict Warning Banner */}
              {conflictError && (
                <View style={styles.conflictBox}>
                  <AlertCircle size={16} color="#f87171" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.conflictText}>{conflictError}</ThemedText>
                </View>
              )}

              {/* Select Teacher */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>ASSIGN TEACHER (OPTIONAL):</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.typePillBtn, formData.teacherId === 'none' && styles.typePillBtnActive]}
                    onPress={() => setFormData((prev) => ({ ...prev, teacherId: 'none' }))}
                  >
                    <ThemedText style={[styles.typePillText, formData.teacherId === 'none' && styles.typePillTextActive]}>None</ThemedText>
                  </TouchableOpacity>

                  {allTeachers.map((t: any) => {
                    const tId = (t._id || t.id).toString();
                    const isSel = formData.teacherId === tId;
                    const name = t.fullName || t.name || 'Teacher';
                    return (
                      <TouchableOpacity
                        key={tId}
                        style={[styles.typePillBtn, isSel && styles.typePillBtnActive]}
                        onPress={() => setFormData((prev) => ({ ...prev, teacherId: tId }))}
                      >
                        <ThemedText style={[styles.typePillText, isSel && styles.typePillTextActive]}>{name}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Room / Location */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>ROOM / VENUE (OPTIONAL):</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Room 101, Science Lab, Hall"
                  placeholderTextColor="#64748b"
                  value={formData.room}
                  onChangeText={(val) => setFormData((prev) => ({ ...prev, room: val }))}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!formData.subjectId || Boolean(conflictError) || createPeriodMutation.isPending) && { opacity: 0.5 },
                ]}
                disabled={!formData.subjectId || Boolean(conflictError) || createPeriodMutation.isPending}
                onPress={() => createPeriodMutation.mutate()}
              >
                {createPeriodMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.confirmBtnText}>ADD PERIOD TO TIMETABLE</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
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

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  content: { padding: 16, gap: 14 },

  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },

  pillsRow: { gap: 8, paddingVertical: 2 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  daySegmentContainer: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  daySegmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  daySegmentBtnActive: { backgroundColor: '#0284c7' },
  daySegmentText: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  daySegmentTextActive: { color: '#ffffff' },

  dayBadge: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  dayBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayBadgeText: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  dayBadgeTextActive: { color: '#ffffff' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  periodCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', borderLeftWidth: 4, borderLeftColor: '#38bdf8', gap: 10 },
  periodCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  timeText: { fontSize: 12, color: '#38bdf8', fontWeight: '600' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.12)', justifyContent: 'center', alignItems: 'center' },

  periodMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#cbd5e1' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },

  typePillBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  typePillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  typePillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  typePillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  formInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 13, borderWidth: 1, borderColor: '#334155' },

  conflictBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  conflictText: { fontSize: 12, color: '#f87171', flex: 1 },

  confirmBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  confirmBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});
