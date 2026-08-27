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
  Briefcase,
  Users,
  Check,
  X,
  SlidersHorizontal,
  Edit,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export type AdminLeaveTab = 'approvals' | 'configure';

export default function AdminLeaveManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminLeaveTab>('approvals');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  // Approval Modal State
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [targetStatus, setTargetStatus] = useState<'approved' | 'rejected'>('approved');
  const [adminRemark, setAdminRemark] = useState<string>('');

  // Configure Leave Type Modal State
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    daysAllowed: '20',
    isPaid: true,
  });

  // 1. Fetch All Staff Leave Requests (Admin)
  const {
    data: leaveRequests = [],
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
    isRefetching: isRefetchingRequests,
  } = useQuery({
    queryKey: ['admin-leave-requests', statusFilter],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/leave-requests', { params: { status: statusFilter } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Configured Leave Types (Admin)
  const {
    data: leaveTypes = [],
    isLoading: isLoadingTypes,
    refetch: refetchTypes,
  } = useQuery({
    queryKey: ['admin-leave-types'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/leave-types');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Update Request Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) return;
      const reqId = selectedRequest._id || selectedRequest.id;
      const res = await apiClient.patch(`/admin/leave-requests/${reqId}/status`, {
        status: targetStatus,
        adminRemark: adminRemark.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setApprovalModalVisible(false);
      setSelectedRequest(null);
      setAdminRemark('');
      Alert.alert(
        targetStatus === 'approved' ? 'Leave Request Approved 🎉' : 'Leave Request Rejected ❌',
        'Staff leave status updated successfully.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
    onError: (err: any) => {
      Alert.alert('Update Failed', err.response?.data?.message || 'Failed to update request status.');
    },
  });

  // Create Leave Type Mutation
  const createTypeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: typeForm.name.trim(),
        description: typeForm.description.trim(),
        daysAllowed: Number(typeForm.daysAllowed) || 20,
        isPaid: typeForm.isPaid,
      };
      const res = await apiClient.post('/admin/leave-types', payload);
      return res.data;
    },
    onSuccess: () => {
      setConfigModalVisible(false);
      setTypeForm({ name: '', description: '', daysAllowed: '20', isPaid: true });
      Alert.alert('Leave Policy Created 🎉', 'New leave type configured successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-types'] });
    },
    onError: (err: any) => {
      Alert.alert('Creation Failed', err.response?.data?.message || 'Failed to create leave type.');
    },
  });

  const openApprovalModal = (requestObj: any, statusAction: 'approved' | 'rejected') => {
    setSelectedRequest(requestObj);
    setTargetStatus(statusAction);
    setAdminRemark(statusAction === 'approved' ? 'Approved by Admin.' : 'Declined due to operational requirements.');
    setApprovalModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Leave Management</ThemedText>
          <ThemedText style={styles.sub}>Staff Requests & Policy Setup</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingRequests}
            onRefresh={() => {
              refetchRequests();
              refetchTypes();
            }}
            tintColor="#38bdf8"
          />
        }
      >
        {/* Segmented Control */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'approvals' && styles.tabBtnActive]}
            onPress={() => setActiveTab('approvals')}
          >
            <Clock size={15} color={activeTab === 'approvals' ? '#ffffff' : '#94a3b8'} />
            <ThemedText style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}>
              Staff Requests ({leaveRequests.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'configure' && styles.tabBtnActive]}
            onPress={() => setActiveTab('configure')}
          >
            <SlidersHorizontal size={15} color={activeTab === 'configure' ? '#ffffff' : '#94a3b8'} />
            <ThemedText style={[styles.tabText, activeTab === 'configure' && styles.tabTextActive]}>
              Configure Policies ({leaveTypes.length})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* TAB 1: STAFF REQUESTS APPROVALS */}
        {activeTab === 'approvals' && (
          <>
            {/* Status Filter Chips */}
            <View style={styles.statusChipsRow}>
              {['pending', 'approved', 'rejected', 'all'].map((st) => {
                const isSel = statusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chipBtn, isSel && styles.chipBtnActive]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <ThemedText style={[styles.chipText, isSel && styles.chipTextActive]}>
                      {st.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Requests List */}
            {isLoadingRequests ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
            ) : leaveRequests.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Users size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Leave Requests</ThemedText>
                <ThemedText style={styles.emptySub}>No staff leave applications matching this filter.</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 12 }}>
                {leaveRequests.map((req: any) => {
                  const staffName = req.staffId?.fullName || req.staffId?.name || 'Staff Member';
                  const staffRole = (req.staffId?.role || 'staff').toUpperCase();
                  const typeName = req.leaveTypeId?.name || 'Leave';
                  const stDate = new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const enDate = new Date(req.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const status = (req.status || 'pending').toLowerCase();

                  return (
                    <ThemedView key={req._id || req.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.avatarBox}>
                          <ThemedText style={styles.avatarText}>
                            {(staffName || 'S').charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>

                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.staffName}>{staffName}</ThemedText>
                          <ThemedText style={styles.requestSub}>
                            {staffRole} • {typeName}
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

                      <View style={styles.dateBox}>
                        <Calendar size={14} color="#38bdf8" />
                        <ThemedText style={styles.dateBoxText}>
                          {stDate} – {enDate} ({req.daysRequested} {req.daysRequested === 1 ? 'day' : 'days'})
                        </ThemedText>
                      </View>

                      <ThemedText style={styles.reasonText}>Reason: "{req.reason}"</ThemedText>

                      {req.adminRemark && (
                        <View style={styles.adminRemarkBox}>
                          <ThemedText style={styles.adminRemarkLabel}>Admin Note:</ThemedText>
                          <ThemedText style={styles.adminRemarkVal}>{req.adminRemark}</ThemedText>
                        </View>
                      )}

                      {/* Action Buttons for Pending Requests */}
                      {status === 'pending' && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => openApprovalModal(req, 'approved')}
                          >
                            <CheckCircle2 size={15} color="#ffffff" />
                            <ThemedText style={styles.approveBtnText}>APPROVE</ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => openApprovalModal(req, 'rejected')}
                          >
                            <XCircle size={15} color="#ffffff" />
                            <ThemedText style={styles.rejectBtnText}>REJECT</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* TAB 2: CONFIGURE LEAVE TYPES */}
        {activeTab === 'configure' && (
          <>
            <TouchableOpacity style={styles.addTypeBtn} onPress={() => setConfigModalVisible(true)}>
              <Plus size={16} color="#ffffff" />
              <ThemedText style={styles.addTypeBtnText}>CONFIGURE NEW LEAVE TYPE</ThemedText>
            </TouchableOpacity>

            {isLoadingTypes ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
            ) : leaveTypes.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Briefcase size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Leave Policies</ThemedText>
                <ThemedText style={styles.emptySub}>No active leave categories configured yet.</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 12 }}>
                {leaveTypes.map((type: any) => (
                  <ThemedView key={type._id || type.id} style={styles.typeCard}>
                    <View style={styles.typeCardHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.typeName}>{type.name}</ThemedText>
                        {type.description && <ThemedText style={styles.typeSub}>{type.description}</ThemedText>}
                      </View>
                      <Badge label={type.isPaid ? 'PAID' : 'UNPAID'} variant={type.isPaid ? 'success' : 'neutral'} size="sm" />
                    </View>

                    <View style={styles.typeMetaRow}>
                      <View style={styles.typeMetaItem}>
                        <Calendar size={14} color="#38bdf8" />
                        <ThemedText style={styles.typeMetaText}>{type.daysAllowed} Days / Year</ThemedText>
                      </View>
                    </View>
                  </ThemedView>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* APPROVAL / REJECTION MODAL */}
      <Modal visible={approvalModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {targetStatus === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </ThemedText>
              <TouchableOpacity onPress={() => setApprovalModalVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={{ gap: 12, paddingVertical: 10 }}>
                <ThemedText style={{ color: '#cbd5e1', fontSize: 13 }}>
                  Staff: <ThemedText style={{ fontWeight: 'bold', color: '#f8fafc' }}>{selectedRequest.staffId?.fullName || selectedRequest.staffId?.name}</ThemedText> ({selectedRequest.daysRequested} Days)
                </ThemedText>

                <View style={{ gap: 6 }}>
                  <ThemedText style={styles.inputLabel}>ADMIN REMARK / DECISION REASON:</ThemedText>
                  <TextInput
                    style={styles.remarkInput}
                    placeholder="Enter remark for staff member..."
                    placeholderTextColor="#64748b"
                    multiline
                    value={adminRemark}
                    onChangeText={setAdminRemark}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmActionBtn,
                    { backgroundColor: targetStatus === 'approved' ? '#22c55e' : '#ef4444' },
                    updateStatusMutation.isPending && { opacity: 0.5 },
                  ]}
                  disabled={updateStatusMutation.isPending}
                  onPress={() => updateStatusMutation.mutate()}
                >
                  {updateStatusMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.confirmActionBtnText}>
                      CONFIRM {targetStatus.toUpperCase()}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* CONFIGURE LEAVE TYPE MODAL */}
      <Modal visible={configModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Configure Leave Policy</ThemedText>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>LEAVE CATEGORY NAME:</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Annual Leave, Sick Leave"
                  placeholderTextColor="#64748b"
                  value={typeForm.name}
                  onChangeText={(val) => setTypeForm((prev) => ({ ...prev, name: val }))}
                />
              </View>

              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>DAYS ALLOWED PER YEAR:</ThemedText>
                <TextInput
                  style={styles.formInput}
                  keyboardType="number-pad"
                  placeholder="e.g. 20"
                  placeholderTextColor="#64748b"
                  value={typeForm.daysAllowed}
                  onChangeText={(val) => setTypeForm((prev) => ({ ...prev, daysAllowed: val }))}
                />
              </View>

              <View style={{ gap: 6 }}>
                <ThemedText style={styles.inputLabel}>DESCRIPTION / NOTES:</ThemedText>
                <TextInput
                  style={[styles.formInput, { height: 60 }]}
                  placeholder="Brief description of leave policy..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={typeForm.description}
                  onChangeText={(val) => setTypeForm((prev) => ({ ...prev, description: val }))}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  (!typeForm.name.trim() || createTypeMutation.isPending) && { opacity: 0.5 },
                ]}
                disabled={!typeForm.name.trim() || createTypeMutation.isPending}
                onPress={() => createTypeMutation.mutate()}
              >
                {createTypeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.confirmActionBtnText}>CREATE LEAVE POLICY</ThemedText>
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

  content: { padding: 16, gap: 14 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#0284c7' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#ffffff', fontWeight: 'bold' },

  statusChipsRow: { flexDirection: 'row', gap: 8 },
  chipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  chipTextActive: { color: '#ffffff', fontWeight: 'bold' },

  requestCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  staffName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  requestSub: { fontSize: 12, color: '#38bdf8', marginTop: 1 },

  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  dateBoxText: { fontSize: 12, color: '#f8fafc', fontWeight: '500' },
  reasonText: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 16 },

  adminRemarkBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', gap: 2 },
  adminRemarkLabel: { fontSize: 10, fontWeight: 'bold', color: '#fbbf24' },
  adminRemarkVal: { fontSize: 12, color: '#f8fafc' },

  actionButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 10, borderRadius: 10 },
  approveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 10 },
  rejectBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  addTypeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 12 },
  addTypeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  typeCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  typeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  typeSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  typeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeMetaText: { fontSize: 12, color: '#38bdf8', fontWeight: '500' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },

  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8' },
  remarkInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 13, borderWidth: 1, borderColor: '#334155', minHeight: 70, textAlignVertical: 'top' },
  formInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 13, borderWidth: 1, borderColor: '#334155' },
  confirmActionBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  confirmActionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});
