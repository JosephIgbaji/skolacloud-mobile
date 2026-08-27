import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Award,
  RefreshCw,
  Search,
  Check,
  BookOpen,
  User,
  GraduationCap,
  Save,
  Layers,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Users,
  Lock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export type ResultEntryMode = 'subject' | 'broadsheet';

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

interface BroadsheetSubjectScore {
  subjectId: string;
  subjectName: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
}

interface BroadsheetRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  subjects: BroadsheetSubjectScore[];
  averageScore: number;
  totalScore: number;
  classTeacherRemark: string;
}

function calculateGradeAndRemark(totalScore: number): {
  grade: string;
  remark: string;
  variant: 'gold' | 'success' | 'info' | 'warning' | 'danger';
} {
  const total = Math.min(100, Math.max(0, totalScore));
  if (total >= 70) return { grade: 'A', remark: 'Excellent', variant: 'gold' };
  if (total >= 60) return { grade: 'B', remark: 'Very Good', variant: 'success' };
  if (total >= 50) return { grade: 'C', remark: 'Credit', variant: 'info' };
  if (total >= 45) return { grade: 'D', remark: 'Pass', variant: 'warning' };
  if (total >= 40) return { grade: 'E', remark: 'Fair', variant: 'warning' };
  return { grade: 'F', remark: 'Fail', variant: 'danger' };
}

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = (cls.name || '').trim();
  const grade = (cls.grade || '').trim();
  if (!grade) return name || 'Class';
  if (!name) return grade;
  if (name.toLowerCase().includes(grade.toLowerCase())) return name;
  if (name.length <= 2) return `${grade}${name}`;
  return `${grade} ${name}`;
}

