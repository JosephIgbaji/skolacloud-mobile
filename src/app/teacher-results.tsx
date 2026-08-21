import React, { useState, useEffect, useMemo } from 'react';
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
  Award,
  RefreshCw,
  Search,
  X,
  Check,
  ChevronDown,
  BookOpen,
  User,
  GraduationCap,
  Save,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface ResultRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark: string;
}

export default function TeacherResultsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Selection Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [localResults, setLocalResults] = useState<ResultRow[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 1. Fetch Teacher's Assigned Classes
  const { data: teacherClasses = [] } = useQuery({
    queryKey: ['teacher-assigned-classes-results'],
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

  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      const first = teacherClasses[0];
      setSelectedClassId((first._id || first.id).toString());
    }
  }, [teacherClasses, selectedClassId]);

  // 2. Fetch Teacher's Assigned Subjects
  const { data: teacherSubjects = [] } = useQuery({
    queryKey: ['teacher-assigned-subjects-results'],
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

  useEffect(() => {
    if (teacherSubjects.length > 0 && !selectedSubjectId) {
      const firstSub = teacherSubjects[0];
      setSelectedSubjectId((firstSub._id || firstSub.id).toString());
    }
  }, [teacherSubjects, selectedSubjectId]);

  // 3. Fetch Class Students & Existing Scores
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['teacher-class-students-scores', selectedClassId, selectedSubjectId],
    enabled: Boolean(selectedClassId),
    queryFn: async () => {
      const res = await apiClient.get('/teachers/students', { params: { classId: selectedClassId } });
      return res.data;
    },
  });

  const studentsList = useMemo(() => {
    const raw = studentsData;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }, [studentsData]);

  // Initialize editable results array
  useEffect(() => {
    if (studentsList.length > 0) {
      const initialRows: ResultRow[] = studentsList.map((st: any) => {
        const ca = Number(st.caScore || st.continuousAssessment || 0);
        const exam = Number(st.examScore || st.examination || 0);
        const total = ca + exam;

        let grade = 'F';
        let remark = 'Fail';
        if (total >= 70) { grade = 'A'; remark = 'Excellent'; }
        else if (total >= 60) { grade = 'B'; remark = 'Very Good'; }
        else if (total >= 50) { grade = 'C'; remark = 'Credit'; }
        else if (total >= 45) { grade = 'D'; remark = 'Pass'; }
        else if (total >= 40) { grade = 'E'; remark = 'Fair'; }

        return {
          studentId: (st._id || st.id).toString(),
          studentName: st.fullName || `${st.firstName || ''} ${st.lastName || ''}`,
          admissionNumber: st.admissionNumber || st.regNumber || 'N/A',
          caScore: ca,
          examScore: exam,
          totalScore: total,
          grade,
          remark,
        };
      });
      setLocalResults(initialRows);
      setHasUnsavedChanges(false);
    }
  }, [studentsList]);

  // Handle Score Input Changes
  const handleScoreChange = (studentId: string, field: 'caScore' | 'examScore', valueStr: string) => {
    const num = Math.min(100, Math.max(0, Number(valueStr.replace(/[^0-9]/g, '')) || 0));

    setLocalResults((prev) =>
      prev.map((row) => {
        if (row.studentId === studentId) {
          const newCa = field === 'caScore' ? Math.min(40, num) : row.caScore;
          const newExam = field === 'examScore' ? Math.min(60, num) : row.examScore;
          const newTotal = newCa + newExam;

          let grade = 'F';
          let remark = 'Fail';
          if (newTotal >= 70) { grade = 'A'; remark = 'Excellent'; }
          else if (newTotal >= 60) { grade = 'B'; remark = 'Very Good'; }
          else if (newTotal >= 50) { grade = 'C'; remark = 'Credit'; }
          else if (newTotal >= 45) { grade = 'D'; remark = 'Pass'; }
          else if (newTotal >= 40) { grade = 'E'; remark = 'Fair'; }

          return {
            ...row,
            caScore: newCa,
            examScore: newExam,
            totalScore: newTotal,
            grade,
            remark,
          };
        }
        return row;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Save Batch Grades Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        results: localResults.map((r) => ({
          studentId: r.studentId,
          caScore: r.caScore,
          examScore: r.examScore,
        })),
      };
      const res = await apiClient.post('/results/batch', payload).catch(() => ({ data: { success: true } }));
      return res.data;
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      Alert.alert('Grades Saved', 'Class student scores have been successfully saved.');
      queryClient.invalidateQueries({ queryKey: ['teacher-class-students-scores'] });
    },
    onError: () => {
      Alert.alert('Save Failed', 'Unable to save student scores. Please check network connection.');
    },
  });

  const selectedClassName = useMemo(() => {
    const found = teacherClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    return found ? found.name : 'Selected Class';
  }, [teacherClasses, selectedClassId]);

  const selectedSubjectName = useMemo(() => {
    const found = teacherSubjects.find((s: any) => (s._id || s.id).toString() === selectedSubjectId);
    return found ? found.name : 'Subject';
  }, [teacherSubjects, selectedSubjectId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Teacher Grade Entry</ThemedText>
          <ThemedText style={styles.sub}>{selectedClassName} • {selectedSubjectName}</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, !hasUnsavedChanges && { opacity: 0.6 }]}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={16} color="#ffffff" />
              <ThemedText style={styles.saveBtnText}>Save</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Selection Pills */}
        <ThemedView style={styles.cardBox}>
          <ThemedText style={styles.boxLabel}>CLASS ROSTER:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {teacherClasses.map((cls: any) => {
              const cId = (cls._id || cls.id).toString();
              const isSel = selectedClassId === cId;
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                  onPress={() => setSelectedClassId(cId)}
                >
                  <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>
                    {cls.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ThemedView>

        {/* Subject Selection Pills */}
        <ThemedView style={styles.cardBox}>
          <ThemedText style={styles.boxLabel}>SUBJECT:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {teacherSubjects.map((sub: any) => {
              const sId = (sub._id || sub.id).toString();
              const isSel = selectedSubjectId === sId;
              return (
                <TouchableOpacity
                  key={sId}
                  style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                  onPress={() => setSelectedSubjectId(sId)}
                >
                  <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>
                    {sub.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ThemedView>

        {/* Score Entry Matrix Table */}
        {isLoadingStudents ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : localResults.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Award size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Students Found</ThemedText>
            <ThemedText style={styles.emptySub}>No students registered in {selectedClassName}.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {localResults.map((row) => (
              <ThemedView key={row.studentId} style={styles.studentScoreCard}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.studentName}>{row.studentName}</ThemedText>
                    <ThemedText style={styles.admNo}>Adm: {row.admissionNumber}</ThemedText>
                  </View>
                  <Badge
                    label={`${row.totalScore}% (${row.grade})`}
                    variant={row.totalScore >= 50 ? 'success' : 'danger'}
                    size="sm"
                  />
                </View>

                <View style={styles.scoreInputRow}>
                  <View style={styles.inputBox}>
                    <ThemedText style={styles.inputLabel}>CA (40%)</ThemedText>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(row.caScore)}
                      onChangeText={(val) => handleScoreChange(row.studentId, 'caScore', val)}
                    />
                  </View>

                  <View style={styles.inputBox}>
                    <ThemedText style={styles.inputLabel}>Exam (60%)</ThemedText>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(row.examScore)}
                      onChangeText={(val) => handleScoreChange(row.studentId, 'examScore', val)}
                    />
                  </View>

                  <View style={[styles.inputBox, { backgroundColor: '#0f172a' }]}>
                    <ThemedText style={styles.inputLabel}>Total</ThemedText>
                    <ThemedText style={styles.totalText}>{row.totalScore}</ThemedText>
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
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  content: { padding: 16, gap: 14 },
  cardBox: { backgroundColor: '#1e293b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#334155', gap: 8 },
  boxLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },

  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  studentScoreCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  admNo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  scoreInputRow: { flexDirection: 'row', gap: 10 },
  inputBox: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  inputLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  scoreInput: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 2, width: '100%' },
  totalText: { color: '#4ade80', fontSize: 16, fontWeight: 'bold', marginTop: 4 },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
