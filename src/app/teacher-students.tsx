import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  GraduationCap,
  Search,
  RefreshCw,
  X,
  FileSpreadsheet,
  UserCheck,
  CheckCircle2,
  Phone,
  Layers,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

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

export default function TeacherStudentsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // 1. Fetch Teacher's Assigned Classes
  const { data: myClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['teacher-assigned-classes'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/teachers/classes').catch(() => null);
        let list = res?.data;
        if (list && typeof list === 'object' && Array.isArray(list.data)) list = list.data;
        if (list && typeof list === 'object' && Array.isArray(list.classes)) list = list.classes;
        if (!Array.isArray(list)) list = [];

        // Fallback to all classes if teacher has no explicit class assigned yet
        if (list.length === 0) {
          const fallbackRes = await apiClient.get('/teachers/classes/all').catch(() => null);
          let fallbackList = fallbackRes?.data;
          if (fallbackList && typeof fallbackList === 'object' && Array.isArray(fallbackList.data)) {
            fallbackList = fallbackList.data;
          }
          if (Array.isArray(fallbackList) && fallbackList.length > 0) return fallbackList;
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

  // 2. Fetch Students List strictly per selected class
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['teacher-students-list', selectedClassId],
    enabled: Boolean(selectedClassId) || myClasses.length === 0,
    queryFn: async () => {
      const params: any = {};
      if (selectedClassId) {
        params.classId = selectedClassId;
      }
      const res = await apiClient.get('/teachers/students', { params });
      return res.data;
    },
  });

  const rawStudents = useMemo(() => {
    const data = studentsResponse;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.students)) return data.students;
    return [];
  }, [studentsResponse]);

  // Client-side Search & Gender Filter
  const filteredStudents = useMemo(() => {
    return rawStudents.filter((student: any) => {
      const fullName = (student.fullName || student.name || `${student.firstName || ''} ${student.lastName || ''}`).toLowerCase();
      const admNo = (student.admissionNumber || student.regNumber || '').toLowerCase();
      const matchesSearch =
        !searchQuery ||
        fullName.includes(searchQuery.toLowerCase()) ||
        admNo.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (genderFilter === 'male') {
        return (student.gender || '').toLowerCase() === 'male' || (student.gender || '').toLowerCase() === 'm';
      }
      if (genderFilter === 'female') {
        return (student.gender || '').toLowerCase() === 'female' || (student.gender || '').toLowerCase() === 'f';
      }

      return true;
    });
  }, [rawStudents, searchQuery, genderFilter]);

  const handleCallParent = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', 'Parent contact phone number is not available.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const selectedClassName = useMemo(() => {
    const found = myClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    return found ? formatClassLabel(found) : 'Selected Class';
  }, [myClasses, selectedClassId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Teacher Workspace Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Teacher Workstation</ThemedText>
          <ThemedText style={styles.sub}>
            Assigned Roster: {selectedClassName}
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />}
      >
        {/* Class Selector Card Banner */}
        <ThemedView style={styles.classSelectorCard}>
          <View style={styles.classSelectorHeader}>
            <Layers size={18} color="#38bdf8" />
            <ThemedText style={styles.classSelectorTitle}>
              MY ASSIGNED CLASSES ({myClasses.length})
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

          <ThemedText style={styles.classSelectorSubText}>
            Tap an assigned class pill above to display its student roster.
          </ThemedText>
        </ThemedView>

        {/* Search & Gender Filter Row */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${selectedClassName} students...`}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Gender Filter Pills */}
        <View style={styles.genderRow}>
          {(['all', 'male', 'female'] as const).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, genderFilter === g && styles.genderBtnActive]}
              onPress={() => setGenderFilter(g)}
            >
              <ThemedText style={[styles.genderBtnText, genderFilter === g && styles.genderBtnTextActive]}>
                {g.toUpperCase()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Students Roster List */}
        {isLoadingStudents ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : filteredStudents.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <GraduationCap size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Students in {selectedClassName}</ThemedText>
            <ThemedText style={styles.emptySub}>
              {searchQuery
                ? 'No student matches your search query.'
                : `No enrolled students found in ${selectedClassName}.`}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.countRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#4ade80" />
                <ThemedText style={styles.countText}>
                  {selectedClassName} • {filteredStudents.length} Enrolled {filteredStudents.length === 1 ? 'Student' : 'Students'}
                </ThemedText>
              </View>
            </View>

            {filteredStudents.map((student: any) => {
              const studentName =
                student.fullName || student.name || `${student.firstName || ''} ${student.lastName || ''}`;
              const className = (student.classId as any)?.name || student.className || selectedClassName;
              const parentPhone = student.parentPhone || student.guardianPhone || student.phone;

              return (
                <ThemedView key={student._id || student.id} style={styles.studentCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarBox}>
                      <ThemedText style={styles.avatarText}>
                        {(studentName || 'S').charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.studentName}>{studentName}</ThemedText>
                      <ThemedText style={styles.studentSubText}>
                        Reg No: {student.admissionNumber || student.regNumber || 'N/A'} • {className}
                      </ThemedText>
                    </View>

                    <Badge
                      label={(student.gender || 'Student').toUpperCase()}
                      variant="info"
                      size="sm"
                    />
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push('/attendance')}
                    >
                      <UserCheck size={14} color="#4ade80" />
                      <ThemedText style={[styles.actionBtnText, { color: '#4ade80' }]}>Attendance</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push('/results')}
                    >
                      <FileSpreadsheet size={14} color="#fbbf24" />
                      <ThemedText style={[styles.actionBtnText, { color: '#fbbf24' }]}>Grades</ThemedText>
                    </TouchableOpacity>

                    {parentPhone ? (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleCallParent(parentPhone)}
                      >
                        <Phone size={14} color="#38bdf8" />
                        <ThemedText style={[styles.actionBtnText, { color: '#38bdf8' }]}>Call Parent</ThemedText>
                      </TouchableOpacity>
                    ) : null}
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },

  content: { padding: 16, gap: 14 },

  classSelectorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  classSelectorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  classSelectorTitle: { fontSize: 12, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  classSelectorSubText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  classPillsRow: { gap: 8, paddingVertical: 4 },
  classPillBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  classPillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  classPillBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  classPillBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 6, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  genderBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  genderBtnText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  genderBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countText: { fontSize: 13, color: '#4ade80', fontWeight: 'bold' },

  studentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  studentSubText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  cardDivider: { height: 1, backgroundColor: '#334155' },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  actionBtnText: { fontSize: 11, fontWeight: 'bold' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
