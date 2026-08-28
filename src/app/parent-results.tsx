import React, { useState, useMemo } from 'react';
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
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

function getGradeVariant(score: number): 'gold' | 'success' | 'info' | 'warning' | 'danger' {
  if (score >= 70) return 'gold';
  if (score >= 60) return 'success';
  if (score >= 50) return 'info';
  if (score >= 40) return 'warning';
  return 'danger';
}

export default function ParentResultsScreen() {
  const router = useRouter();

  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // 1. Fetch Children
  const { data: childrenList = [] } = useQuery({
    queryKey: ['parent-children-results-list'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/parent/students/children').catch(() => null);
        if (!res?.data) res = await apiClient.get('/parents/children').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first child
  React.useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      const first = childrenList[0];
      setSelectedChildId((first._id || first.id).toString());
    }
  }, [childrenList, selectedChildId]);

  // 2. Fetch Academic Sessions
  const { data: sessionsList = [] } = useQuery({
    queryKey: ['parent-sessions-list'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/parent/payments/sessions').catch(() => null);
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

  React.useEffect(() => {
    if (sessionsList.length > 0 && !selectedSessionId) {
      const active = sessionsList.find((s: any) => s.isCurrent || s.status === 'active') || sessionsList[0];
      setSelectedSessionId((active._id || active.id).toString());
    }
  }, [sessionsList, selectedSessionId]);

  // 3. Fetch Terms
  const { data: termsList = [] } = useQuery({
    queryKey: ['parent-terms-list', selectedSessionId],
    enabled: Boolean(selectedSessionId),
    queryFn: async () => {
      try {
        let res = await apiClient.get('/parent/payments/terms', { params: { sessionId: selectedSessionId } }).catch(() => null);
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

  React.useEffect(() => {
    if (termsList.length > 0 && !selectedTermId) {
      const active = termsList.find((t: any) => t.isCurrent || t.status === 'active') || termsList[0];
      setSelectedTermId((active._id || active.id).toString());
    }
  }, [termsList, selectedTermId]);

  // 4. Fetch Child Results
  const {
    data: childResults = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['parent-child-results', selectedChildId, selectedSessionId, selectedTermId],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/results/${selectedChildId}`, {
          params: { sessionId: selectedSessionId, termId: selectedTermId },
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

  // Calculated overall metrics
  const performanceSummary = useMemo(() => {
    if (childResults.length === 0) return { avg: 0, total: 0, highest: 0, passCount: 0, count: 0 };
    let sum = 0;
    let highest = 0;
    let passCount = 0;
    childResults.forEach((r: any) => {
      const tot = r.totalScore || ((r.caScore || 0) + (r.examScore || 0));
      sum += tot;
      if (tot > highest) highest = tot;
      if (tot >= 50) passCount++;
    });
    const count = childResults.length;
    const avg = Math.round(sum / count);
    return { avg, total: sum, highest, passCount, count };
  }, [childResults]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Report Cards & Grades</ThemedText>
          <ThemedText style={styles.sub}>Term Assessment & Form Master Remarks</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />
        }
      >
        {/* Child Selector Pills */}
        {childrenList.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {childrenList.map((child: any) => {
              const cId = (child._id || child.id).toString();
              const isSel = selectedChildId === cId;
              const name = `${child.firstName || ''} ${child.lastName || ''}`.trim();
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                  onPress={() => setSelectedChildId(cId)}
                >
                  <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>{name}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Overall Performance Card */}
        <ThemedView style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.summaryTitle}>ACADEMIC PERFORMANCE SUMMARY</ThemedText>
              <ThemedText style={styles.summarySub}>
                {performanceSummary.count} Subjects Evaluated
              </ThemedText>
            </View>
            <View style={styles.avgCircle}>
              <ThemedText style={styles.avgVal}>{performanceSummary.avg}%</ThemedText>
              <ThemedText style={styles.avgSub}>AVERAGE</ThemedText>
            </View>
          </View>

          <View style={styles.summaryMetricsRow}>
            <View style={styles.metricItem}>
              <ThemedText style={styles.metricVal}>{performanceSummary.total}</ThemedText>
              <ThemedText style={styles.metricLabel}>Total Score</ThemedText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <ThemedText style={[styles.metricVal, { color: '#4ade80' }]}>{performanceSummary.highest}</ThemedText>
              <ThemedText style={styles.metricLabel}>Highest Score</ThemedText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <ThemedText style={styles.metricVal}>{performanceSummary.passCount} / {performanceSummary.count}</ThemedText>
              <ThemedText style={styles.metricLabel}>Passed Subjects</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Subject Score Breakdown */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>SUBJECT SCORE BREAKDOWN</ThemedText>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
          ) : childResults.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <Award size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Results Published Yet</ThemedText>
              <ThemedText style={styles.emptySub}>
                Exams and continuous assessment results for this term have not been published by the administration.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {childResults.map((res: any) => {
                const subName = res.subjectId?.name || res.subjectName || 'Subject';
                const ca = res.caScore || 0;
                const exam = res.examScore || 0;
                const total = res.totalScore || (ca + exam);
                const grade = res.grade || (total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F');
                const remark = res.remark || 'Good effort';

                return (
                  <ThemedView key={res._id || res.id} style={styles.subjectCard}>
                    <View style={styles.subjectHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.subjectTitle}>{subName}</ThemedText>
                        <ThemedText style={styles.subjectScoresText}>
                          CA: {ca}/40 • Exam: {exam}/60
                        </ThemedText>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <ThemedText style={styles.totalScoreNum}>{total}/100</ThemedText>
                        <Badge label={`GRADE ${grade}`} variant={getGradeVariant(total)} size="sm" />
                      </View>
                    </View>

                    {/* Score Bar Breakdown */}
                    <View style={{ gap: 6, marginVertical: 4 }}>
                      <View style={{ gap: 2 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <ThemedText style={{ fontSize: 10, color: '#94a3b8' }}>CA Score ({ca}/40)</ThemedText>
                          <ThemedText style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold' }}>{Math.round((ca / 40) * 100)}%</ThemedText>
                        </View>
                        <View style={styles.miniBarBg}>
                          <View style={[styles.miniBarFill, { width: `${Math.min(100, Math.max(0, (ca / 40) * 100))}%`, backgroundColor: '#38bdf8' }]} />
                        </View>
                      </View>

                      <View style={{ gap: 2 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <ThemedText style={{ fontSize: 10, color: '#94a3b8' }}>Exam Score ({exam}/60)</ThemedText>
                          <ThemedText style={{ fontSize: 10, color: '#c084fc', fontWeight: 'bold' }}>{Math.round((exam / 60) * 100)}%</ThemedText>
                        </View>
                        <View style={styles.miniBarBg}>
                          <View style={[styles.miniBarFill, { width: `${Math.min(100, Math.max(0, (exam / 60) * 100))}%`, backgroundColor: '#c084fc' }]} />
                        </View>
                      </View>
                    </View>

                    {remark && (
                      <ThemedText style={styles.subjectRemark}>Remark: "{remark}"</ThemedText>
                    )}
                  </ThemedView>
                );
              })}
            </View>
          )}
        </View>
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

  content: { padding: 16, gap: 14 },

  pillsRow: { gap: 8, paddingVertical: 2 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  summaryCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  summarySub: { fontSize: 13, color: '#cbd5e1', fontWeight: '600', marginTop: 2 },
  avgCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#38bdf8' },
  avgVal: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  avgSub: { fontSize: 8, color: '#94a3b8', fontWeight: 'bold' },

  summaryMetricsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  metricLabel: { fontSize: 10, color: '#94a3b8' },
  metricDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  subjectCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  subjectScoresText: { fontSize: 12, color: '#38bdf8', marginTop: 2 },
  totalScoreNum: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  subjectRemark: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },
  miniBarBg: { height: 4, backgroundColor: '#0f172a', borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