export default function TeacherResultsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentUserId = (user?.id || (user as any)?._id || (user as any)?.teacherId || '').toString();

  // Mode Selection State ('subject' vs 'broadsheet')
  const [activeMode, setActiveMode] = useState<ResultEntryMode>('subject');

  // Filters State
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable State
  const [localResults, setLocalResults] = useState<ResultRow[]>([]);
  const [broadsheetRemarks, setBroadsheetRemarks] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 1. Fetch Academic Sessions
  const { data: sessionsList = [] } = useQuery({
    queryKey: ['teacher-sessions-list'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/teachers/sessions').catch(() => null);
        if (!res?.data) res = await apiClient.get('/admin/sessions').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select active session
  useEffect(() => {
    if (sessionsList.length > 0 && !selectedSessionId) {
      const active = sessionsList.find((s: any) => s.isCurrent || s.status === 'active') || sessionsList[0];
      setSelectedSessionId((active._id || active.id).toString());
    }
  }, [sessionsList, selectedSessionId]);

  // 2. Fetch Terms for Selected Session
  const { data: termsList = [] } = useQuery({
    queryKey: ['teacher-terms-list', selectedSessionId],
    enabled: Boolean(selectedSessionId),
    queryFn: async () => {
      try {
        let res = await apiClient.get('/teachers/terms', { params: { sessionId: selectedSessionId } }).catch(() => null);
        if (!res?.data) res = await apiClient.get('/admin/terms', { params: { sessionId: selectedSessionId } }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select active term
  useEffect(() => {
    if (termsList.length > 0 && !selectedTermId) {
      const active = termsList.find((t: any) => t.isCurrent || t.status === 'active') || termsList[0];
      setSelectedTermId((active._id || active.id).toString());
    }
  }, [termsList, selectedTermId]);

  // 3. Fetch Assigned Classes
  const { data: teacherClasses = [], isLoading: isLoadingClasses } = useQuery({
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

  // Check if current user is the primary assigned Class Teacher (Form Master) for selected class
  const isClassTeacher = useMemo(() => {
    if (!selectedClassId || !currentUserId) return false;
    const currentClassObj = teacherClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    if (!currentClassObj || !currentClassObj.teacherId) return false;

    const classTeacherId = typeof currentClassObj.teacherId === 'object'
      ? (currentClassObj.teacherId._id || currentClassObj.teacherId.id || '').toString()
      : currentClassObj.teacherId.toString();

    return classTeacherId === currentUserId;
  }, [teacherClasses, selectedClassId, currentUserId]);

  // Restrict mode: If not class teacher, revert activeMode to 'subject'
  useEffect(() => {
    if (!isClassTeacher && activeMode === 'broadsheet') {
      setActiveMode('subject');
    }
  }, [isClassTeacher, activeMode]);

  const handleSelectBroadsheetMode = () => {
    if (!isClassTeacher) {
      Alert.alert(
        'Form Master Access Only 🔒',
        `Only the designated Class Teacher (Form Master) for ${selectedClassName} is authorized to access the Master Broadsheet and record terminal remarks.`
      );
      return;
    }
    setActiveMode('broadsheet');
  };

  // 4. Fetch Assigned Subjects
  const { data: teacherSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['teacher-assigned-subjects-results'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subjects', { params: { limit: 100 } }).catch(() => null);
        const raw = res?.data;
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

  // 5. Fetch Class Results for Subject Mode
  const {
    data: existingClassResults = [],
    isLoading: isLoadingResults,
    refetch: refetchResults,
    isRefetching: isRefetchingResults,
  } = useQuery({
    queryKey: ['teacher-class-subject-results', selectedClassId, selectedSubjectId, selectedSessionId, selectedTermId],
    enabled: Boolean(selectedClassId) && Boolean(selectedSubjectId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/teachers/results/class', {
          params: {
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            sessionId: selectedSessionId,
            termId: selectedTermId,
          },
        }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 6. Fetch Class Students (Fallback if no results exist yet)
  const { data: classStudentsData = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['teacher-class-students-list', selectedClassId],
    enabled: Boolean(selectedClassId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/teachers/students', { params: { classId: selectedClassId } }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Hydrate local results state when class, subject, session, or term changes
  useEffect(() => {
    const listToMap = existingClassResults.length > 0 ? existingClassResults : classStudentsData;

    if (listToMap.length > 0) {
      const rows: ResultRow[] = listToMap.map((item: any) => {
        const stId = (item.studentId?._id || item.studentId || item._id || item.id).toString();
        const name = item.studentName || item.fullName || `${item.firstName || ''} ${item.lastName || ''}`;
        const adm = item.admissionNumber || item.regNumber || 'N/A';

        const ca = Number(item.caScore || item.continuousAssessment || 0);
        const exam = Number(item.examScore || item.examination || 0);
        const total = ca + exam;
        const evalRes = calculateGradeAndRemark(total);

        return {
          studentId: stId,
          studentName: name,
          admissionNumber: adm,
          caScore: ca,
          examScore: exam,
          totalScore: total,
          grade: item.grade || evalRes.grade,
          remark: item.remark || evalRes.remark,
        };
      });

      setLocalResults(rows);
      setHasUnsavedChanges(false);
    } else {
      setLocalResults([]);
      setHasUnsavedChanges(false);
    }
  }, [existingClassResults, classStudentsData]);

  // Score Input Change Handler
  const handleScoreChange = (studentId: string, field: 'caScore' | 'examScore', valueStr: string) => {
    const parsed = Number(valueStr.replace(/[^0-9]/g, '')) || 0;

    setLocalResults((prev) =>
      prev.map((row) => {
        if (row.studentId === studentId) {
          const newCa = field === 'caScore' ? Math.min(40, parsed) : row.caScore;
          const newExam = field === 'examScore' ? Math.min(60, parsed) : row.examScore;
          const newTotal = newCa + newExam;
          const evalRes = calculateGradeAndRemark(newTotal);

          return {
            ...row,
            caScore: newCa,
            examScore: newExam,
            totalScore: newTotal,
            grade: evalRes.grade,
            remark: evalRes.remark,
          };
        }
        return row;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Custom Student Remark Change Handler
  const handleRemarkChange = (studentId: string, remarkStr: string) => {
    setLocalResults((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, remark: remarkStr } : row))
    );
    setHasUnsavedChanges(true);
  };

  // Filtered Students for Subject Entry Mode
  const filteredLocalResults = useMemo(() => {
    return localResults.filter((row) => {
      const name = row.studentName.toLowerCase();
      const adm = row.admissionNumber.toLowerCase();
      const q = searchQuery.toLowerCase();
      return !q || name.includes(q) || adm.includes(q);
    });
  }, [localResults, searchQuery]);

  // Class Summary Statistics Metrics
  const classStats = useMemo(() => {
    if (localResults.length === 0) {
      return { total: 0, avg: 0, highest: 0, lowest: 0, passRate: 0, gradedCount: 0 };
    }

    let sum = 0;
    let highest = 0;
    let lowest = 100;
    let passCount = 0;
    let gradedCount = 0;

    localResults.forEach((r) => {
      if (r.caScore > 0 || r.examScore > 0) gradedCount++;
      sum += r.totalScore;
      if (r.totalScore > highest) highest = r.totalScore;
      if (r.totalScore < lowest) lowest = r.totalScore;
      if (r.totalScore >= 50) passCount++;
    });

    const total = localResults.length;
    const avg = Math.round(sum / total);
    const passRate = Math.round((passCount / total) * 100);

    return {
      total,
      avg,
      highest: total > 0 ? highest : 0,
      lowest: total > 0 ? (lowest === 100 && sum === 0 ? 0 : lowest) : 0,
      passRate,
      gradedCount,
    };
  }, [localResults]);

  // Save Batch Results Mutation
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        sessionId: selectedSessionId,
        termId: selectedTermId,
        results: localResults.map((r) => ({
          studentId: r.studentId,
          caScore: r.caScore,
          examScore: r.examScore,
          totalScore: r.totalScore,
          grade: r.grade,
          remark: r.remark,
        })),
      };

      let res = await apiClient.post('/teachers/results/batch', payload).catch(() => null);
      if (!res?.data) res = await apiClient.post('/results/batch', payload).catch(() => null);
      return res?.data;
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      Alert.alert('Grades Saved 🎉', `Scores for ${selectedSubjectName} (${selectedClassName}) have been successfully saved.`);
      queryClient.invalidateQueries({ queryKey: ['teacher-class-subject-results'] });
    },
    onError: (err: any) => {
      Alert.alert('Save Error ❌', err.response?.data?.message || 'Failed to save student scores. Please check network connection.');
    },
  });

  // Selected Names for Subheaders
  const selectedClassName = useMemo(() => {
    const found = teacherClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    return found ? formatClassLabel(found) : 'Selected Class';
  }, [teacherClasses, selectedClassId]);

  const selectedSubjectName = useMemo(() => {
    const found = teacherSubjects.find((s: any) => (s._id || s.id).toString() === selectedSubjectId);
    return found ? found.name : 'Subject';
  }, [teacherSubjects, selectedSubjectId]);

  const selectedSessionName = useMemo(() => {
    const found = sessionsList.find((s: any) => (s._id || s.id).toString() === selectedSessionId);
    return found ? found.name : 'Current Session';
  }, [sessionsList, selectedSessionId]);

  const selectedTermName = useMemo(() => {
    const found = termsList.find((t: any) => (t._id || t.id).toString() === selectedTermId);
    return found ? found.name : 'Term';
  }, [termsList, selectedTermId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={18} color="#38bdf8" />
            <ThemedText style={styles.title}>Gradebook Workstation</ThemedText>
          </View>
          <ThemedText style={styles.sub} numberOfLines={1}>
            {selectedClassName} • {activeMode === 'subject' ? selectedSubjectName : 'Master Class Broadsheet'}
          </ThemedText>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!hasUnsavedChanges || saveBatchMutation.isPending) && { opacity: 0.5 }]}
          disabled={!hasUnsavedChanges || saveBatchMutation.isPending}
          onPress={() => saveBatchMutation.mutate()}
        >
          {saveBatchMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={16} color="#ffffff" />
              <ThemedText style={styles.saveBtnText}>{hasUnsavedChanges ? 'Save' : 'Saved'}</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetchingResults} onRefresh={refetchResults} tintColor="#38bdf8" />
        }
      >
        {/* Mode Switcher Segmented Control */}
        <View style={styles.modeSegmentContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.modeSegmentBtn, activeMode === 'subject' && styles.modeSegmentBtnActive]}
            onPress={() => setActiveMode('subject')}
          >
            <BookOpen size={15} color={activeMode === 'subject' ? '#ffffff' : '#94a3b8'} />
            <ThemedText style={[styles.modeSegmentText, activeMode === 'subject' && styles.modeSegmentTextActive]}>
              Subject Entry Mode
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeSegmentBtn,
              activeMode === 'broadsheet' && styles.modeSegmentBtnActive,
              !isClassTeacher && { opacity: 0.75 },
            ]}
            onPress={handleSelectBroadsheetMode}
          >
            {!isClassTeacher ? (
              <Lock size={14} color="#f87171" />
            ) : (
              <Award size={15} color={activeMode === 'broadsheet' ? '#ffffff' : '#94a3b8'} />
            )}
            <ThemedText style={[styles.modeSegmentText, activeMode === 'broadsheet' && styles.modeSegmentTextActive]}>
              Master Broadsheet {!isClassTeacher ? '🔒' : ''}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Academic Session & Term Filter Card */}
        <ThemedView style={styles.filterCard}>
          <View style={styles.filterHeaderRow}>
            <Calendar size={16} color="#38bdf8" />
            <ThemedText style={styles.filterHeaderTitle}>
              ACADEMIC PERIOD: {selectedSessionName} • {selectedTermName}
            </ThemedText>
          </View>

          {/* Sessions Row */}
          {sessionsList.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {sessionsList.map((ses: any) => {
                const sId = (ses._id || ses.id).toString();
                const isSel = selectedSessionId === sId;
                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.subPillBtn, isSel && styles.subPillBtnActive]}
                    onPress={() => setSelectedSessionId(sId)}
                  >
                    <ThemedText style={[styles.subPillText, isSel && styles.subPillTextActive]}>
                      {ses.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Terms Row */}
          {termsList.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {termsList.map((t: any) => {
                const tId = (t._id || t.id).toString();
                const isSel = selectedTermId === tId;
                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.termPillBtn, isSel && styles.termPillBtnActive]}
                    onPress={() => setSelectedTermId(tId)}
                  >
                    <ThemedText style={[styles.termPillText, isSel && styles.termPillTextActive]}>
                      {t.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ThemedView>

        {/* Class Selection Card */}
        <ThemedView style={styles.filterCard}>
          <View style={styles.filterHeaderRow}>
            <Layers size={16} color="#38bdf8" />
            <ThemedText style={styles.filterHeaderTitle}>
              SELECT CLASS ROSTER ({teacherClasses.length})
            </ThemedText>
          </View>

          {isLoadingClasses ? (
            <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 8 }} />
          ) : teacherClasses.length === 0 ? (
            <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>No assigned classes found.</ThemedText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {teacherClasses.map((cls: any) => {
                const cId = (cls._id || cls.id).toString();
                const isSel = selectedClassId === cId;
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.classPillBtn, isSel && styles.classPillBtnActive]}
                    onPress={() => setSelectedClassId(cId)}
                  >
                    {isSel && <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />}
                    <ThemedText style={[styles.classPillBtnText, isSel && styles.classPillBtnTextActive]}>
                      {formatClassLabel(cls)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ThemedView>

        {/* MODE 1: SUBJECT SCORE ENTRY */}
        {activeMode === 'subject' && (
          <>
            {/* Subject Selection Card */}
            <ThemedView style={styles.filterCard}>
              <View style={styles.filterHeaderRow}>
                <BookOpen size={16} color="#38bdf8" />
                <ThemedText style={styles.filterHeaderTitle}>
                  TEACHING SUBJECT ({teacherSubjects.length})
                </ThemedText>
              </View>

              {isLoadingSubjects ? (
                <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 8 }} />
              ) : teacherSubjects.length === 0 ? (
                <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>No subjects assigned.</ThemedText>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                  {teacherSubjects.map((sub: any) => {
                    const sId = (sub._id || sub.id).toString();
                    const isSel = selectedSubjectId === sId;
                    return (
                      <TouchableOpacity
                        key={sId}
                        style={[styles.classPillBtn, isSel && styles.classPillBtnActive]}
                        onPress={() => setSelectedSubjectId(sId)}
                      >
                        {isSel && <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />}
                        <ThemedText style={[styles.classPillBtnText, isSel && styles.classPillBtnTextActive]}>
                          {sub.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </ThemedView>

            {/* Class Performance Metrics Card */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <ThemedText style={styles.metricValue}>{classStats.total}</ThemedText>
                <ThemedText style={styles.metricLabel}>Total Pupils</ThemedText>
              </View>

              <View style={[styles.metricBox, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                <ThemedText style={[styles.metricValue, { color: '#38bdf8' }]}>{classStats.avg}%</ThemedText>
                <ThemedText style={styles.metricLabel}>Class Avg</ThemedText>
              </View>

              <View style={[styles.metricBox, { borderColor: 'rgba(74, 222, 128, 0.3)' }]}>
                <ThemedText style={[styles.metricValue, { color: '#4ade80' }]}>{classStats.highest}%</ThemedText>
                <ThemedText style={styles.metricLabel}>Highest</ThemedText>
              </View>

              <View style={[styles.metricBox, { borderColor: 'rgba(250, 204, 21, 0.3)' }]}>
                <ThemedText style={[styles.metricValue, { color: '#facc15' }]}>{classStats.passRate}%</ThemedText>
                <ThemedText style={styles.metricLabel}>Pass Rate</ThemedText>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchWrapper}>
              <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${selectedClassName} students in ${selectedSubjectName}...`}
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Student Result Entry Cards */}
            {isLoadingResults || isLoadingStudents ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : filteredLocalResults.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Award size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Student Records</ThemedText>
                <ThemedText style={styles.emptySub}>
                  No students found in {selectedClassName} for {selectedSubjectName}.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredLocalResults.map((row) => {
                  const evalRes = calculateGradeAndRemark(row.totalScore);
                  return (
                    <ThemedView key={row.studentId} style={styles.studentScoreCard}>
                      {/* Student Header */}
                      <View style={styles.rowHeader}>
                        <View style={styles.avatarBox}>
                          <ThemedText style={styles.avatarText}>
                            {(row.studentName || 'S').charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>

                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.studentName}>{row.studentName}</ThemedText>
                          <ThemedText style={styles.admNo}>Adm: {row.admissionNumber}</ThemedText>
                        </View>

                        <Badge
                          label={`${row.totalScore}% (${row.grade})`}
                          variant={evalRes.variant}
                          size="md"
                        />
                      </View>

                      {/* Score Inputs Row */}
                      <View style={styles.scoreInputRow}>
                        {/* CA Score (40%) */}
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

                        {/* Exam Score (60%) */}
                        <View style={styles.inputBox}>
                          <ThemedText style={styles.inputLabel}>EXAM (60%)</ThemedText>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={String(row.examScore)}
                            onChangeText={(val) => handleScoreChange(row.studentId, 'examScore', val)}
                          />
                        </View>

                        {/* Total Score */}
                        <View style={[styles.inputBox, { backgroundColor: '#0f172a' }]}>
                          <ThemedText style={styles.inputLabel}>TOTAL</ThemedText>
                          <ThemedText style={[styles.totalText, { color: evalRes.variant === 'danger' ? '#f87171' : '#4ade80' }]}>
                            {row.totalScore}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Remark Input */}
                      <View style={styles.remarkInputRow}>
                        <ThemedText style={styles.remarkLabel}>Remark:</ThemedText>
                        <TextInput
                          style={styles.remarkInput}
                          value={row.remark}
                          onChangeText={(text) => handleRemarkChange(row.studentId, text)}
                          placeholder="e.g. Excellent performance"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* MODE 2: MASTER CLASS BROADSHEET (CLASS TEACHER OVERVIEW) */}
        {activeMode === 'broadsheet' && (
          <View style={{ gap: 14 }}>
            {/* Broadsheet Info Banner */}
            <View style={styles.broadsheetInfoCard}>
              <Award size={20} color="#38bdf8" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.broadsheetInfoTitle}>Master Class Broadsheet</ThemedText>
                <ThemedText style={styles.broadsheetInfoSub}>
                  Overview of all subject scores & terminal class teacher remarks for {selectedClassName} ({selectedTermName}).
                </ThemedText>
              </View>
            </View>

            {/* Student Broadsheet Cards */}
            {isLoadingStudents ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : classStudentsData.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Users size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Class Students Found</ThemedText>
                <ThemedText style={styles.emptySub}>No students registered in {selectedClassName}.</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 12 }}>
                {classStudentsData.map((st: any) => {
                  const stId = (st._id || st.id).toString();
                  const name = st.fullName || `${st.firstName || ''} ${st.lastName || ''}`;
                  const adm = st.admissionNumber || st.regNumber || 'N/A';
                  const remark = broadsheetRemarks[stId] || '';

                  return (
                    <ThemedView key={stId} style={styles.broadsheetCard}>
                      <View style={styles.studentHeaderRow}>
                        <View style={styles.avatarBox}>
                          <ThemedText style={styles.avatarText}>
                            {(name || 'S').charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.studentName}>{name}</ThemedText>
                          <ThemedText style={styles.admNo}>Adm: {adm}</ThemedText>
                        </View>
                        <Badge label="Active Pupil" variant="info" size="sm" />
                      </View>

                      {/* Subjects Summary Badges */}
                      <View style={styles.broadsheetSubjectsBox}>
                        <ThemedText style={styles.broadsheetSubTitle}>Subject Allocations:</ThemedText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {teacherSubjects.map((sub: any) => (
                            <View key={sub._id || sub.id} style={styles.broadsheetSubjectBadge}>
                              <BookOpen size={12} color="#38bdf8" />
                              <ThemedText style={styles.broadsheetSubjectText}>{sub.name}</ThemedText>
                            </View>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Class Teacher Terminal Remark Field */}
                      <View style={styles.classTeacherRemarkBox}>
                        <ThemedText style={styles.classTeacherRemarkLabel}>Form Master Terminal Remark:</ThemedText>
                        <TextInput
                          style={styles.classTeacherRemarkInput}
                          value={remark}
                          placeholder="e.g. An outstanding result this term. Promoted to next class."
                          placeholderTextColor="#64748b"
                          multiline
                          onChangeText={(txt) => {
                            setBroadsheetRemarks((prev) => ({ ...prev, [stId]: txt }));
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </View>
                    </ThemedView>
                  );
                })}
              </View>
            )}
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

  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeSegmentBtnActive: {
    backgroundColor: '#0284c7',
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modeSegmentTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  filterCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterHeaderTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  pillsRow: { gap: 8, paddingVertical: 2 },
  classPillBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  classPillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  classPillBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  classPillBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },

  subPillBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  subPillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  subPillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  subPillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  termPillBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  termPillBtnActive: { backgroundColor: '#0369a1', borderColor: '#38bdf8' },
  termPillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  termPillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  metricsRow: { flexDirection: 'row', gap: 8 },
  metricBox: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  metricValue: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  metricLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  studentScoreCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  admNo: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  scoreInputRow: { flexDirection: 'row', gap: 10 },
  inputBox: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  inputLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  scoreInput: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 2, width: '100%' },
  totalText: { color: '#4ade80', fontSize: 16, fontWeight: 'bold', marginTop: 4 },

  remarkInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: '#334155' },
  remarkLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  remarkInput: { flex: 1, color: '#f8fafc', fontSize: 12 },

  broadsheetInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)', borderRadius: 14, padding: 14 },
  broadsheetInfoTitle: { fontSize: 14, fontWeight: 'bold', color: '#38bdf8' },
  broadsheetInfoSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 16 },

  broadsheetCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  studentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  broadsheetSubjectsBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155', gap: 6 },
  broadsheetSubTitle: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  broadsheetSubjectBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  broadsheetSubjectText: { fontSize: 11, color: '#f8fafc', fontWeight: '600' },

  classTeacherRemarkBox: { gap: 6 },
  classTeacherRemarkLabel: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },
  classTeacherRemarkInput: { backgroundColor: '#0f172a', borderRadius: 10, padding: 10, color: '#f8fafc', fontSize: 12, borderWidth: 1, borderColor: '#334155', minHeight: 48 },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
