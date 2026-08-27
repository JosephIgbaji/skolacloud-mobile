import React, { useState, useMemo } from 'react';
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
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Briefcase,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { apiClient } from '@/lib/api-client';

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TeacherLeaveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const todayStr = useMemo(() => getTodayIsoDate(), []);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [reason, setReason] = useState<string>('');

  // 1. Fetch Staff Leave Balances
  const {
    data: leaveBalances = [],
    isLoading: isLoadingBalances,
    refetch: refetchBalances,
    isRefetching: isRefetchingBalances,
  } = useQuery({
    queryKey: ['staff-leave-balances'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/staff/leave-balances').catch(() => null);
        if (!res?.data) res = await apiClient.get('/teachers/leave-balances').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first leave type
  React.useEffect(() => {
    if (leaveBalances.length > 0 && !selectedLeaveTypeId) {
      setSelectedLeaveTypeId(leaveBalances[0].leaveTypeId);
    }
  }, [leaveBalances, selectedLeaveTypeId]);

  // 2. Fetch My Leave Request History
  const {
    data: leaveHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['staff-leave-history'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/staff/leave-requests/my').catch(() => null);
        if (!res?.data) res = await apiClient.get('/teachers/leave-requests/my').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Selected Leave Type Balance object
  const selectedBalance = useMemo(() => {
    return leaveBalances.find((b: any) => b.leaveTypeId === selectedLeaveTypeId) || leaveBalances[0];
  }, [leaveBalances, selectedLeaveTypeId]);

  // Calculated Working Days Requested (Excluding Weekends)
  const daysRequestedCalculated = useMemo(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;

      let count = 0;
      const curDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const lastDate = new Date(e.getFullYear(), e.getMonth(), e.getDate());

      while (curDate <= lastDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        curDate.setDate(curDate.getDate() + 1);
      }
      return Math.max(1, count);
    } catch {
      return 1;
    }
  }, [startDate, endDate]);

  const isBalanceExceeded = useMemo(() => {
    if (!selectedBalance) return false;
    return daysRequestedCalculated > selectedBalance.daysLeft;
  }, [selectedBalance, daysRequestedCalculated]);

  // Apply Mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leaveTypeId: selectedLeaveTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
      };
      let res = await apiClient.post('/staff/leave-requests', payload).catch(() => null);
      if (!res?.data) res = await apiClient.post('/teachers/leave-requests', payload).catch(() => null);
      return res?.data;
    },
    onSuccess: () => {
      setModalVisible(false);
      setReason('');
      Alert.alert('Application Submitted 🎉', 'Your leave request has been submitted for admin approval.');
      queryClient.invalidateQueries({ queryKey: ['staff-leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['staff-leave-history'] });
    },
    onError: (err: any) => {
      Alert.alert('Application Error ❌', err.response?.data?.message || 'Failed to submit leave request.');
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
          <ThemedText style={styles.title}>Staff Leave Portal</ThemedText>
          <ThemedText style={styles.sub}>Leave Balances & Applications</ThemedText>
        </View>
        <TouchableOpacity style={styles.applyHeaderBtn} onPress={() => setModalVisible(true)}>
          <Plus size={16} color="#ffffff" />
          <ThemedText style={styles.applyHeaderBtnText}>Apply</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingBalances}
            onRefresh={() => {
              refetchBalances();
              refetchHistory();
            }}
            tintColor="#38bdf8"
          />
        }
      >
        {/* LEAVE BALANCES SUMMARY SECTION */}
        <View style={styles.sectionHeader}>
          <Briefcase size={16} color="#38bdf8" />
          <ThemedText style={styles.sectionTitle}>MY LEAVE BALANCES ({new Date().getFullYear()})</ThemedText>
        </View>

        {isLoadingBalances ? (
          <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 10 }} />
        ) : leaveBalances.length === 0 ? (
          <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>No leave policies configured yet.</ThemedText>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceCardsRow}>
            {leaveBalances.map((bal: any) => (
              <ThemedView key={bal.leaveTypeId} style={styles.balanceCard}>
                <View style={styles.balanceCardTop}>
                  <ThemedText style={styles.balanceName}>{bal.name}</ThemedText>
                  <Badge label={bal.isPaid ? 'PAID' : 'UNPAID'} variant={bal.isPaid ? 'success' : 'neutral'} size="sm" />
                </View>

                <View style={styles.balanceNumberRow}>
                  <ThemedText style={styles.balanceLeftNum}>{bal.daysLeft}</ThemedText>
                  <ThemedText style={styles.balanceSubText}>/ {bal.daysAllowed} Days Left</ThemedText>
                </View>

                <View style={styles.balanceProgressBar}>
                  <View
                    style={[
                      styles.balanceProgressFill,
                      { width: `${Math.min(100, (bal.daysUsed / bal.daysAllowed) * 100)}%` },
                    ]}
                  />
                </View>

                <ThemedText style={styles.balanceFooterText}>
                  Used: {bal.daysUsed} d • Pending: {bal.daysPending} d
                </ThemedText>
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {/* MY LEAVE HISTORY SECTION */}
        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <Clock size={16} color="#38bdf8" />
          <ThemedText style={styles.sectionTitle}>MY REQUEST HISTORY ({leaveHistory.length})</ThemedText>
        </View>

        {isLoadingHistory ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
        ) : leaveHistory.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Calendar size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Leave Applications</ThemedText>
            <ThemedText style={styles.emptySub}>You have not submitted any leave requests yet.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {leaveHistory.map((item: any) => {
              const typeName = item.leaveTypeId?.name || 'Leave';
              const stDate = new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const enDate = new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const status = (item.status || 'pending').toLowerCase();

              return (
                <ThemedView key={item._id || item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.historyType}>{typeName}</ThemedText>
                      <ThemedText style={styles.historyDates}>
                        {stDate} – {enDate} ({item.daysRequested} {item.daysRequested === 1 ? 'day' : 'days'})
                      </ThemedText>
                    </View>

                    <Badge
                      label={status.toUpperCase()}
                      variant={
                        status === 'approved'
                          ? 'success'
                          : status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                      size="sm"
                    />
                  </View>

                  <ThemedText style={styles.historyReason}>Reason: "{item.reason}"</ThemedText>

                  {item.adminRemark && (
                    <View style={styles.adminRemarkBox}>
                      <ThemedText style={styles.adminRemarkTitle}>Admin Feedback:</ThemedText>
                      <ThemedText style={styles.adminRemarkText}>{item.adminRemark}</ThemedText>
                    </View>
                  )}
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* APPLY FOR LEAVE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Apply for Leave</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
              {/* Select Leave Type */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>SELECT LEAVE CATEGORY:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {leaveBalances.map((bal: any) => {
                    const isSel = selectedLeaveTypeId === bal.leaveTypeId;
                    return (
                      <TouchableOpacity
                        key={bal.leaveTypeId}
                        style={[styles.typePillBtn, isSel && styles.typePillBtnActive]}
                        onPress={() => setSelectedLeaveTypeId(bal.leaveTypeId)}
                      >
                        {isSel && <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />}
                        <ThemedText style={[styles.typePillText, isSel && styles.typePillTextActive]}>
                          {bal.name} ({bal.daysLeft}d left)
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Start Date & End Date */}
              <DatePickerField label="LEAVE START DATE:" value={startDate} onChange={setStartDate} />
              <DatePickerField label="LEAVE END DATE:" value={endDate} onChange={setEndDate} />

              {/* Days Requested Duration Badge */}
              <View style={styles.durationSummaryBox}>
                <ThemedText style={styles.durationText}>
                  Working Days: <ThemedText style={{ fontWeight: 'bold', color: '#38bdf8' }}>{daysRequestedCalculated} {daysRequestedCalculated === 1 ? 'Working Day' : 'Working Days'}</ThemedText>
                </ThemedText>
                {selectedBalance && (
                  <ThemedText style={{ fontSize: 11, color: '#94a3b8' }}>
                    Remaining Balance: {selectedBalance.daysLeft} Days
                  </ThemedText>
                )}
              </View>

              {/* Exceeded Balance Warning Banner */}
              {isBalanceExceeded && (
                <View style={styles.exceededWarningBox}>
                  <AlertCircle size={16} color="#f87171" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.exceededWarningText}>
                    Days requested ({daysRequestedCalculated}) exceeds your remaining balance ({selectedBalance?.daysLeft} days).
                  </ThemedText>
                </View>
              )}

              {/* Reason Field */}
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>REASON FOR LEAVE:</ThemedText>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Provide detailed explanation for leave request..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!reason.trim() || isBalanceExceeded || applyMutation.isPending) && { opacity: 0.5 },
                ]}
                disabled={!reason.trim() || isBalanceExceeded || applyMutation.isPending}
                onPress={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.submitBtnText}>SUBMIT LEAVE APPLICATION</ThemedText>
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
  applyHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  applyHeaderBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  content: { padding: 16, gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  balanceCardsRow: { gap: 10, paddingVertical: 4 },
  balanceCard: {
    width: 170,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  balanceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceName: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc', flex: 1, marginRight: 4 },
  balanceNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  balanceLeftNum: { fontSize: 24, fontWeight: 'bold', color: '#38bdf8' },
  balanceSubText: { fontSize: 11, color: '#94a3b8' },
  balanceProgressBar: { height: 6, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' },
  balanceProgressFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 3 },
  balanceFooterText: { fontSize: 10, color: '#94a3b8' },

  historyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyType: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  historyDates: { fontSize: 12, color: '#38bdf8', marginTop: 2 },
  historyReason: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 16 },

  adminRemarkBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', gap: 2 },
  adminRemarkTitle: { fontSize: 10, fontWeight: 'bold', color: '#fbbf24' },
  adminRemarkText: { fontSize: 12, color: '#f8fafc' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },

  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },
  typePillBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  typePillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  typePillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  typePillTextActive: { color: '#ffffff', fontWeight: 'bold' },

  durationSummaryBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  durationText: { fontSize: 13, color: '#f8fafc' },

  exceededWarningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  exceededWarningText: { fontSize: 12, color: '#f87171', flex: 1 },

  reasonInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 13, borderWidth: 1, borderColor: '#334155', minHeight: 70, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});
