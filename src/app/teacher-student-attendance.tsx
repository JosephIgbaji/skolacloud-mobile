import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCheck,
  Clock,
  Layers,
  Lock,
  Save,
  Search,
  ShieldAlert,
  Unlock,
  UserCheck,
  UserX,
  XCircle
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked';

interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  status: AttendanceStatus;
  remark: string;
}

function formatClassLabel(cls: any): string {
  if (!cls) return 'Selected Class';
  const name = (cls.name || '').trim();
  const grade = (cls.grade || '').trim();

  if (!grade) return name || 'Class';
  if (!name) return grade;

  const lowerName = name.toLowerCase();
  const lowerGrade = grade.toLowerCase();

  if (lowerName.includes(lowerGrade)) {
    return name;
  }

  if (name.length <= 2) {
    return `${grade}${name}`;
  }

  return `${grade} ${name}`;
}

function getLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TeacherStudentAttendanceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userRole = (user?.role || 'teacher').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole === 'superadmin';

  // Date State (Defaults to Today YYYY-MM-DD in Local Time)
  const todayStr = useMemo(() => getLocalIsoDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active Class Filter
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: AttendanceStatus; remark: string }>>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Quick Date Chips Generator (Last 7 Days)
  const quickDateChips = useMemo(() => {
    const chips: { label: string; dateStr: string; isToday: boolean }[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = getLocalIsoDate(d);
      const isToday = i === 0;
      const isYesterday = i === 1;

      let label = isToday
        ? 'Today'
        : isYesterday
          ? 'Yesterday'
          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      chips.push({ label, dateStr, isToday });
    }
    return chips;
  }, []);

  // 1. Fetch Teacher's Assigned Classes
  const { data: myClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['teacher-assigned-classes-rollcall'],
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

  // Auto-select first class when classes load
  useEffect(() => {
    if (myClasses.length > 0 && !selectedClassId) {
      const firstId = (myClasses[0]._id || myClasses[0].id).toString();
      setSelectedClassId(firstId);
    }
  }, [myClasses, selectedClassId]);

  // 2. Fetch Class Students
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    refetch: refetchStudents,
    isRefetching: isRefetchingStudents,
  } = useQuery({
    queryKey: ['teacher-class-students-rollcall', selectedClassId],
    enabled: Boolean(selectedClassId),
    queryFn: async () => {
      const res = await apiClient.get('/teachers/students', { params: { classId: selectedClassId } });
      return res.data;
    },
  });

  // 3. Fetch Existing Attendance Records for Selected Class and Selected Date
  const { data: existingAttendance = [], isFetching: isFetchingExistingAttendance } = useQuery({
    queryKey: ['teacher-class-existing-attendance', selectedClassId, selectedDate],
    enabled: Boolean(selectedClassId) && Boolean(selectedDate),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/teachers/attendance', {
          params: { classId: selectedClassId, date: selectedDate },
        }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  const isAttendanceSubmitted = existingAttendance.length > 0;
  const isPastDate = selectedDate < todayStr;
  const isFutureDate = selectedDate > todayStr;
  const isLocked = (isAttendanceSubmitted || isPastDate || isFutureDate) && !isAdmin;

  const studentsList = useMemo(() => {
    const data = studentsResponse;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [studentsResponse]);

  // Initialize or merge attendance records state
  useEffect(() => {
    if (studentsList.length > 0) {
      const map: Record<string, { status: AttendanceStatus; remark: string }> = {};

      studentsList.forEach((st: any) => {
        const stId = (st._id || st.id).toString();
        const found = existingAttendance.find(
          (att: any) => (att.studentId?._id || att.studentId || '').toString() === stId
        );
        if (found) {
          map[stId] = {
            status: (found.status || 'present').toLowerCase() as AttendanceStatus,
            remark: found.remark || '',
          };
        } else {
          // If attendance was never submitted for this date (e.g. past date with no records), mark as 'unmarked'
          const defaultStatus: AttendanceStatus = isAttendanceSubmitted || !isPastDate ? 'present' : 'unmarked';
          map[stId] = {
            status: defaultStatus,
            remark: '',
          };
        }
      });

      setAttendanceRecords(map);
      setHasChanges(false);
    }
  }, [studentsList, existingAttendance, isAttendanceSubmitted, isPastDate]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    return studentsList.filter((st: any) => {
      const name = (st.fullName || st.name || `${st.firstName || ''} ${st.lastName || ''}`).toLowerCase();
      const adm = (st.admissionNumber || st.regNumber || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return !q || name.includes(q) || adm.includes(q);
    });
  }, [studentsList, searchQuery]);

  // Attendance Metrics Summary
  const metrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    Object.values(attendanceRecords).forEach((rec) => {
      if (rec.status === 'present') present++;
      else if (rec.status === 'absent') absent++;
      else if (rec.status === 'late') late++;
      else unmarked++;
    });

    return {
      total: studentsList.length,
      present,
      absent,
      late,
      unmarked,
    };
  }, [attendanceRecords, studentsList]);

  const showLockAlert = () => {
    if (isPastDate) {
      Alert.alert(
        'Past Date Locked 🔒',
        'Teachers cannot mark or modify student attendance for past dates. Contact a School Administrator to update past records.'
      );
    } else if (isFutureDate) {
      Alert.alert(
        'Future Date Locked 🔒',
        'Attendance cannot be marked for future dates.'
      );
    } else {
      Alert.alert(
        'Roll Call Saved & Locked 🔒',
        'Attendance for today has already been saved and locked. Only a School Administrator can alter locked records.'
      );
    }
  };

  // Status Toggle Handler
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) {
      showLockAlert();
      return;
    }
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setHasChanges(true);
  };

  // Batch Action: Mark All Present
  const handleMarkAllPresent = () => {
    if (isLocked) {
      showLockAlert();
      return;
    }
    setAttendanceRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: 'present' };
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Batch Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    if (isLocked) {
      showLockAlert();
      return;
    }
    setAttendanceRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: 'absent' };
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Submit Roll Call Mutation
  const submitAttendanceMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remark: data.remark,
      }));

      const payload = {
        classId: selectedClassId,
        date: selectedDate,
        records,
      };

      const res = await apiClient.post('/teachers/attendance/batch', payload);
      return res.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      Alert.alert('Roll Call Saved & Locked', `Attendance for ${selectedClassName} on ${selectedDate} has been saved.`);
      queryClient.invalidateQueries({ queryKey: ['teacher-class-existing-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['admin-classes-attendance-summary'] });
    },
    onError: (err: any) => {
      Alert.alert('Submission Error', err.response?.data?.message || 'Failed to save attendance roll call.');
    },
  });

  const selectedClassName = useMemo(() => {
    const found = myClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    return found ? formatClassLabel(found) : 'Selected Class';
  }, [myClasses, selectedClassId]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return 'Today';
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return selectedDate;
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={styles.title}>Student Roll Call</ThemedText>
            {isLocked && <Lock size={14} color="#f87171" />}
            {isAttendanceSubmitted && isAdmin && <Unlock size={14} color="#4ade80" />}
          </View>
          <ThemedText style={styles.sub}>{selectedClassName} • {formattedSelectedDate}</ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (isLocked || !hasChanges) && { opacity: 0.5 }]}
          disabled={isLocked || !hasChanges || submitAttendanceMutation.isPending}
          onPress={() => submitAttendanceMutation.mutate()}
        >
          {submitAttendanceMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              {isLocked ? <Lock size={14} color="#ffffff" /> : <Save size={16} color="#ffffff" />}
              <ThemedText style={styles.saveBtnText}>{isLocked ? 'Locked' : 'Save'}</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetchingStudents || isFetchingExistingAttendance} onRefresh={refetchStudents} tintColor="#38bdf8" />}
      >
        {/* Immutability Banner: Past Date - No Attendance Recorded */}
        {isPastDate && !isAttendanceSubmitted && (
          <View style={styles.warningBanner}>
            <CalendarIcon size={18} color="#fbbf24" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.warningBannerTitle}>No Attendance Recorded ⚠️</ThemedText>
              <ThemedText style={styles.warningBannerSub}>
                No roll call attendance was taken for {selectedClassName} on {formattedSelectedDate}. Past date attendance cannot be marked by teachers.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Immutability Banner: Past Date - Attendance WAS Recorded & Locked */}
        {isPastDate && isAttendanceSubmitted && !isAdmin && (
          <View style={styles.lockBanner}>
            <Lock size={18} color="#f87171" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.lockBannerTitle}>Past Date Attendance Record (Locked) 🔒</ThemedText>
              <ThemedText style={styles.lockBannerSub}>
                Showing saved attendance record for {selectedClassName} on {formattedSelectedDate}. Roll call for past dates is locked.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Immutability Banner: Future Date Attendance Locked */}
        {isFutureDate && !isAdmin && (
          <View style={styles.lockBanner}>
            <Lock size={18} color="#f87171" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.lockBannerTitle}>Future Date Attendance Locked 🔒</ThemedText>
              <ThemedText style={styles.lockBannerSub}>
                Attendance cannot be marked for future dates ({formattedSelectedDate}).
              </ThemedText>
            </View>
          </View>
        )}

        {/* Immutability Banner: Today's Roll Call Saved & Locked for Teachers */}
        {!isPastDate && !isFutureDate && isAttendanceSubmitted && !isAdmin && (
          <View style={styles.lockBanner}>
            <Lock size={18} color="#f87171" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.lockBannerTitle}>Attendance Roll Call Locked 🔒</ThemedText>
              <ThemedText style={styles.lockBannerSub}>
                Attendance for {selectedClassName} on {formattedSelectedDate} has already been saved and locked.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Immutability Banner: Admin Override Enabled */}
        {isAttendanceSubmitted && isAdmin && (
          <View style={styles.adminBanner}>
            <ShieldAlert size={18} color="#4ade80" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.adminBannerTitle}>Administrator Override Unlocked 🔓</ThemedText>
              <ThemedText style={styles.adminBannerSub}>
                As a School Administrator, you have authorization to modify attendance records for any date.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Class Selection Pills Banner */}
        <ThemedView style={styles.classSelectorCard}>
          <View style={styles.classSelectorHeader}>
            <Layers size={18} color="#38bdf8" />
            <ThemedText style={styles.classSelectorTitle}>
              SELECT CLASS ({myClasses.length})
            </ThemedText>
          </View>

          {isLoadingClasses ? (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 10 }} />
          ) : myClasses.length === 0 ? (
            <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>No assigned classes found.</ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classPillsRow}>
              {myClasses.map((cls: any) => {
                const cId = (cls._id || cls.id).toString();
                const isSelected = selectedClassId === cId;
                const fullLabel = formatClassLabel(cls);
                return (
                  <TouchableOpacity
                    key={cId}
                    activeOpacity={0.8}
                    style={[styles.classPillBtn, isSelected && styles.classPillBtnActive]}
                    onPress={() => setSelectedClassId(cId)}
                  >
                    {isSelected && <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />}
                    <ThemedText style={[styles.classPillBtnText, isSelected && styles.classPillBtnTextActive]}>
                      {fullLabel}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ThemedView>

        {/* Date Selection Filter Banner */}
        <ThemedView style={styles.dateSelectorCard}>
          <View style={styles.classSelectorHeader}>
            <CalendarIcon size={18} color="#38bdf8" />
            <ThemedText style={styles.classSelectorTitle}>
              ATTENDANCE DATE FILTER
            </ThemedText>
          </View>

          {/* Quick Date Pills Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classPillsRow}>
            {quickDateChips.map((chip) => {
              const isSel = selectedDate === chip.dateStr;
              return (
                <TouchableOpacity
                  key={chip.dateStr}
                  style={[styles.datePillBtn, isSel && styles.datePillBtnActive]}
                  onPress={() => setSelectedDate(chip.dateStr)}
                >
                  <ThemedText style={[styles.datePillText, isSel && styles.datePillTextActive]}>
                    {chip.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Arbitrary Calendar DatePicker Field */}
          <DatePickerField
            label="SELECT SPECIFIC DATE:"
            value={selectedDate}
            onChange={(newDate) => setSelectedDate(newDate)}
          />
        </ThemedView>

        {/* Real-time Summary Metrics Bar */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryNum}>{metrics.total}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Total</ThemedText>
          </View>
          <View style={[styles.summaryCard, { borderColor: 'rgba(74, 222, 128, 0.3)' }]}>
            <ThemedText style={[styles.summaryNum, { color: '#4ade80' }]}>{metrics.present}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Present</ThemedText>
          </View>
          <View style={[styles.summaryCard, { borderColor: 'rgba(248, 113, 113, 0.3)' }]}>
            <ThemedText style={[styles.summaryNum, { color: '#f87171' }]}>{metrics.absent}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Absent</ThemedText>
          </View>
          {metrics.unmarked > 0 ? (
            <View style={[styles.summaryCard, { borderColor: 'rgba(148, 163, 184, 0.3)' }]}>
              <ThemedText style={[styles.summaryNum, { color: '#94a3b8' }]}>{metrics.unmarked}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Not Taken</ThemedText>
            </View>
          ) : (
            <View style={[styles.summaryCard, { borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
              <ThemedText style={[styles.summaryNum, { color: '#fbbf24' }]}>{metrics.late}</ThemedText>
              <ThemedText style={styles.summaryLabel}>Late</ThemedText>
            </View>
          )}
        </View>

        {/* Batch Actions Bar */}
        <View style={styles.batchActionsRow}>
          <TouchableOpacity
            disabled={isLocked}
            style={[styles.batchBtnSuccess, isLocked && { opacity: 0.5 }]}
            onPress={handleMarkAllPresent}
          >
            <CheckCheck size={14} color="#4ade80" />
            <ThemedText style={styles.batchBtnSuccessText}>Mark All Present</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isLocked}
            style={[styles.batchBtnDanger, isLocked && { opacity: 0.5 }]}
            onPress={handleMarkAllAbsent}
          >
            <XCircle size={14} color="#f87171" />
            <ThemedText style={styles.batchBtnDangerText}>Mark All Absent</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${selectedClassName} students (${formattedSelectedDate})...`}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Student Roll Call List */}
        {isLoadingStudents || isFetchingExistingAttendance ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : filteredStudents.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <UserCheck size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Students in {selectedClassName}</ThemedText>
            <ThemedText style={styles.emptySub}>No student records found to mark roll call.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredStudents.map((st: any) => {
              const stId = (st._id || st.id).toString();
              const name = st.fullName || st.name || `${st.firstName || ''} ${st.lastName || ''}`;
              const adm = st.admissionNumber || st.regNumber || 'N/A';
              const currentRec = attendanceRecords[stId] || { status: 'unmarked', remark: '' };

              return (
                <ThemedView key={stId} style={styles.rollCallCard}>
                  <View style={styles.studentInfoRow}>
                    <View style={styles.avatarBox}>
                      <ThemedText style={styles.avatarText}>
                        {(name || 'S').charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.studentName}>{name}</ThemedText>
                      <ThemedText style={styles.studentSub}>Adm: {adm}</ThemedText>
                    </View>

                    <Badge
                      label={
                        currentRec.status === 'present'
                          ? 'PRESENT'
                          : currentRec.status === 'absent'
                            ? 'ABSENT'
                            : currentRec.status === 'late'
                              ? 'LATE'
                              : 'NOT TAKEN'
                      }
                      variant={
                        currentRec.status === 'present'
                          ? 'success'
                          : currentRec.status === 'absent'
                            ? 'danger'
                            : currentRec.status === 'late'
                              ? 'warning'
                              : 'neutral'
                      }
                      size="sm"
                    />
                  </View>

                  {/* 3 Status Toggle Buttons */}
                  <View style={styles.toggleButtonsRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isLocked}
                      style={[
                        styles.statusBtn,
                        currentRec.status === 'present' && styles.statusBtnPresentActive,
                        isLocked && { opacity: 0.6 },
                      ]}
                      onPress={() => handleStatusChange(stId, 'present')}
                    >
                      <UserCheck size={14} color={currentRec.status === 'present' ? '#ffffff' : '#4ade80'} />
                      <ThemedText style={[
                        styles.statusBtnText,
                        { color: currentRec.status === 'present' ? '#ffffff' : '#4ade80' }
                      ]}>
                        PRESENT
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isLocked}
                      style={[
                        styles.statusBtn,
                        currentRec.status === 'absent' && styles.statusBtnAbsentActive,
                        isLocked && { opacity: 0.6 },
                      ]}
                      onPress={() => handleStatusChange(stId, 'absent')}
                    >
                      <UserX size={14} color={currentRec.status === 'absent' ? '#ffffff' : '#f87171'} />
                      <ThemedText style={[
                        styles.statusBtnText,
                        { color: currentRec.status === 'absent' ? '#ffffff' : '#f87171' }
                      ]}>
                        ABSENT
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isLocked}
                      style={[
                        styles.statusBtn,
                        currentRec.status === 'late' && styles.statusBtnLateActive,
                        isLocked && { opacity: 0.6 },
                      ]}
                      onPress={() => handleStatusChange(stId, 'late')}
                    >
                      <Clock size={14} color={currentRec.status === 'late' ? '#ffffff' : '#fbbf24'} />
                      <ThemedText style={[
                        styles.statusBtnText,
                        { color: currentRec.status === 'late' ? '#ffffff' : '#fbbf24' }
                      ]}>
                        LATE
                      </ThemedText>
                    </TouchableOpacity>
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
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  content: { padding: 16, gap: 14 },

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  lockBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#f87171' },
  lockBannerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 16 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  warningBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#fbbf24' },
  warningBannerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 16 },

  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  adminBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#4ade80' },
  adminBannerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 16 },

  classSelectorCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  dateSelectorCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  classSelectorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  classSelectorTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  classPillsRow: { gap: 8, paddingVertical: 2 },
  classPillBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  classPillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  classPillBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  classPillBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },

  datePillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  datePillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  datePillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  datePillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  summaryNum: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  batchActionsRow: { flexDirection: 'row', gap: 8 },
  batchBtnSuccess: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(74, 222, 128, 0.12)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)' },
  batchBtnSuccessText: { color: '#4ade80', fontSize: 12, fontWeight: 'bold' },
  batchBtnDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(248, 113, 113, 0.12)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)' },
  batchBtnDangerText: { color: '#f87171', fontSize: 12, fontWeight: 'bold' },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  rollCallCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  studentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  studentSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  toggleButtonsRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  statusBtnPresentActive: { backgroundColor: '#22c55e', borderColor: '#4ade80' },
  statusBtnAbsentActive: { backgroundColor: '#ef4444', borderColor: '#f87171' },
  statusBtnLateActive: { backgroundColor: '#f59e0b', borderColor: '#fbbf24' },
  statusBtnText: { fontSize: 11, fontWeight: 'bold' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
