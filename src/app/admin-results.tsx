import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  X,
  Check,
  Search,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

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

function calculateGradeAndRemark(totalScore: number): { grade: string; remark: string } {
  if (totalScore >= 70) return { grade: 'A', remark: 'Excellent' };
  if (totalScore >= 60) return { grade: 'B', remark: 'Very Good' };
  if (totalScore >= 50) return { grade: 'C', remark: 'Good' };
  if (totalScore >= 45) return { grade: 'D', remark: 'Pass' };
  if (totalScore >= 40) return { grade: 'E', remark: 'Fair Pass' };
  return { grade: 'F', remark: 'Fail' };
}

function getGradeBadgeVariant(totalScore: number): 'gold' | 'success' | 'info' | 'warning' | 'danger' {
  if (totalScore >= 70) return 'gold';
  if (totalScore >= 60) return 'success';
  if (totalScore >= 50) return 'info';
  if (totalScore >= 40) return 'warning';
  return 'danger';
}

export default function AdminResultsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active Workstation Mode: 'subject' | 'broadsheet'
  const [activeMode, setActiveMode] = useState<'subject' | 'broadsheet'>('subject');

  // Filter Criteria
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local Editable Scores State & Dirty Tracking
  const [localResults, setLocalResults] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // 1. Fetch Academic Sessions
  const { data: sessionsList = [] } = useQuery({
    queryKey: ['admin-results-sessions'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/admin/sessions').catch(() => null);
        if (!res?.data) res = await apiClient.get('/teachers/sessions').catch(() => null);
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
    if (sessionsList.length > 0 && !selectedSessionId) {
      const active = sessionsList.find((s: any) => s.isCurrent || s.status === 'active') || sessionsList[0];
      setSelectedSessionId((active._id || active.id).toString());
    }
  }, [sessionsList, selectedSessionId]);

  // 2. Fetch Academic Terms
  const { data: termsList = [] } = useQuery({
    queryKey: ['admin-results-terms', selectedSessionId],
    enabled: Boolean(selectedSessionId),
    queryFn: async () => {
      try {
        let res = await apiClient.get('/admin/terms', { params: { sessionId: selectedSessionId } }).catch(() => null);
        if (!res?.data) res = await apiClient.get('/teachers/terms', { params: { sessionId: selectedSessionId } }).catch(() => null);
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
    if (termsList.length > 0 && !selectedTermId) {
      const active = termsList.find((t: any) => t.isCurrent || t.status === 'active') || termsList[0];
      setSelectedTermId((active._id || active.id).toString());
    }
  }, [termsList, selectedTermId]);

  // 3. Fetch Classes List
  const { data: allClasses = [] } = useQuery({
    queryKey: ['admin-results-classes'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/classes');
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
    if (allClasses.length > 0 && !selectedClassId) {
      const first = allClasses[0];
      setSelectedClassId((first._id || first.id).toString());
    }
  }, [allClasses, selectedClassId]);

  // 4. Fetch Subjects List
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['admin-results-subjects'],
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
    if (allSubjects.length > 0 && !selectedSubjectId) {
      const first = allSubjects[0];
      setSelectedSubjectId((first._id || first.id).toString());
    }
  }, [allSubjects, selectedSubjectId]);

  // Selected Names for Subheaders
  const selectedClass = useMemo(() => {
    return allClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId) || allClasses[0];
  }, [allClasses, selectedClassId]);

  const selectedSubject = useMemo(() => {
    return allSubjects.find((s: any) => (s._id || s.id).toString() === selectedSubjectId) || allSubjects[0];
  }, [allSubjects, selectedSubjectId]);

  // 5. Fetch Class Subject Results
  const canFetchResults = Boolean(selectedClassId && selectedSubjectId && selectedSessionId && selectedTermId);
  const {
    data: fetchedResults = [],
    isLoading: isLoadingResults,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-class-results', selectedClassId, selectedSubjectId, selectedSessionId, selectedTermId],
    enabled: canFetchResults,
    queryFn: async () => {
      try {
        const res = await apiClient.get('/results/class', {
          params: {
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            sessionId: selectedSessionId,
            termId: selectedTermId,
          },
        });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Synchronize fetched results to editable local state
  useEffect(() => {
    if (fetchedResults) {
      const mapped = fetchedResults.map((r: any) => {
        const ca = typeof r.caScore === 'number' ? r.caScore : parseFloat(r.caScore) || 0;
        const exam = typeof r.examScore === 'number' ? r.examScore : parseFloat(r.examScore) || 0;
        const total = ca + exam;
        const { grade, remark } = calculateGradeAndRemark(total);
        return {
          ...r,
          caScore: ca,
          examScore: exam,
          totalScore: total,
          grade: r.grade || grade,
          remark: r.remark || remark,
        };
      });
      setLocalResults(mapped);
      setHasChanges(false);
    }
  }, [fetchedResults]);

  // Handle Score Input Change
  const handleScoreChange = (index: number, field: 'caScore' | 'examScore', valText: string) => {
    let num = parseFloat(valText) || 0;
    if (num < 0) num = 0;
    if (field === 'caScore' && num > 40) num = 40;
    if (field === 'examScore' && num > 60) num = 60;

    const copy = [...localResults];
    const target = { ...copy[index] };

    target[field] = num;
    const newCa = field === 'caScore' ? num : target.caScore || 0;
    const newExam = field === 'examScore' ? num : target.examScore || 0;
    const newTotal = newCa + newExam;

    const { grade, remark } = calculateGradeAndRemark(newTotal);
    target.totalScore = newTotal;
    target.grade = grade;
    target.remark = remark;

    copy[index] = target;
    setLocalResults(copy);
    setHasChanges(true);
  };

  // Batch Save Mutation
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      const sanitized = localResults.map((r: any) => ({
        studentId: r.studentId || r.student?._id || r.student?.id,
        caScore: r.caScore || 0,
        examScore: r.examScore || 0,
        totalScore: r.totalScore || 0,
        grade: r.grade,
        remark: r.remark,
      }));

      const payload = {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        sessionId: selectedSessionId,
        termId: selectedTermId,
        results: sanitized,
      };

      const res = await apiClient.post('/results/batch', payload);
      return res.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      Alert.alert('Results Saved 🎉', 'Student exam & CA scores updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-class-results'] });
    },
    onError: (err: any) => {
      Alert.alert('Save Failed ❌', err.response?.data?.message || 'Failed to save student scores.');
    },
  });

  // Filtered Students in Local Results by Search Query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return localResults;
    const q = searchQuery.toLowerCase();
    return localResults.filter((r: any) => {
      const name = `${r.studentName || r.student?.firstName || ''} ${r.student?.lastName || ''}`.toLowerCase();
      const adm = (r.admissionNumber || r.student?.admissionNumber || '').toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [localResults, searchQuery]);

  // Broadsheet Overview Metrics
  const broadsheetSummary = useMemo(() => {
    if (localResults.length === 0) return { totalStudents: 0, passCount: 0, classAvg: 0, highest: 0 };
    let sum = 0;
    let highest = 0;
    let passCount = 0;

    localResults.forEach((r: any) => {
      const tot = r.totalScore || 0;
      sum += tot;
      if (tot > highest) highest = tot;
      if (tot >= 45) passCount++;
    });

    const classAvg = Math.round(sum / localResults.length);
    return { totalStudents: localResults.length, passCount, classAvg, highest };
  }, [localResults]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Results & Broadsheets</ThemedText>
          <ThemedText style={styles.sub}>
            {selectedClass ? formatClassLabel(selectedClass) : 'Select Class'} • {selectedSubject?.name || 'Subject'}
          </ThemedText>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveBtn, saveBatchMutation.isPending && { opacity: 0.5 }]}
            disabled={saveBatchMutation.isPending}
            onPress={() => saveBatchMutation.mutate()}
          >
            <Save size={16} color="#ffffff" />
            <ThemedText style={styles.saveBtnText}>
              {saveBatchMutation.isPending ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />
        }
      >
        {/* WORKSTATION MODE SWITCHER */}
        <View style={styles.modeSegmentContainer}>
          <TouchableOpacity
            style={[styles.modeSegmentBtn, activeMode === 'subject' && styles.modeSegmentBtnActive]}
            onPress={() => setActiveMode('subject')}
          >
            <BookOpen size={14} color={activeMode === 'subject' ? '#ffffff' : '#94a3b8'} />
            <ThemedText style={[styles.modeSegmentText, activeMode === 'subject' && styles.modeSegmentTextActive]}>
              Subject Entry
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSegmentBtn, activeMode === 'broadsheet' && styles.modeSegmentBtnActive]}
            onPress={() => setActiveMode('broadsheet')}
          >
            <FileSpreadsheet size={14} color={activeMode === 'broadsheet' ? '#ffffff' : '#94a3b8'} />
            <ThemedText style={[styles.modeSegmentText, activeMode === 'broadsheet' && styles.modeSegmentTextActive]}>
              Master Broadsheet
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* CLASS SELECTOR PILLS */}
        <View style={{ gap: 6 }}>
          <ThemedText style={styles.inputLabel}>SELECT CLASS:</ThemedText>
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
        </View>

        {/* SUBJECT SELECTOR PILLS (SUBJECT MODE ONLY) */}
        {activeMode === 'subject' && (
          <View style={{ gap: 6 }}>
            <ThemedText style={styles.inputLabel}>SELECT SUBJECT:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {allSubjects.map((sub: any) => {
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
          </View>
        )}

        {/* MODE 1: SUBJECT SCORE ENTRY TABLE */}
        {activeMode === 'subject' && (
          <View style={{ gap: 10 }}>
            {/* Search Input Box */}
            <View style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search student by name or adm no..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {isLoadingResults ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : filteredResults.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Award size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Students Found</ThemedText>
                <ThemedText style={styles.emptySub}>
                  No enrolled students found for {selectedClass ? formatClassLabel(selectedClass) : 'this class'}.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredResults.map((result: any, index: number) => {
                  const studentName = result.studentName || `${result.student?.firstName || ''} ${result.student?.lastName || ''}`.trim() || 'Student';
                  const admNo = result.admissionNumber || result.student?.admissionNumber || 'N/A';
                  const total = result.totalScore || 0;

                  return (
                    <ThemedView key={result.studentId || result.student?._id || index} style={styles.studentCard}>
                      <View style={styles.studentCardHeader}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.studentName}>{studentName}</ThemedText>
                          <ThemedText style={styles.studentAdmNo}>Adm No: {admNo}</ThemedText>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 2 }}>
                          <ThemedText style={styles.totalScoreNum}>{total}/100</ThemedText>
                          <Badge label={`GRADE ${result.grade || 'F'}`} variant={getGradeBadgeVariant(total)} size="sm" />
                        </View>
                      </View>

                      {/* Inputs Row for CA & Exam */}
                      <View style={styles.scoreInputsRow}>
                        <View style={styles.inputGroup}>
                          <ThemedText style={styles.inputGroupLabel}>C.A (Max 40):</ThemedText>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            value={String(result.caScore ?? '')}
                            onChangeText={(val) => handleScoreChange(index, 'caScore', val)}
                          />
                        </View>

                        <View style={styles.inputGroup}>
                          <ThemedText style={styles.inputGroupLabel}>Exam (Max 60):</ThemedText>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            value={String(result.examScore ?? '')}
                            onChangeText={(val) => handleScoreChange(index, 'examScore', val)}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1.2 }]}>
                          <ThemedText style={styles.inputGroupLabel}>Remark:</ThemedText>
                          <ThemedText style={styles.remarkText}>{result.remark || 'N/A'}</ThemedText>
                        </View>
                      </View>
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* MODE 2: MASTER BROADSHEET OVERVIEW */}
        {activeMode === 'broadsheet' && (
          <View style={{ gap: 12 }}>
            <ThemedView style={styles.summaryCard}>
              <ThemedText style={styles.summaryTitle}>CLASS BROADSHEET SUMMARY</ThemedText>
              <ThemedText style={styles.summaryClassText}>
                {selectedClass ? formatClassLabel(selectedClass) : 'Selected Class'}
              </ThemedText>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricVal}>{broadsheetSummary.totalStudents}</ThemedText>
                  <ThemedText style={styles.metricLabel}>Enrolled</ThemedText>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricVal, { color: '#4ade80' }]}>{broadsheetSummary.passCount}</ThemedText>
                  <ThemedText style={styles.metricLabel}>Passed</ThemedText>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricVal}>{broadsheetSummary.classAvg}%</ThemedText>
                  <ThemedText style={styles.metricLabel}>Class Average</ThemedText>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <ThemedText style={[styles.metricVal, { color: '#facc15' }]}>{broadsheetSummary.highest}</ThemedText>
                  <ThemedText style={styles.metricLabel}>Highest Score</ThemedText>
                </View>
              </View>
            </ThemedView>

            {/* Broadsheet Roster List */}
            <View style={{ gap: 8 }}>
              <ThemedText style={styles.sectionTitle}>STUDENT BROADSHEET ROSTER</ThemedText>

              {localResults.map((r: any, idx: number) => {
                const sName = r.studentName || `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim();
                const total = r.totalScore || 0;

                return (
                  <ThemedView key={r.studentId || idx} style={styles.broadsheetRowCard}>
                    <View style={styles.rankBox}>
                      <ThemedText style={styles.rankNum}>#{idx + 1}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.broadsheetStudentName}>{sName}</ThemedText>
                      <ThemedText style={styles.broadsheetSub}>
                        CA: {r.caScore}/40 • Exam: {r.examScore}/60
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <ThemedText style={styles.broadsheetTotalNum}>{total}/100</ThemedText>
                      <Badge label={`GRADE ${r.grade || 'F'}`} variant={getGradeBadgeVariant(total)} size="sm" />
                    </View>
                  </ThemedView>
                );
              })}
            </View>
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

  modeSegmentContainer: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  modeSegmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  modeSegmentBtnActive: { backgroundColor: '#0284c7' },
  modeSegmentText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  modeSegmentTextActive: { color: '#ffffff' },

  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },

  pillsRow: { gap: 8, paddingVertical: 2 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 13 },

  studentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  studentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  studentAdmNo: { fontSize: 11, color: '#38bdf8', marginTop: 2 },
  totalScoreNum: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },

  scoreInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' },
  inputGroup: { flex: 1, gap: 4 },
  inputGroupLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  scoreInput: { backgroundColor: '#1e293b', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, color: '#f8fafc', fontSize: 14, fontWeight: 'bold', borderWidth: 1, borderColor: '#334155', textAlign: 'center' },
  remarkText: { fontSize: 12, color: '#4ade80', fontWeight: 'bold', marginTop: 6 },

  summaryCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 10 },
  summaryTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  summaryClassText: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },

  metricsGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  metricLabel: { fontSize: 10, color: '#94a3b8' },
  metricDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  broadsheetRowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  rankBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  rankNum: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  broadsheetStudentName: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  broadsheetSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  broadsheetTotalNum: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
