import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Inbox,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  User,
  BookOpen,
  Shield,
  Heart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

type StatusFilter = 'pending' | 'accepted' | 'rejected' | 'all';

export default function ApplicationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [appToAccept, setAppToAccept] = useState<any | null>(null);
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [createStudentAccount, setCreateStudentAccount] = useState(true);
  const [createParentAccount, setCreateParentAccount] = useState(true);

  // Active Detail Tab: 'personal' | 'academic' | 'guardian' | 'health'
  const [detailTab, setDetailTab] = useState<'personal' | 'academic' | 'guardian' | 'health'>('personal');

  // 1. Fetch Applications Query
  const { data: rawAppsData = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-applications-list', statusFilter, searchQuery],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await apiClient.get('/applications', { params }).catch(() => ({ data: [] }));
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  // Calculate Metrics from raw data
  const totalAppsCount = rawAppsData.length;
  const pendingCount = rawAppsData.filter((a: any) => a.status === 'pending').length;
  const acceptedCount = rawAppsData.filter((a: any) => a.status === 'accepted').length;
  const rejectedCount = rawAppsData.filter((a: any) => a.status === 'rejected').length;

  // Filter list by local search if search API is non-exhaustive
  const filteredApps = rawAppsData.filter((app: any) => {
    const fullName = `${app.firstName || ''} ${app.lastName || ''}`.toLowerCase();
    const phone = (app.parentPhone || app.guardian?.phone || '').toLowerCase();
    const className = (app.classId?.name || app.applyingForClass || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return !q || fullName.includes(q) || phone.includes(q) || className.includes(q);
  });

  // 2. Mutations
  const acceptMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await apiClient.patch(`/applications/${id}/accept`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students-list'] });
      setShowAcceptModal(false);
      setShowDetailModal(false);
      setAppToAccept(null);
      setAdmissionNumber('');
      Alert.alert('Success 🎉', 'Application accepted! Student record & accounts have been created.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept application.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch(`/applications/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications-list'] });
      setShowDetailModal(false);
      Alert.alert('Success', 'Application rejected.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reject application.');
    },
  });

  // Handlers
  const handleOpenDetail = (app: any) => {
    setSelectedApp(app);
    setDetailTab('personal');
    setShowDetailModal(true);
  };

  const handleOpenAccept = (app: any) => {
    setAppToAccept(app);
    // Auto-generate suggested admission number
    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setAdmissionNumber(`ADM-${currentYear}-${randomCode}`);
    setCreateStudentAccount(true);
    setCreateParentAccount(true);
    setShowAcceptModal(true);
  };

  const handleConfirmAccept = () => {
    if (!admissionNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid Admission Number.');
      return;
    }
    acceptMutation.mutate({
      id: appToAccept._id || appToAccept.id,
      payload: {
        admissionNumber: admissionNumber.trim(),
        createStudentAccount,
        createParentAccount,
      },
    });
  };

  const handlePromptReject = (app: any) => {
    const name = `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'this applicant';
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${name}'s admission application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => rejectMutation.mutate(app._id || app.id),
        },
      ]
    );
  };

  const getStatusVariant = (st: string) => {
    switch (st?.toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Admissions & Applications</ThemedText>
          <ThemedText style={styles.sub}>Review and process online admission requests</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Metrics Row */}
        <View style={styles.metricsGrid}>
          <ThemedView style={styles.metricCard}>
            <Inbox size={18} color="#38bdf8" style={{ marginBottom: 6 }} />
            <ThemedText style={styles.metricNum}>{totalAppsCount}</ThemedText>
            <ThemedText style={styles.metricLabel}>Total Apps</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <Award size={18} color="#fbbf24" style={{ marginBottom: 6 }} />
            <ThemedText style={[styles.metricNum, { color: '#fbbf24' }]}>{pendingCount}</ThemedText>
            <ThemedText style={styles.metricLabel}>Pending</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <CheckCircle2 size={18} color="#4ade80" style={{ marginBottom: 6 }} />
            <ThemedText style={[styles.metricNum, { color: '#4ade80' }]}>{acceptedCount}</ThemedText>
            <ThemedText style={styles.metricLabel}>Accepted</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <XCircle size={18} color="#f87171" style={{ marginBottom: 6 }} />
            <ThemedText style={[styles.metricNum, { color: '#f87171' }]}>{rejectedCount}</ThemedText>
            <ThemedText style={styles.metricLabel}>Rejected</ThemedText>
          </ThemedView>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search applicant, class, or parent phone..."
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

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ gap: 8 }}>
          {(['pending', 'accepted', 'rejected', 'all'] as StatusFilter[]).map((st) => {
            const isActive = statusFilter === st;
            const label =
              st === 'pending'
                ? 'Pending Review'
                : st === 'accepted'
                ? 'Accepted Students'
                : st === 'rejected'
                ? 'Rejected'
                : 'All Applications';

            return (
              <TouchableOpacity
                key={st}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setStatusFilter(st)}
              >
                <ThemedText style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Roster List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <XCircle size={32} color="#f87171" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>Unable to load applications</ThemedText>
            <ThemedText style={styles.emptySub}>Check network connection or try refreshing.</ThemedText>
          </ThemedView>
        ) : filteredApps.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Inbox size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Applications Found</ThemedText>
            <ThemedText style={styles.emptySub}>
              {statusFilter === 'pending'
                ? 'There are no pending admission requests at this moment.'
                : 'No student applications match the selected filter.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredApps.map((item: any, idx: number) => {
              const fullName = `${item.firstName || ''} ${item.middleName ? item.middleName + ' ' : ''}${item.lastName || ''}`.trim() || 'Applicant';
              const appliedClassName = item.classId?.name
                ? `${item.classId?.grade ? item.classId.grade + ' - ' : ''}${item.classId.name}`
                : item.applyingForClass || 'Class Arm N/A';

              const phone = item.parentPhone || item.guardian?.phone || 'N/A';
              const appliedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent';
              const isPending = item.status === 'pending';

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.appCard}>
                  <View style={styles.appCardHeader}>
                    <View style={styles.avatarBox}>
                      <User size={20} color="#38bdf8" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.applicantName}>{fullName}</ThemedText>
                      <ThemedText style={styles.appliedClassText}>Applying for: {appliedClassName}</ThemedText>
                    </View>

                    <Badge label={(item.status || 'pending').toUpperCase()} variant={getStatusVariant(item.status)} size="sm" />
                  </View>

                  <View style={styles.appDivider} />

                  <View style={styles.appCardBody}>
                    <View style={styles.metaCol}>
                      <ThemedText style={styles.metaLabel}>Parent Phone</ThemedText>
                      <ThemedText style={styles.metaVal}>{phone}</ThemedText>
                    </View>
                    <View style={styles.metaCol}>
                      <ThemedText style={styles.metaLabel}>Date Submitted</ThemedText>
                      <ThemedText style={styles.metaVal}>{appliedDate}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={styles.actionReviewBtn} onPress={() => handleOpenDetail(item)}>
                      <Eye size={15} color="#38bdf8" style={{ marginRight: 6 }} />
                      <ThemedText style={styles.actionReviewText}>View Details</ThemedText>
                    </TouchableOpacity>

                    {isPending && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.actionRejectBtn} onPress={() => handlePromptReject(item)}>
                          <XCircle size={15} color="#f87171" style={{ marginRight: 4 }} />
                          <ThemedText style={styles.actionRejectText}>Reject</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionAcceptBtn} onPress={() => handleOpenAccept(item)}>
                          <CheckCircle2 size={15} color="#ffffff" style={{ marginRight: 4 }} />
                          <ThemedText style={styles.actionAcceptText}>Accept</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail Review Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>
                  {selectedApp ? `${selectedApp.firstName} ${selectedApp.lastName}'s Application` : 'Application Details'}
                </ThemedText>
                <ThemedText style={styles.modalSub}>
                  Submitted on {selectedApp?.createdAt ? new Date(selectedApp.createdAt).toLocaleDateString() : 'N/A'}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Status Indicator */}
            {selectedApp && (
              <View style={styles.modalStatusBanner}>
                <ThemedText style={styles.bannerText}>Application Status:</ThemedText>
                <Badge label={(selectedApp.status || 'pending').toUpperCase()} variant={getStatusVariant(selectedApp.status)} size="md" />
              </View>
            )}

            {/* Segmented Subtabs inside Detail Modal */}
            <View style={styles.detailSegmentRow}>
              {[
                { id: 'personal', label: 'Personal', icon: User },
                { id: 'academic', label: 'Academic', icon: BookOpen },
                { id: 'guardian', label: 'Guardian', icon: Shield },
                { id: 'health', label: 'Health', icon: Heart },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = detailTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.detailSegmentBtn, isActive && styles.detailSegmentBtnActive]}
                    onPress={() => setDetailTab(tab.id as any)}
                  >
                    <IconComp size={14} color={isActive ? '#0284c7' : '#94a3b8'} style={{ marginBottom: 2 }} />
                    <ThemedText style={[styles.detailSegmentText, isActive && styles.detailSegmentTextActive]}>
                      {tab.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {selectedApp && detailTab === 'personal' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Personal Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Full Name</ThemedText>
                      <ThemedText style={styles.infoVal}>{`${selectedApp.firstName || ''} ${selectedApp.middleName || ''} ${selectedApp.lastName || ''}`.trim()}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Gender</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.gender || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Date of Birth</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.dateOfBirth ? new Date(selectedApp.dateOfBirth).toLocaleDateString() : 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Nationality</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.nationality || 'Nigerian'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>State / LGA</ThemedText>
                      <ThemedText style={styles.infoVal}>{`${selectedApp.stateOfOrigin || 'N/A'}${selectedApp.lga ? ' / ' + selectedApp.lga : ''}`}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Religion</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.religion || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Residential Address</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.address || 'N/A'}</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {selectedApp && detailTab === 'academic' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Academic Details</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Class Applied For</ThemedText>
                      <ThemedText style={[styles.infoVal, { color: '#38bdf8', fontWeight: 'bold' }]}>
                        {selectedApp.classId?.name
                          ? `${selectedApp.classId?.grade ? selectedApp.classId.grade + ' - ' : ''}${selectedApp.classId.name}`
                          : selectedApp.applyingForClass || 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Previous School Attended</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.previousSchool || 'None / First Time'}</ThemedText>
                    </View>
                    {selectedApp.reasonForLeaving ? (
                      <View style={styles.infoRowFull}>
                        <ThemedText style={styles.infoKey}>Reason for Leaving</ThemedText>
                        <ThemedText style={styles.infoVal}>{selectedApp.reasonForLeaving}</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}

              {selectedApp && detailTab === 'guardian' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Guardian / Parent Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Guardian Name</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.name || selectedApp.parentName || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Relationship</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.relationship || 'Parent/Guardian'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Phone Number</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.phone || selectedApp.parentPhone || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Email Address</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.email || selectedApp.parentEmail || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Occupation</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.occupation || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Address</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.guardian?.address || selectedApp.address || 'Same as applicant'}</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {selectedApp && detailTab === 'health' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Health & Emergency Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Emergency Contact</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {selectedApp.healthInfo?.emergencyContactName || 'N/A'}{' '}
                        {selectedApp.healthInfo?.emergencyContactPhone ? `(${selectedApp.healthInfo.emergencyContactPhone})` : ''}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Blood Group</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.healthInfo?.bloodGroup || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Genotype</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedApp.healthInfo?.genotype || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Allergies</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {Array.isArray(selectedApp.healthInfo?.allergies)
                          ? selectedApp.healthInfo.allergies.join(', ') || 'None recorded'
                          : selectedApp.healthInfo?.allergies || 'None recorded'}
                      </ThemedText>
                    </View>
                    {selectedApp.healthInfo?.chronicConditions ? (
                      <View style={styles.infoRowFull}>
                        <ThemedText style={styles.infoKey}>Chronic Conditions</ThemedText>
                        <ThemedText style={styles.infoVal}>{selectedApp.healthInfo.chronicConditions}</ThemedText>
                      </View>
                    ) : null}
                    {selectedApp.healthInfo?.disabilities ? (
                      <View style={styles.infoRowFull}>
                        <ThemedText style={styles.infoKey}>Disabilities</ThemedText>
                        <ThemedText style={styles.infoVal}>{selectedApp.healthInfo.disabilities}</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Actions */}
            {selectedApp && selectedApp.status === 'pending' && (
              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={styles.modalRejectBtn}
                  onPress={() => handlePromptReject(selectedApp)}
                >
                  <XCircle size={16} color="#f87171" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.modalRejectText}>Reject Application</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAcceptBtn}
                  onPress={() => handleOpenAccept(selectedApp)}
                >
                  <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.modalAcceptText}>Accept & Admit</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Accept & Admit Modal */}
      <Modal visible={showAcceptModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>Accept Application</ThemedText>
                <ThemedText style={styles.modalSub}>
                  Create student profile for {appToAccept ? `${appToAccept.firstName} ${appToAccept.lastName}` : 'Applicant'}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAcceptModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
              {/* Admission Number Field */}
              <View style={styles.fieldWrapper}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={styles.fieldLabel}>Admission Number *</ThemedText>
                  <TouchableOpacity
                    style={styles.autoGenBtn}
                    onPress={() => {
                      const yr = new Date().getFullYear();
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setAdmissionNumber(`ADM-${yr}-${rand}`);
                    }}
                  >
                    <Sparkles size={12} color="#0284c7" style={{ marginRight: 4 }} />
                    <ThemedText style={styles.autoGenText}>Auto Gen</ThemedText>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ADM-2026-104"
                  placeholderTextColor="#94a3b8"
                  value={admissionNumber}
                  onChangeText={setAdmissionNumber}
                />
              </View>

              {/* Switches */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.switchTitle}>Create Student Portal Account</ThemedText>
                  <ThemedText style={styles.switchSub}>Generate student login credentials</ThemedText>
                </View>
                <Switch
                  value={createStudentAccount}
                  onValueChange={setCreateStudentAccount}
                  trackColor={{ false: '#334155', true: '#0284c7' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.switchTitle}>Create Parent Portal Account</ThemedText>
                  <ThemedText style={styles.switchSub}>Generate parent login credentials</ThemedText>
                </View>
                <Switch
                  value={createParentAccount}
                  onValueChange={setCreateParentAccount}
                  trackColor={{ false: '#334155', true: '#0284c7' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Confirmation Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, acceptMutation.isPending && { opacity: 0.6 }]}
                onPress={handleConfirmAccept}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.confirmBtnText}>Confirm Admission</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  content: { padding: 16 },

  // Metrics Grid
  metricsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  metricNum: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  metricLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  // Filter Tabs
  tabsRow: { marginBottom: 16 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#ffffff' },

  // Cards
  appCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  appCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  applicantName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  appliedClassText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  appDivider: { height: 1, backgroundColor: '#334155' },
  appCardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { gap: 2 },
  metaLabel: { fontSize: 11, color: '#64748b' },
  metaVal: { fontSize: 13, color: '#cbd5e1', fontWeight: '500' },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  actionReviewBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  actionReviewText: { fontSize: 12, color: '#38bdf8', fontWeight: '600' },
  actionRejectBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  actionRejectText: { fontSize: 12, color: '#f87171', fontWeight: '600' },
  actionAcceptBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#16a34a' },
  actionAcceptText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold' },

  // Empty state
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { height: '88%', backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContentSmall: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  modalSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  modalStatusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  bannerText: { fontSize: 13, color: '#cbd5e1', fontWeight: '500' },

  // Subtabs
  detailSegmentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  detailSegmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center' },
  detailSegmentBtnActive: { backgroundColor: 'rgba(2, 132, 199, 0.18)', borderWidth: 1, borderColor: '#0284c7' },
  detailSegmentText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  detailSegmentTextActive: { color: '#38bdf8' },

  detailScroll: { padding: 16 },
  detailSectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8 },

  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'column', gap: 2 },
  infoRowFull: { flexDirection: 'column', gap: 2 },
  infoKey: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  infoVal: { fontSize: 14, color: '#f8fafc', fontWeight: '500' },

  // Modal Actions
  modalFooterActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' },
  modalRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444' },
  modalRejectText: { color: '#f87171', fontWeight: 'bold', fontSize: 14 },
  modalAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#16a34a' },
  modalAcceptText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Accept Form
  fieldWrapper: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
  autoGenBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(2, 132, 199, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  autoGenText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },
  textInput: { height: 46, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12, color: '#f8fafc', borderWidth: 1, borderColor: '#334155', fontSize: 14 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  switchTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  switchSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: '#16a34a', marginTop: 8 },
  confirmBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
