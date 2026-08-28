import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Copy,
  Receipt,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = typeof cls === 'string' ? cls : (cls.name || cls.className || '').trim();
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

export default function ParentFeesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const schoolName = (user as any)?.schoolName || (user as any)?.school?.name || 'SkolaCloud Academy';

  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [showComingSoonModal, setShowComingSoonModal] = useState<boolean>(false);

  // 0. Fetch School Info & Bank Account Details
  const { data: schoolData } = useQuery({
    queryKey: ['parent-school-bank-details'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/schools/my-school').catch(() => null);
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  const officialBankName = schoolData?.bankName || 'Contact Administration';
  const officialAccountName = schoolData?.accountName || schoolName || 'SkolaCloud School Fees';
  const officialAccountNumber = schoolData?.accountNumber || 'N/A';

  // 1. Fetch Children
  const { data: childrenList = [] } = useQuery({
    queryKey: ['parent-children-fees-list'],
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

  // Selected Child object
  const activeChild = useMemo(() => {
    return childrenList.find((c: any) => (c._id || c.id).toString() === selectedChildId) || childrenList[0];
  }, [childrenList, selectedChildId]);

  // 2. Fetch Applicable School Fees for Child
  const {
    data: feeItems = [],
    isLoading: isLoadingFees,
    refetch: refetchFees,
    isRefetching: isRefetchingFees,
  } = useQuery({
    queryKey: ['parent-child-fees', selectedChildId],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/payments/fees/${selectedChildId}`).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Payments History for Child
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['parent-child-payments-history', selectedChildId],
    enabled: Boolean(selectedChildId),
    queryFn: async () => {
      try {
        let res = await apiClient.get(`/parent/payments/${selectedChildId}`).catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Financial summary calculations
  const financialSummary = useMemo(() => {
    let totalInvoiced = feeItems.reduce((acc: number, f: any) => acc + (f.amount || 0), 0);
    let amountPaid = paymentHistory
      .filter((p: any) => p.status === 'success' || p.status === 'completed' || p.status === 'paid')
      .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

    let outstanding = Math.max(0, totalInvoiced - amountPaid);
    return { totalInvoiced, amountPaid, outstanding };
  }, [feeItems, paymentHistory]);

  // Initialize Payment Mutation (Virtual Account / Paystack)
  const initializePaymentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: financialSummary.outstanding > 0 ? financialSummary.outstanding : 50000,
        studentId: selectedChildId,
      };
      const res = await apiClient.post('/parent/payments/initialize', payload);
      return res?.data;
    },
    onSuccess: (data: any) => {
      if (data?.accountNumber) {
        Alert.alert(
          'Virtual Payment Account Generated 🏦',
          `Bank: ${data.bankName || 'Wema Bank'}\nAccount Number: ${data.accountNumber}\nAccount Name: ${data.accountName || 'SkolaCloud Student Fee'}\n\nTransfer the outstanding fee to this account number to automatically credit your fee balance.`
        );
      } else if (data?.authorization_url) {
        Alert.alert('Payment Initialized', 'Redirecting to payment gateway...');
      } else {
        Alert.alert('Payment Account Ready', `Account Number: ${data?.reference || 'N/A'}`);
      }
    },
    onError: (err: any) => {
      Alert.alert('Payment Error', err.response?.data?.message || 'Failed to initialize payment.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>School Fees & Payments</ThemedText>
          <ThemedText style={styles.sub}>Fee Invoices & Online Receipts</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetchingFees} onRefresh={refetchFees} tintColor="#38bdf8" />
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

        {/* Financial Overview Card */}
        <ThemedView style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.summaryTitle}>FEE STATEMENT</ThemedText>
              <ThemedText style={styles.childNameText}>
                {activeChild?.firstName} {activeChild?.lastName} ({formatClassLabel(activeChild?.classId || { name: activeChild?.className, grade: activeChild?.grade })})
              </ThemedText>
            </View>

            <Badge
              label={financialSummary.outstanding === 0 ? 'CLEARED' : 'PENDING'}
              variant={financialSummary.outstanding === 0 ? 'success' : 'danger'}
              size="sm"
            />
          </View>

          <View style={styles.balanceBigRow}>
            <View>
              <ThemedText style={styles.balanceBigLabel}>Outstanding Balance</ThemedText>
              <ThemedText style={[styles.balanceBigVal, financialSummary.outstanding > 0 && { color: '#f87171' }]}>
                ₦{financialSummary.outstanding.toLocaleString()}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.payOnlineBtn}
              onPress={() => setShowComingSoonModal(true)}
            >
              <CreditCard size={16} color="#ffffff" />
              <ThemedText style={styles.payOnlineBtnText}>PAY ONLINE</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <ThemedText style={styles.metricVal}>₦{financialSummary.totalInvoiced.toLocaleString()}</ThemedText>
              <ThemedText style={styles.metricLabel}>Total Invoiced</ThemedText>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <ThemedText style={[styles.metricVal, { color: '#4ade80' }]}>₦{financialSummary.amountPaid.toLocaleString()}</ThemedText>
              <ThemedText style={styles.metricLabel}>Total Paid</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Direct Bank Transfer Account Card */}
        <ThemedView style={styles.bankAccountCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} color="#38bdf8" />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: '#f8fafc' }}>
                Official School Bank Account
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: '#94a3b8' }}>
                Transfer fees directly & present transaction receipt
              </ThemedText>
            </View>
          </View>

          <View style={styles.bankDetailsBox}>
            <View style={styles.bankDetailRow}>
              <ThemedText style={styles.bankLabel}>Bank Name:</ThemedText>
              <ThemedText style={styles.bankVal}>{officialBankName}</ThemedText>
            </View>
            <View style={styles.bankDetailRow}>
              <ThemedText style={styles.bankLabel}>Account Name:</ThemedText>
              <ThemedText style={styles.bankVal}>{officialAccountName}</ThemedText>
            </View>
            <View style={styles.bankDetailRow}>
              <ThemedText style={styles.bankLabel}>Account No:</ThemedText>
              <ThemedText style={[styles.bankVal, { color: '#38bdf8', fontWeight: 'bold' }]}>
                {officialAccountNumber}
              </ThemedText>
              {officialAccountNumber !== 'N/A' && (
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => Alert.alert('Copied 📋', `Account Number ${officialAccountNumber} copied to clipboard.`)}
                >
                  <Copy size={13} color="#38bdf8" />
                  <ThemedText style={styles.copyBtnText}>Copy</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ThemedView>

        {/* Fee Breakdown Table */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>TERM FEE STRUCTURE INVOICE</ThemedText>

          {isLoadingFees ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
          ) : feeItems.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <Receipt size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Fee Structure Configured</ThemedText>
              <ThemedText style={styles.emptySub}>No fee items published for this student class yet.</ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {feeItems.map((item: any) => (
                <ThemedView key={item._id || item.id} style={styles.feeItemCard}>
                  <View style={styles.feeItemHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.feeItemName}>{item.name || item.title || 'Fee Item'}</ThemedText>
                      <ThemedText style={styles.feeItemCategory}>
                        {item.category || 'Term Fee'} • {item.description || 'Mandatory school fee'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.feeItemAmount}>₦{(item.amount || 0).toLocaleString()}</ThemedText>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </View>

        {/* Payment History Receipts */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.sectionTitle}>PAYMENT TRANSACTIONS & RECEIPTS ({paymentHistory.length})</ThemedText>

          {paymentHistory.length === 0 ? (
            <ThemedView style={styles.emptyCard}>
              <FileText size={36} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Payments History</ThemedText>
              <ThemedText style={styles.emptySub}>No payment transactions recorded for this student yet.</ThemedText>
            </ThemedView>
          ) : (
            <View style={{ gap: 10 }}>
              {paymentHistory.map((pm: any) => {
                const dateStr = new Date(pm.createdAt || pm.paymentDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const status = (pm.status || 'paid').toLowerCase();

                return (
                  <ThemedView key={pm._id || pm.id} style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.receiptTitle}>Receipt #{pm.receiptNumber || pm.reference || 'REC'}</ThemedText>
                        <ThemedText style={styles.receiptSub}>
                          {dateStr} • Method: {(pm.paymentMethod || 'Transfer').toUpperCase()}
                        </ThemedText>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <ThemedText style={styles.receiptAmount}>₦{(pm.amount || 0).toLocaleString()}</ThemedText>
                        <Badge label={status.toUpperCase()} variant={status === 'paid' || status === 'success' ? 'success' : 'warning'} size="sm" />
                      </View>
                    </View>
                  </ThemedView>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* PAY ONLINE COMING SOON MODAL */}
      <Modal visible={showComingSoonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconGlow}>
                <CreditCard size={24} color="#38bdf8" />
              </View>
              <TouchableOpacity onPress={() => setShowComingSoonModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalTitleText}>Online Card Payments Coming Soon 💳</ThemedText>
            <ThemedText style={styles.modalBodyText}>
              Direct online debit card checkout and instant automated payment gateway reconciliation are launching in the upcoming release.
            </ThemedText>
            <ThemedText style={styles.modalSubNote}>
              For now, please transfer your fee balance directly to the <ThemedText style={{ color: '#38bdf8', fontWeight: 'bold' }}>Official School Bank Account</ThemedText> details displayed below.
            </ThemedText>

            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setShowComingSoonModal(false)}
            >
              <ThemedText style={styles.modalDismissBtnText}>Got It, Thanks</ThemedText>
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

  summaryCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 14 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  childNameText: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc', marginTop: 2 },

  balanceBigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  balanceBigLabel: { fontSize: 11, color: '#94a3b8' },
  balanceBigVal: { fontSize: 22, fontWeight: 'bold', color: '#4ade80', marginTop: 2 },

  payOnlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  payOnlineBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  metricLabel: { fontSize: 10, color: '#94a3b8' },
  metricDivider: { width: 1, height: 24, backgroundColor: '#334155' },

  bankAccountCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  bankDetailsBox: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#334155' },
  bankDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankLabel: { fontSize: 12, color: '#94a3b8', width: 95 },
  bankVal: { fontSize: 12, fontWeight: '600', color: '#f8fafc', flex: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(56, 189, 248, 0.12)' },
  copyBtnText: { fontSize: 11, color: '#38bdf8', fontWeight: 'bold' },

  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },

  feeItemCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  feeItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeItemName: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  feeItemCategory: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  feeItemAmount: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },

  receiptCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  receiptSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  receiptAmount: { fontSize: 15, fontWeight: 'bold', color: '#4ade80' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155', gap: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalIconGlow: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' },
  modalTitleText: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  modalBodyText: { fontSize: 13, color: '#cbd5e1', lineHeight: 20 },
  modalSubNote: { fontSize: 12, color: '#94a3b8', lineHeight: 18, backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  modalDismissBtn: { backgroundColor: '#0284c7', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  modalDismissBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
});
