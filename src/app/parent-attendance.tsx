import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

type RangePreset = 'all' | '7days' | '30days' | 'month' | 'single' | 'custom';

export default function ParentAttendanceScreen() {
  const router = useRouter();

  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');

  const [singleDate, setSingleDate] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [showSingleDateModal, setShowSingleDateModal] = useState<boolean>(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState<boolean>(false);

  // 1. Fetch Children
  const { data: childrenList = [] } = useQuery({
    queryKey: ['parent-children-attendance-list'],
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

  // Compute active query dates based on rangePreset
  const queryParams = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (rangePreset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      const startStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      return { startDate: startStr, endDate: todayStr };
    }

    if (rangePreset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      const startStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      return { startDate: startStr, endDate: todayStr };
    }

    if (rangePreset === 'month') {
      const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { startDate: startStr, endDate: todayStr };
    }

    if (rangePreset === 'single' && singleDate) {
      return { date: singleDate };
    }

    if (rangePreset === 'custom' && (customStartDate || customEndDate)) {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }

    return {};
  }, [rangePreset, singleDate, customStartDate, customEndDate]);

  // 2. Fetch Selected Child Attendance Logs
  const {
    data: attendanceLogs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['parent-attendance-logs', selectedChildId, queryParams],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/attendance/${selectedChildId}`, {
          params: queryParams,
        }).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (attendanceLogs.length === 0) return { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
    const total = attendanceLogs.length;
    const present = attendanceLogs.filter((a: any) => a.status === 'present').length;
    const absent = attendanceLogs.filter((a: any) => a.status === 'absent').length;
    const late = attendanceLogs.filter((a: any) => a.status === 'late' || a.isLate).length;
    const rate = Math.round((present / total) * 100);
    return { total, present, absent, late, rate };
  }, [attendanceLogs]);

  // Preset Date Picker Helpers
  const handleSelectPresetDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSingleDate(dateStr);
    setRangePreset('single');
    setShowSingleDateModal(false);
  };

  const handleApplyCustomRange = () => {
    if (!customStartDate && !customEndDate) {
      Alert.alert('Date Range Required', 'Please enter a start or end date.');
      return;
    }
    setRangePreset('custom');
    setShowCustomRangeModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Child Attendance Log</ThemedText>
          <ThemedText style={styles.sub}>Daily Roll Call & Presence Rate</ThemedText>
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

        {/* Date Filter Pills Row */}
        <View style={{ gap: 6 }}>
          <ThemedText style={styles.sectionTitle}>FILTER BY DATE</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, rangePreset === 'all' && styles.filterPillActive]}
              onPress={() => setRangePreset('all')}
            >
              <ThemedText style={[styles.filterPillText, rangePreset === 'all' && styles.filterPillTextActive]}>
                All Time
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, rangePreset === '7days' && styles.filterPillActive]}
              onPress={() => setRangePreset('7days')}
            >
              <ThemedText style={[styles.filterPillText, rangePreset === '7days' && styles.filterPillTextActive]}>
                Last 7 Days
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, rangePreset === '30days' && styles.filterPillActive]}
              onPress={() => setRangePreset('30days')}
            >
              <ThemedText style={[styles.filterPillText, rangePreset === '30days' && styles.filterPillTextActive]}>
                Last 30 Days
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, rangePreset === 'month' && styles.filterPillActive]}
              onPress={() => setRangePreset('month')}
            >
              <ThemedText style={[styles.filterPillText, rangePreset === 'month' && styles.filterPillTextActive]}>
                This Month
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, rangePreset === 'single' && styles.filterPillActive]}
              onPress={() => setShowSingleDateModal(true)}
            >
              <Calendar size={13} color={rangePreset === 'single' ? '#ffffff' : '#38bdf8'} />
              <ThemedText style={[styles.filterPillText, rangePreset === 'single' && styles.filterPillTextActive]}>
                {rangePreset === 'single' && singleDate ? singleDate : 'Past Date'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, rangePreset === 'custom' && styles.filterPillActive]}
              onPress={() => setShowCustomRangeModal(true)}
            >
              <Filter size={13} color={rangePreset === 'custom' ? '#ffffff' : '#38bdf8'} />
              <ThemedText style={[styles.filterPillText, rangePreset === 'custom' && styles.filterPillTextActive]}>
                {rangePreset === 'custom' ? 'Custom Range ✓' : 'Custom Range'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stats Header Summary Card */}
        <ThemedView style={styles.statsCardContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statVal}>{stats.rate}%</ThemedText>
              <ThemedText style={styles.statLabel}>Presence Rate</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={[styles.statVal, { color: '#4ade80' }]}>{stats.present}</ThemedText>
              <ThemedText style={styles.statLabel}>Present</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={[styles.statVal, { color: '#fbbf24' }]}>{stats.late}</ThemedText>
              <ThemedText style={styles.statLabel}>Late</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={[styles.statVal, { color: '#f87171' }]}>{stats.absent}</ThemedText>
              <ThemedText style={styles.statLabel}>Absent</ThemedText>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, stats.rate))}%` }]} />
          </View>
        </ThemedView>

        {/* Attendance History List */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>ATTENDANCE HISTORY ({attendanceLogs.length})</ThemedText>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
          ) : attendanceLogs.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <Calendar size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Attendance Records</ThemedText>
              <ThemedText style={styles.emptySub}>No attendance logs recorded for this selected date filter.</ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {attendanceLogs.map((log: any, idx: number) => {
                const rawDate = log.date || log.createdAt;
                const d = new Date(rawDate);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;

                const formattedDateStr = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const status = (log.status || (log.isLate ? 'late' : 'present')).toLowerCase();

                return (
                  <ThemedView key={log._id || log.id || idx} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} color="#38bdf8" />
                        <ThemedText style={styles.logDate}>{formattedDateStr}</ThemedText>
                      </View>

                      <Badge
                        label={status.toUpperCase()}
                        variant={
                          status === 'present'
                            ? 'success'
                            : status === 'absent'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      />
                    </View>

                    {log.remark && (
                      <ThemedText style={styles.logRemark}>Remark: "{log.remark}"</ThemedText>
                    )}
                  </ThemedView>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* SINGLE PAST DATE PICKER MODAL */}
      <Modal visible={showSingleDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter By Past Date</ThemedText>
              <TouchableOpacity onPress={() => setShowSingleDateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalSub}>
              Enter a specific date (YYYY-MM-DD) or choose a quick shortcut below:
            </ThemedText>

            <View style={styles.quickShortcutsRow}>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => handleSelectPresetDate(1)}>
                <ThemedText style={styles.shortcutBtnText}>Yesterday</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => handleSelectPresetDate(2)}>
                <ThemedText style={styles.shortcutBtnText}>2 Days Ago</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutBtn} onPress={() => handleSelectPresetDate(7)}>
                <ThemedText style={styles.shortcutBtnText}>7 Days Ago</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Custom Single Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-08-27"
                placeholderTextColor="#94a3b8"
                value={singleDate}
                onChangeText={setSingleDate}
              />
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                if (!singleDate.trim()) {
                  Alert.alert('Date Required', 'Please enter a valid date in YYYY-MM-DD format.');
                  return;
                }
                setRangePreset('single');
                setShowSingleDateModal(false);
              }}
            >
              <ThemedText style={styles.applyBtnText}>Apply Date Filter</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* CUSTOM DATE RANGE PICKER MODAL */}
      <Modal visible={showCustomRangeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter By Date Range</ThemedText>
              <TouchableOpacity onPress={() => setShowCustomRangeModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalSub}>
              Select custom start and end dates to view attendance logs:
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Start Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.dateInput}
                placeholder="e.g. 2026-08-01"
                placeholderTextColor="#94a3b8"
                value={customStartDate}
                onChangeText={setCustomStartDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>End Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.dateInput}
                placeholder="e.g. 2026-08-28"
                placeholderTextColor="#94a3b8"
                value={customEndDate}
                onChangeText={setCustomEndDate}
              />
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustomRange}>
              <ThemedText style={styles.applyBtnText}>Apply Date Range</ThemedText>
            </TouchableOpacity>
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

  content: { padding: 16, gap: 14 },

  pillsRow: { gap: 8, paddingVertical: 2 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#38bdf8' },
  filterPillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  statsCardContainer: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  statsCard: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 10, color: '#94a3b8' },
  statDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  progressBarBg: { height: 6, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 3 },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  logCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  logRemark: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155', gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  modalSub: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },

  quickShortcutsRow: { flexDirection: 'row', gap: 8 },
  shortcutBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  shortcutBtnText: { color: '#38bdf8', fontSize: 11, fontWeight: '600' },

  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  dateInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, height: 44, color: '#f8fafc', fontSize: 14 },

  applyBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  applyBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
