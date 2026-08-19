import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  X,
  ChevronRight,
  Check,
  User,
  MapPin,
  AlertCircle,
  Building2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rawRole = (user?.role || 'student').toLowerCase();
  const isAdminOrAccountant = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant';

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showClassPickerModal, setShowClassPickerModal] = useState(false);
  const [showSubjectPickerModal, setShowSubjectPickerModal] = useState(false);
  const [showTeacherPickerModal, setShowTeacherPickerModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    room: '',
  });

  // 1. Fetch Classes List for Header & Form Selector
  const { data: classesList = [] } = useQuery({
    queryKey: ['admin-classes-select'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/classes', { params: { limit: 100 } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Set default selected class ID when loaded
  const activeClassId = selectedClassId || classesList[0]?._id || classesList[0]?.id || '';

  // 2. Fetch Subjects List for Form Selector
  const { data: subjectsList = [] } = useQuery({
    queryKey: ['admin-subjects-select'],
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

  // 3. Fetch Teachers List for Form Selector
  const { data: teachersList = [] } = useQuery({
    queryKey: ['admin-teachers-select'],
    enabled: isAdminOrAccountant,
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/teachers');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Timetable Entries for Selected Class
  const { data: timetableResponse, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-timetable', activeClassId],
    enabled: Boolean(activeClassId),
    queryFn: async () => {
      const res = await apiClient.get('/timetable', { params: { classId: activeClassId } });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  const timetableEntries = Array.isArray(timetableResponse) ? timetableResponse : [];

  // Filter entries for the selected day
  const dayEntries = timetableEntries.filter((item: any) => (item.day || item.dayOfWeek) === selectedDay);

  // Time Conflict Check Logic
  const parseTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const checkTimeConflict = (start: string, end: string, day: string) => {
    if (!start || !end) return null;
    const newStart = parseTime(start);
    const newEnd = parseTime(end);

    if (newStart >= newEnd) return 'Start time must be before end time.';

    const sameDayEntries = timetableEntries.filter((e: any) => (e.day || e.dayOfWeek) === day);

    for (const entry of sameDayEntries) {
      const entryStart = parseTime(entry.startTime);
      const entryEnd = parseTime(entry.endTime);

      if (newStart < entryEnd && newEnd > entryStart) {
        const subName = typeof entry.subjectId === 'object' ? entry.subjectId?.name : 'existing period';
        return `Conflict with ${subName || 'class'} (${entry.startTime} - ${entry.endTime})`;
      }
    }
    return null;
  };

  const conflictError = checkTimeConflict(formData.startTime, formData.endTime, formData.day);

  // Handlers for Add Form
  const handleOpenAdd = () => {
    setFormData({
      classId: activeClassId,
      subjectId: subjectsList[0]?._id || subjectsList[0]?.id || '',
      teacherId: '',
      day: selectedDay,
      startTime: '08:00',
      endTime: '08:45',
      room: '',
    });
    setShowFormModal(true);
  };

  // Mutation: Create Timetable Entry
  const createEntryMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        classId: formData.classId || activeClassId,
        subjectId: formData.subjectId,
        day: formData.day,
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
      };
      if (formData.teacherId) payload.teacherId = formData.teacherId;
      if (formData.room.trim()) payload.room = formData.room.trim();

      return await apiClient.post('/timetable', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timetable'] });
      setShowFormModal(false);
      Alert.alert('Success', 'Period added to class timetable successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add period to timetable.');
    },
  });

  // Mutation: Delete Timetable Entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/timetable/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timetable'] });
      Alert.alert('Success', 'Period removed from timetable.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete period.');
    },
  });

  const handleDeleteConfirm = (item: any) => {
    const id = item._id || item.id;
    const subName = typeof item.subjectId === 'object' ? item.subjectId?.name : 'this period';

    Alert.alert(
      'Remove Period',
      `Remove ${subName} (${item.startTime} - ${item.endTime}) from the timetable?`,
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

  const selectedClassObj = classesList.find((c: any) => (c._id || c.id) === activeClassId);
  const selectedClassName = selectedClassObj
    ? `${selectedClassObj.grade} - ${selectedClassObj.name}`
    : 'Select Class';

  const selectedFormSubjectObj = subjectsList.find((s: any) => (s._id || s.id) === formData.subjectId);
  const selectedFormSubjectName = selectedFormSubjectObj ? selectedFormSubjectObj.name : 'Select Subject';

  const selectedFormTeacherObj = teachersList.find((t: any) => (t._id || t.id) === formData.teacherId);
  const selectedFormTeacherName = selectedFormTeacherObj
    ? (selectedFormTeacherObj.fullName || `${selectedFormTeacherObj.firstName || ''} ${selectedFormTeacherObj.lastName || ''}`.trim())
    : 'None';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Timetable Management</ThemedText>
          <ThemedText style={styles.sub}>Class period schedules & routines</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdminOrAccountant && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} disabled={!activeClassId}>
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <ThemedText style={styles.addBtnText}>Add Period</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
            {isFetching ? <ActivityIndicator size="small" color="#38bdf8" /> : <RefreshCw size={18} color="#38bdf8" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Selector Bar */}
        <View style={styles.classSelectorCard}>
          <ThemedText style={styles.selectorLabel}>TARGET CLASS ARM</ThemedText>
          <TouchableOpacity
            style={styles.classTriggerBtn}
            onPress={() => setShowClassPickerModal(true)}
          >
            <Building2 size={18} color="#38bdf8" style={{ marginRight: 8 }} />
            <ThemedText style={styles.classTriggerText}>{selectedClassName}</ThemedText>
            <ChevronRight size={18} color="#94a3b8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Days Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const countForDay = timetableEntries.filter((e: any) => (e.day || e.dayOfWeek) === day).length;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => setSelectedDay(day)}
              >
                <ThemedText style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                  {day} ({countForDay})
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Period Schedule List */}
        {!activeClassId ? (
          <ThemedView style={styles.emptyCard}>
            <Calendar size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Class Selected</ThemedText>
            <ThemedText style={styles.emptySub}>Please select a class arm above to view its timetable.</ThemedText>
          </ThemedView>
        ) : isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.errorText}>Failed to load class timetable.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : dayEntries.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Clock size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Scheduled</ThemedText>
            <ThemedText style={styles.emptySub}>No periods scheduled for {selectedDay} in {selectedClassName}.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {dayEntries.map((item: any, idx: number) => {
              const subObj = typeof item.subjectId === 'object' ? item.subjectId : null;
              const subjectName = subObj ? subObj.name : item.subjectName || 'Subject Period';
              const subjectCode = subObj?.code || '';

              const teacherObj = typeof item.teacherId === 'object' ? item.teacherId : null;
              const teacherName = teacherObj ? (teacherObj.fullName || teacherObj.name || `${teacherObj.firstName || ''} ${teacherObj.lastName || ''}`.trim()) : 'Unassigned';

              const timeRange = `${item.startTime || '08:00'} - ${item.endTime || '08:45'}`;
              const roomName = item.room || 'General Classroom';

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.itemCard}>
                  <View style={styles.iconBox}>
                    <Clock size={20} color="#f472b6" />
                  </View>

                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ThemedText style={styles.itemName}>{subjectName}</ThemedText>
                      {subjectCode ? (
                        <View style={styles.codeBadge}>
                          <ThemedText style={styles.codeBadgeText}>{subjectCode}</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Clock size={12} color="#38bdf8" style={{ marginRight: 4 }} />
                        <ThemedText style={styles.timeText}>{timeRange}</ThemedText>
                      </View>

                      {roomName ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MapPin size={12} color="#4ade80" style={{ marginRight: 3 }} />
                          <ThemedText style={styles.roomText}>{roomName}</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <User size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                      <ThemedText style={styles.teacherText}>Teacher: {teacherName}</ThemedText>
                    </View>
                  </View>

                  {isAdminOrAccountant && (
                    <TouchableOpacity
                      style={styles.deleteIconButton}
                      onPress={() => handleDeleteConfirm(item)}
                    >
                      <Trash2 size={18} color="#f87171" />
                    </TouchableOpacity>
                  )}
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Class Selector Modal */}
      <Modal visible={showClassPickerModal} transparent animationType="slide" onRequestClose={() => setShowClassPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Class Arm</ThemedText>
              <TouchableOpacity onPress={() => setShowClassPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              {classesList.map((c: any) => {
                const cId = c._id || c.id;
                const isSelected = activeClassId === cId;
                const label = `${c.grade} - ${c.name}`;
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedClassId(cId);
                      setShowClassPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {label}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Add Timetable Period Form Modal */}
      <Modal visible={showFormModal} transparent animationType="slide" onRequestClose={() => setShowFormModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Timetable Period</ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Day Selector */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Day of Week *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {DAYS.map((d) => {
                    const isSelected = formData.day === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.daySelectPill, isSelected && styles.daySelectPillActive]}
                        onPress={() => setFormData((p) => ({ ...p, day: d }))}
                      >
                        <ThemedText style={[styles.daySelectPillText, isSelected && styles.daySelectPillTextActive]}>
                          {d}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Subject Selection */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Subject *</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowSubjectPickerModal(true)}
                >
                  <ThemedText style={formData.subjectId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {selectedFormSubjectName}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Times Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.formLabel}>Start Time (HH:MM) *</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 08:00"
                    placeholderTextColor="#64748b"
                    value={formData.startTime}
                    onChangeText={(val) => setFormData((p) => ({ ...p, startTime: val }))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.formLabel}>End Time (HH:MM) *</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 08:45"
                    placeholderTextColor="#64748b"
                    value={formData.endTime}
                    onChangeText={(val) => setFormData((p) => ({ ...p, endTime: val }))}
                  />
                </View>
              </View>

              {/* Conflict Error Message */}
              {conflictError ? (
                <View style={styles.conflictCard}>
                  <AlertCircle size={16} color="#f87171" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.conflictText}>{conflictError}</ThemedText>
                </View>
              ) : null}

              {/* Teacher Selection */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Teacher (Optional)</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowTeacherPickerModal(true)}
                >
                  <ThemedText style={formData.teacherId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {selectedFormTeacherName}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Room Location */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Room / Location (Optional)</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Room 101, Science Lab"
                  placeholderTextColor="#64748b"
                  value={formData.room}
                  onChangeText={(val) => setFormData((p) => ({ ...p, room: val }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!formData.subjectId || !formData.startTime || !formData.endTime || Boolean(conflictError)) && styles.btnDisabled]}
                disabled={!formData.subjectId || !formData.startTime || !formData.endTime || Boolean(conflictError) || createEntryMutation.isPending}
                onPress={() => createEntryMutation.mutate()}
              >
                {createEntryMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Add to Timetable</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectPickerModal} transparent animationType="slide" onRequestClose={() => setShowSubjectPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Subject</ThemedText>
              <TouchableOpacity onPress={() => setShowSubjectPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {subjectsList.map((sub: any) => {
                const sId = sub._id || sub.id;
                const isSelected = formData.subjectId === sId;
                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, subjectId: sId }));
                      setShowSubjectPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {sub.name} {sub.code ? `(${sub.code})` : ''}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Teacher Picker Modal */}
      <Modal visible={showTeacherPickerModal} transparent animationType="slide" onRequestClose={() => setShowTeacherPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Teacher</ThemedText>
              <TouchableOpacity onPress={() => setShowTeacherPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.pickerItem, !formData.teacherId && styles.pickerItemActive]}
                onPress={() => {
                  setFormData((p) => ({ ...p, teacherId: '' }));
                  setShowTeacherPickerModal(false);
                }}
              >
                <ThemedText style={[styles.pickerItemText, !formData.teacherId && styles.pickerItemTextActive]}>
                  None
                </ThemedText>
                {!formData.teacherId && <Check size={18} color="#38bdf8" />}
              </TouchableOpacity>

              {teachersList.map((t: any) => {
                const tId = t._id || t.id;
                const isSelected = formData.teacherId === tId;
                const name = t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;

                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, teacherId: tId }));
                      setShowTeacherPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {name}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  content: { padding: 16 },
  classSelectorCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  selectorLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8 },
  classTriggerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, height: 44 },
  classTriggerText: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  daysRow: { gap: 8, paddingRight: 10, marginBottom: 16 },
  dayPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  dayPillActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  dayPillText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  dayPillTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(244, 114, 182, 0.12)', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  codeBadge: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  codeBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#f472b6' },
  timeText: { fontSize: 12, color: '#38bdf8', fontWeight: '500' },
  roomText: { fontSize: 12, color: '#4ade80', fontWeight: '500' },
  teacherText: { fontSize: 12, color: '#cbd5e1' },
  deleteIconButton: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#0284c7', borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 42, fontSize: 14 },
  formInputSelect: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 42 },
  formInputSelectText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  formInputPlaceholder: { color: '#64748b', fontSize: 14 },
  daySelectPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  daySelectPillActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  daySelectPillText: { fontSize: 12, color: '#94a3b8' },
  daySelectPillTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  conflictCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248, 113, 113, 0.15)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#f87171', marginBottom: 12 },
  conflictText: { flex: 1, fontSize: 12, color: '#f87171', fontWeight: 'bold' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#0f172a', marginBottom: 6 },
  pickerItemActive: { borderColor: '#38bdf8', borderWidth: 1, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  pickerItemText: { fontSize: 14, color: '#cbd5e1' },
  pickerItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
