import React, { useState, useEffect } from 'react';
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
  CreditCard,
  Plus,
  RefreshCw,
  Filter,
  DollarSign,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Check,
  Receipt,
  Search,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import ParentFeesScreen from '../parent-fees';

export default function FeesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rawRole = (user?.role || 'student').toLowerCase();
  if (rawRole === 'parent') {
    return <ParentFeesScreen />;
  }

  const isAdminOrAccountant = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant';

  // Active Tab: 'billing' | 'structures'
  const [activeTab, setActiveTab] = useState<'billing' | 'structures'>('billing');

  // Filters
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [billingSearch, setBillingSearch] = useState<string>('');

  // Modals & Active Objects
  const [showAddStructureModal, setShowAddStructureModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showStructureActionModal, setShowStructureActionModal] = useState(false);

  const [showSessionPickerModal, setShowSessionPickerModal] = useState(false);
  const [showTermPickerModal, setShowTermPickerModal] = useState(false);
  const [showClassFilterModal, setShowClassFilterModal] = useState(false);

  const [showStructureClassPickerModal, setShowStructureClassPickerModal] = useState(false);
  const [showStudentPickerModal, setShowStudentPickerModal] = useState(false);

  const [activeStructure, setActiveStructure] = useState<any | null>(null);
  const [isEditingStructure, setIsEditingStructure] = useState(false);
  const [activeDebtorStudent, setActiveDebtorStudent] = useState<any | null>(null);

  // 1. Fetch Sessions List
  const { data: sessionsList = [] } = useQuery({
    queryKey: ['admin-sessions-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/sessions');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first session if not selected
  useEffect(() => {
    if (sessionsList.length > 0 && !selectedSessionId) {
      const activeSess = sessionsList.find((s: any) => s.isCurrent) || sessionsList[0];
      setSelectedSessionId(activeSess._id || activeSess.id);
    }
  }, [sessionsList, selectedSessionId]);

  // 2. Fetch Terms List for Selected Session
  const { data: termsList = [] } = useQuery({
    queryKey: ['admin-terms-list', selectedSessionId],
    enabled: Boolean(selectedSessionId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/terms', { params: { sessionId: selectedSessionId } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Auto-select first term for session
  useEffect(() => {
    if (termsList.length > 0) {
      const exists = termsList.find((t: any) => (t._id || t.id) === selectedTermId);
      if (!exists) {
        const currentT = termsList.find((t: any) => t.isCurrent) || termsList[0];
        setSelectedTermId(currentT._id || currentT.id);
      }
    }
  }, [termsList, selectedTermId]);

  // 3. Fetch Classes List for Filtering & Fee Structure Form
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

  // 4. Fetch Student Billing & Financial Reports (Tab 1)
  const { data: billingReportData, isLoading: isLoadingBilling, isError: isErrorBilling, refetch: refetchBilling } = useQuery({
    queryKey: ['reports-fees', selectedSessionId, selectedTermId, selectedClassId],
    enabled: Boolean(selectedSessionId && selectedTermId),
    queryFn: async () => {
      const params: any = {
        sessionId: selectedSessionId,
        termId: selectedTermId,
      };
      if (selectedClassId && selectedClassId !== 'all') {
        params.classId = selectedClassId;
      }

      const [summaryRes, debtorsRes] = await Promise.all([
        apiClient.get('/reports/fees-summary', { params: { sessionId: selectedSessionId, termId: selectedTermId } }).catch(() => ({ data: {} })),
        apiClient.get('/reports/outstanding-fees', { params: { ...params, limit: 1000 } }).catch(() => ({ data: {} })),
      ]);

      const summary = summaryRes.data || {};
      const debtorsData = debtorsRes.data || {};
      const debtors = Array.isArray(debtorsData) ? debtorsData : (debtorsData.data || []);

      return {
        totalExpected: summary.expectedFees || 0,
        totalCollected: summary.paidFees || 0,
        totalOutstanding: summary.outstandingFees || 0,
        debtors,
      };
    },
  });

  const debtorsList: any[] = billingReportData?.debtors || [];
  const totalExpected = billingReportData?.totalExpected || 0;
  const totalCollected = billingReportData?.totalCollected || 0;
  const totalOutstanding = billingReportData?.totalOutstanding || 0;

  // Filter debtors by search query
  const filteredDebtors = debtorsList.filter((d: any) => {
    const name = (d.name || d.studentName || '').toLowerCase();
    const cls = (d.class || d.className || '').toLowerCase();
    const q = billingSearch.toLowerCase();
    return !q || name.includes(q) || cls.includes(q);
  });

  // 5. Fetch Fee Structures (Tab 2)
  const { data: feeStructuresList = [], isLoading: isLoadingStructures, refetch: refetchStructures } = useQuery({
    queryKey: ['fees-structures-list', selectedSessionId, selectedTermId],
    enabled: Boolean(selectedSessionId && selectedTermId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/fees', { params: { sessionId: selectedSessionId, termId: selectedTermId } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Structure Form State
  const [structureFormData, setStructureFormData] = useState({
    classId: '',
    sessionId: '',
    termId: '',
    amount: '',
    dueDate: '',
  });

  // Payment Form State
  const [paymentFormData, setPaymentFormData] = useState({
    studentId: '',
    amountPaid: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'check' | 'other',
    reference: '',
  });

  // Handlers for Add & Edit Fee Structure
  const handleOpenAddStructure = () => {
    setIsEditingStructure(false);
    setActiveStructure(null);
    setStructureFormData({
      classId: classesList[0]?._id || classesList[0]?.id || '',
      sessionId: selectedSessionId,
      termId: selectedTermId,
      amount: '',
      dueDate: '',
    });
    setShowAddStructureModal(true);
  };

  const handleOpenEditStructure = (structure: any) => {
    setIsEditingStructure(true);
    setActiveStructure(structure);

    const cId = typeof structure.classId === 'object' ? (structure.classId?._id || structure.classId?.id) : structure.classId;
    const sId = typeof structure.sessionId === 'object' ? (structure.sessionId?._id || structure.sessionId?.id) : structure.sessionId;
    const tId = typeof structure.termId === 'object' ? (structure.termId?._id || structure.termId?.id) : structure.termId;

    setStructureFormData({
      classId: cId || '',
      sessionId: sId || selectedSessionId,
      termId: tId || selectedTermId,
      amount: String(structure.amount || ''),
      dueDate: structure.dueDate ? new Date(structure.dueDate).toISOString().split('T')[0] : '',
    });
    setShowStructureActionModal(false);
    setShowAddStructureModal(true);
  };

  // Mutation: Save Fee Structure (Create / Update)
  const saveStructureMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        classId: structureFormData.classId,
        sessionId: structureFormData.sessionId || selectedSessionId,
        termId: structureFormData.termId || selectedTermId,
        amount: Number(structureFormData.amount),
        dueDate: structureFormData.dueDate,
      };

      if (isEditingStructure && activeStructure) {
        const id = activeStructure._id || activeStructure.id;
        return await apiClient.patch(`/fees/${id}`, payload);
      } else {
        return await apiClient.post('/fees', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees-structures-list'] });
      queryClient.invalidateQueries({ queryKey: ['reports-fees'] });
      setShowAddStructureModal(false);
      Alert.alert(
        'Success',
        isEditingStructure ? 'Fee structure updated successfully!' : 'Fee structure created successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save fee structure.');
    },
  });

  // Mutation: Delete Fee Structure
  const deleteStructureMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/fees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees-structures-list'] });
      queryClient.invalidateQueries({ queryKey: ['reports-fees'] });
      setShowStructureActionModal(false);
      setActiveStructure(null);
      Alert.alert('Success', 'Fee structure deleted successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete fee structure.');
    },
  });

  // Handlers for Record Payment
  const handleOpenRecordPayment = (debtor?: any) => {
    if (debtor) {
      setActiveDebtorStudent(debtor);
      setPaymentFormData({
        studentId: debtor.studentId || debtor._id || debtor.id,
        amountPaid: String(debtor.outstanding || debtor.balance || ''),
        paymentMethod: 'cash',
        reference: '',
      });
    } else {
      setActiveDebtorStudent(null);
      setPaymentFormData({
        studentId: '',
        amountPaid: '',
        paymentMethod: 'cash',
        reference: '',
      });
    }
    setShowRecordPaymentModal(true);
  };

  // Mutation: Record Payment
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        studentId: paymentFormData.studentId,
        amountPaid: Number(paymentFormData.amountPaid),
        paymentMethod: paymentFormData.paymentMethod,
        reference: paymentFormData.reference.trim() || undefined,
        sessionId: selectedSessionId,
        termId: selectedTermId,
        paymentDate: new Date().toISOString(),
      };
      return await apiClient.post('/payments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-fees'] });
      queryClient.invalidateQueries({ queryKey: ['fees-structures-list'] });
      setShowRecordPaymentModal(false);
      Alert.alert('Success', 'Student fee payment recorded successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record fee payment.');
    },
  });

  const selectedSessionObj = sessionsList.find((s: any) => (s._id || s.id) === selectedSessionId);
  const selectedTermObj = termsList.find((t: any) => (t._id || t.id) === selectedTermId);
  const selectedClassFilterObj = classesList.find((c: any) => (c._id || c.id) === selectedClassId);

  const selectedStructureClassObj = classesList.find((c: any) => (c._id || c.id) === structureFormData.classId);
  const selectedStructureClassName = selectedStructureClassObj
    ? `${selectedStructureClassObj.grade} - ${selectedStructureClassObj.name}`
    : 'Select Class';

  const selectedDebtorObj = debtorsList.find(
    (d: any) => (d.studentId || d._id || d.id) === paymentFormData.studentId
  );
  const selectedDebtorName = selectedDebtorObj
    ? `${selectedDebtorObj.name || selectedDebtorObj.studentName} (${selectedDebtorObj.class || 'Class'})`
    : 'Select Student';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Fees & Billing</ThemedText>
          <ThemedText style={styles.sub}>Track billing, fee structures & payments</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdminOrAccountant && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddStructure}>
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <ThemedText style={styles.addBtnText}>Add Fee</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              refetchBilling();
              refetchStructures();
            }}
          >
            <RefreshCw size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Session & Term Selection Card */}
        <View style={styles.sessionTermCard}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.cardHeaderLabel}>ACADEMIC SESSION</ThemedText>
            <TouchableOpacity
              style={styles.pickerTriggerBtn}
              onPress={() => setShowSessionPickerModal(true)}
            >
              <Calendar size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <ThemedText style={styles.pickerTriggerText} numberOfLines={1}>
                {selectedSessionObj?.name || 'Select Session'}
              </ThemedText>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.vDivider} />

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.cardHeaderLabel}>TERM</ThemedText>
            <TouchableOpacity
              style={styles.pickerTriggerBtn}
              onPress={() => setShowTermPickerModal(true)}
              disabled={!selectedSessionId}
            >
              <ThemedText style={styles.pickerTriggerText} numberOfLines={1}>
                {selectedTermObj?.name || 'Select Term'}
              </ThemedText>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]}
            onPress={() => setActiveTab('billing')}
          >
            <Receipt size={16} color={activeTab === 'billing' ? '#38bdf8' : '#64748b'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'billing' && styles.tabBtnTextActive]}>
              Student Billing
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'structures' && styles.tabBtnActive]}
            onPress={() => setActiveTab('structures')}
          >
            <CreditCard size={16} color={activeTab === 'structures' ? '#38bdf8' : '#64748b'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'structures' && styles.tabBtnTextActive]}>
              Fee Configurations
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* TAB 1: STUDENT BILLING & FINANCIAL REPORT */}
        {activeTab === 'billing' && (
          <View style={{ gap: 14 }}>
            {/* Financial Stat Overview */}
            <View style={styles.statsRow}>
              <ThemedView style={styles.statCard}>
                <ThemedText style={styles.statLabel}>Total Expected</ThemedText>
                <ThemedText style={styles.statNum}>₦{totalExpected.toLocaleString()}</ThemedText>
              </ThemedView>

              <ThemedView style={styles.statCard}>
                <ThemedText style={styles.statLabel}>Total Collected</ThemedText>
                <ThemedText style={[styles.statNum, { color: '#4ade80' }]}>
                  ₦{totalCollected.toLocaleString()}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.statCard}>
                <ThemedText style={styles.statLabel}>Outstanding</ThemedText>
                <ThemedText style={[styles.statNum, { color: '#f87171' }]}>
                  ₦{totalOutstanding.toLocaleString()}
                </ThemedText>
              </ThemedView>
            </View>

            {/* Filter & Record Payment Header */}
            <View style={styles.billingActionsRow}>
              <TouchableOpacity
                style={styles.classFilterBtn}
                onPress={() => setShowClassFilterModal(true)}
              >
                <Filter size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                <ThemedText style={styles.classFilterText}>
                  {selectedClassId === 'all' ? 'All Classes' : selectedClassFilterObj?.name || 'Class Filter'}
                </ThemedText>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              {isAdminOrAccountant && (
                <TouchableOpacity
                  style={styles.recordPaymentHeaderBtn}
                  onPress={() => handleOpenRecordPayment()}
                >
                  <DollarSign size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.recordPaymentHeaderBtnText}>Record Payment</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Input */}
            <View style={styles.searchWrapper}>
              <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search student or class..."
                placeholderTextColor="#94a3b8"
                value={billingSearch}
                onChangeText={setBillingSearch}
              />
              {billingSearch ? (
                <TouchableOpacity onPress={() => setBillingSearch('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Debtors & Billing Roster */}
            {isLoadingBilling ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
            ) : isErrorBilling ? (
              <ThemedView style={styles.emptyCard}>
                <ThemedText style={styles.errorText}>Unable to load student billing data.</ThemedText>
              </ThemedView>
            ) : filteredDebtors.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <CheckCircle2 size={32} color="#4ade80" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Outstanding Debtors</ThemedText>
                <ThemedText style={styles.emptySub}>
                  All student fees are fully settled for this session & term.
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={styles.listCard}>
                {filteredDebtors.map((item: any, idx: number) => {
                  const sName = item.name || item.studentName || 'Student';
                  const sClass = item.class || item.className || 'N/A';
                  const total = Number(item.totalFee || item.amount || 0);
                  const paid = Number(item.paid || item.amountPaid || 0);
                  const outstanding = Number(item.outstanding || (total - paid) || 0);

                  const isPaidFull = outstanding <= 0;
                  const isPartial = paid > 0 && outstanding > 0;

                  return (
                    <View key={item.studentId || item._id || idx}>
                      {idx > 0 && <View style={styles.divider} />}
                      <View style={styles.debtorRow}>
                        <View style={styles.avatarBox}>
                          <User size={20} color="#38bdf8" />
                        </View>

                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <ThemedText style={styles.debtorName}>{sName}</ThemedText>
                          <ThemedText style={styles.debtorClass}>{sClass}</ThemedText>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                            <ThemedText style={styles.feeSubText}>Paid: ₦{paid.toLocaleString()}</ThemedText>
                            <ThemedText style={styles.feeSubText}>Total: ₦{total.toLocaleString()}</ThemedText>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <ThemedText
                            style={[
                              styles.outstandingAmountText,
                              isPaidFull && { color: '#4ade80' },
                            ]}
                          >
                            ₦{outstanding.toLocaleString()}
                          </ThemedText>

                          <Badge
                            label={isPaidFull ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                            variant={isPaidFull ? 'success' : isPartial ? 'warning' : 'danger'}
                            size="sm"
                          />

                          {isAdminOrAccountant && !isPaidFull && (
                            <TouchableOpacity
                              style={styles.paySmallBtn}
                              onPress={() => handleOpenRecordPayment(item)}
                            >
                              <ThemedText style={styles.paySmallBtnText}>Pay Fee</ThemedText>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ThemedView>
            )}
          </View>
        )}

        {/* TAB 2: FEE CONFIGURATIONS */}
        {activeTab === 'structures' && (
          <View style={{ gap: 14 }}>
            {isLoadingStructures ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
            ) : feeStructuresList.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <CreditCard size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Fee Structures Configured</ThemedText>
                <ThemedText style={styles.emptySub}>
                  Configure standard tuition & fee amounts for each class arm for this session.
                </ThemedText>
                {isAdminOrAccountant && (
                  <TouchableOpacity style={styles.primaryAddBtn} onPress={handleOpenAddStructure}>
                    <ThemedText style={styles.primaryAddBtnText}>+ Add Fee Structure</ThemedText>
                  </TouchableOpacity>
                )}
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {feeStructuresList.map((item: any, idx: number) => {
                  const classObj = typeof item.classId === 'object' ? item.classId : null;
                  const className = classObj
                    ? `${classObj.grade} - ${classObj.name}`
                    : item.className || 'Class Fee';

                  const amount = Number(item.amount || 0);
                  const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A';

                  return (
                    <ThemedView key={item._id || item.id || idx} style={styles.itemCard}>
                      <View style={styles.iconBox}>
                        <CreditCard size={20} color="#38bdf8" />
                      </View>

                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <ThemedText style={styles.itemName}>{className}</ThemedText>
                        <ThemedText style={styles.itemSub}>Due Date: {dueDate}</ThemedText>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <ThemedText style={styles.structureAmount}>₦{amount.toLocaleString()}</ThemedText>
                        <Badge label="Configured" variant="info" size="sm" />
                      </View>

                      {isAdminOrAccountant && (
                        <TouchableOpacity
                          style={styles.actionIconButton}
                          onPress={() => {
                            setActiveStructure(item);
                            setShowStructureActionModal(true);
                          }}
                        >
                          <MoreVertical size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Session Picker Modal */}
      <Modal visible={showSessionPickerModal} transparent animationType="slide" onRequestClose={() => setShowSessionPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Academic Session</ThemedText>
              <TouchableOpacity onPress={() => setShowSessionPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {sessionsList.map((s: any) => {
                const sId = s._id || s.id;
                const isSelected = selectedSessionId === sId;
                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedSessionId(sId);
                      setShowSessionPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {s.name}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Term Picker Modal */}
      <Modal visible={showTermPickerModal} transparent animationType="slide" onRequestClose={() => setShowTermPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Term</ThemedText>
              <TouchableOpacity onPress={() => setShowTermPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {termsList.map((t: any) => {
                const tId = t._id || t.id;
                const isSelected = selectedTermId === tId;
                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedTermId(tId);
                      setShowTermPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {t.name}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Class Filter Modal */}
      <Modal visible={showClassFilterModal} transparent animationType="slide" onRequestClose={() => setShowClassFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter by Class</ThemedText>
              <TouchableOpacity onPress={() => setShowClassFilterModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.pickerItem, selectedClassId === 'all' && styles.pickerItemActive]}
                onPress={() => {
                  setSelectedClassId('all');
                  setShowClassFilterModal(false);
                }}
              >
                <ThemedText style={[styles.pickerItemText, selectedClassId === 'all' && styles.pickerItemTextActive]}>
                  All Classes
                </ThemedText>
                {selectedClassId === 'all' && <Check size={18} color="#38bdf8" />}
              </TouchableOpacity>

              {classesList.map((c: any) => {
                const cId = c._id || c.id;
                const isSelected = selectedClassId === cId;
                const label = `${c.grade} - ${c.name}`;
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedClassId(cId);
                      setShowClassFilterModal(false);
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

      {/* Fee Structure Action Sheet Modal */}
      <Modal visible={showStructureActionModal} transparent animationType="fade" onRequestClose={() => setShowStructureActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Structure Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowStructureActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => handleOpenEditStructure(activeStructure)}
            >
              <Pencil size={20} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.actionItemTitle}>Edit Fee Structure</ThemedText>
                <ThemedText style={styles.actionItemSub}>Modify class, fee amount & due date</ThemedText>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                const id = activeStructure._id || activeStructure.id;
                Alert.alert(
                  'Delete Fee Structure',
                  'Are you sure you want to delete this class fee structure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteStructureMutation.mutate(id) },
                  ]
                );
              }}
            >
              <Trash2 size={20} color="#f87171" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.actionItemTitle, { color: '#f87171' }]}>Delete Structure</ThemedText>
                <ThemedText style={styles.actionItemSub}>Remove class fee configuration</ThemedText>
              </View>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Add / Edit Fee Structure Modal */}
      <Modal visible={showAddStructureModal} transparent animationType="slide" onRequestClose={() => setShowAddStructureModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowAddStructureModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Target Class *</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowStructureClassPickerModal(true)}
                >
                  <ThemedText style={structureFormData.classId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {selectedStructureClassName}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Fee Amount (NGN) *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={structureFormData.amount}
                  onChangeText={(val) => setStructureFormData((p) => ({ ...p, amount: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <DatePickerField
                  label="Due Date *"
                  value={structureFormData.dueDate}
                  onChange={(val) => setStructureFormData((p) => ({ ...p, dueDate: val }))}
                  placeholder="Select Due Date"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!structureFormData.classId || !structureFormData.amount || !structureFormData.dueDate) && styles.btnDisabled]}
                disabled={!structureFormData.classId || !structureFormData.amount || !structureFormData.dueDate || saveStructureMutation.isPending}
                onPress={() => saveStructureMutation.mutate()}
              >
                {saveStructureMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Save Fee Structure</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Structure Class Picker Modal */}
      <Modal visible={showStructureClassPickerModal} transparent animationType="slide" onRequestClose={() => setShowStructureClassPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Class</ThemedText>
              <TouchableOpacity onPress={() => setShowStructureClassPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {classesList.map((c: any) => {
                const cId = c._id || c.id;
                const isSelected = structureFormData.classId === cId;
                const label = `${c.grade} - ${c.name}`;
                return (
                  <TouchableOpacity
                    key={cId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setStructureFormData((p) => ({ ...p, classId: cId }));
                      setShowStructureClassPickerModal(false);
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

      {/* Record Payment Modal */}
      <Modal visible={showRecordPaymentModal} transparent animationType="slide" onRequestClose={() => setShowRecordPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Record Fee Payment</ThemedText>
              <TouchableOpacity onPress={() => setShowRecordPaymentModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Student Field */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Student *</ThemedText>
                {activeDebtorStudent ? (
                  <View style={styles.formInputDisabled}>
                    <ThemedText style={styles.formInputDisabledText}>
                      {activeDebtorStudent.name || activeDebtorStudent.studentName} ({activeDebtorStudent.class || 'Class'})
                    </ThemedText>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.formInputSelect}
                    onPress={() => setShowStudentPickerModal(true)}
                  >
                    <ThemedText style={paymentFormData.studentId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                      {selectedDebtorName}
                    </ThemedText>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Amount Paid */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Amount Paid (NGN) *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={paymentFormData.amountPaid}
                  onChangeText={(val) => setPaymentFormData((p) => ({ ...p, amountPaid: val }))}
                />
              </View>

              {/* Payment Method */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Payment Method *</ThemedText>
                <View style={styles.methodRow}>
                  <TouchableOpacity
                    style={[styles.methodBtn, paymentFormData.paymentMethod === 'cash' && styles.methodBtnActive]}
                    onPress={() => setPaymentFormData((p) => ({ ...p, paymentMethod: 'cash' }))}
                  >
                    <ThemedText style={[styles.methodBtnText, paymentFormData.paymentMethod === 'cash' && styles.methodBtnTextActive]}>
                      Cash
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodBtn, paymentFormData.paymentMethod === 'bank_transfer' && styles.methodBtnActive]}
                    onPress={() => setPaymentFormData((p) => ({ ...p, paymentMethod: 'bank_transfer' }))}
                  >
                    <ThemedText style={[styles.methodBtnText, paymentFormData.paymentMethod === 'bank_transfer' && styles.methodBtnTextActive]}>
                      Transfer
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodBtn, paymentFormData.paymentMethod === 'check' && styles.methodBtnActive]}
                    onPress={() => setPaymentFormData((p) => ({ ...p, paymentMethod: 'check' }))}
                  >
                    <ThemedText style={[styles.methodBtnText, paymentFormData.paymentMethod === 'check' && styles.methodBtnTextActive]}>
                      Cheque
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reference */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Reference / Receipt No. (Optional)</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. TRX-948201"
                  placeholderTextColor="#64748b"
                  value={paymentFormData.reference}
                  onChangeText={(val) => setPaymentFormData((p) => ({ ...p, reference: val }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!paymentFormData.studentId || !paymentFormData.amountPaid) && styles.btnDisabled]}
                disabled={!paymentFormData.studentId || !paymentFormData.amountPaid || recordPaymentMutation.isPending}
                onPress={() => recordPaymentMutation.mutate()}
              >
                {recordPaymentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Record Payment</ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Debtor Student Picker Modal */}
      <Modal visible={showStudentPickerModal} transparent animationType="slide" onRequestClose={() => setShowStudentPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Student</ThemedText>
              <TouchableOpacity onPress={() => setShowStudentPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {debtorsList.map((d: any) => {
                const sId = d.studentId || d._id || d.id;
                const isSelected = paymentFormData.studentId === sId;
                const name = `${d.name || d.studentName} (${d.class || 'Class'})`;
                return (
                  <TouchableOpacity
                    key={sId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setPaymentFormData((p) => ({
                        ...p,
                        studentId: sId,
                        amountPaid: String(d.outstanding || d.balance || ''),
                      }));
                      setShowStudentPickerModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                        {name}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#94a3b8' }}>
                        Balance: ₦{Number(d.outstanding || 0).toLocaleString()}
                      </ThemedText>
                    </View>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  sessionTermCard: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 14, alignItems: 'center' },
  cardHeaderLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 4 },
  pickerTriggerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 10, height: 36, justifyContent: 'space-between' },
  pickerTriggerText: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc', flex: 1 },
  vDivider: { width: 1, backgroundColor: '#334155', height: '80%', marginHorizontal: 12 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, padding: 4, marginBottom: 14 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8' },
  tabBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  tabBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  billingActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  classFilterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#334155' },
  classFilterText: { flex: 1, fontSize: 13, color: '#f8fafc', fontWeight: '500' },
  recordPaymentHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  recordPaymentHeaderBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, height: 44, marginVertical: 4 },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },
  listCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#334155' },
  debtorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatarBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  debtorName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  debtorClass: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  feeSubText: { fontSize: 11, color: '#cbd5e1' },
  outstandingAmountText: { fontSize: 15, fontWeight: 'bold', color: '#f87171' },
  paySmallBtn: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 2 },
  paySmallBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  itemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  structureAmount: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  actionIconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#334155' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  primaryAddBtn: { marginTop: 12, backgroundColor: '#0284c7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  primaryAddBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  modalActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionItemTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  actionItemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: '#334155', marginVertical: 4 },
  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 42, fontSize: 14 },
  formInputDisabled: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12, height: 42, justifyContent: 'center' },
  formInputDisabledText: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },
  formInputSelect: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 42 },
  formInputSelectText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  formInputPlaceholder: { color: '#64748b', fontSize: 14 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 9, alignItems: 'center' },
  methodBtnActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  methodBtnText: { fontSize: 12, color: '#94a3b8' },
  methodBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#0f172a', marginBottom: 6 },
  pickerItemActive: { borderColor: '#38bdf8', borderWidth: 1, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  pickerItemText: { fontSize: 14, color: '#cbd5e1' },
  pickerItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
