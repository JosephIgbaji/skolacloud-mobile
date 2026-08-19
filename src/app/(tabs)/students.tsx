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
  Users,
  Search,
  GraduationCap,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Check,
  UserCheck,
  UserX,
  UserPlus,
  Pencil,
  X,
  User,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

const initialStudentFormState = {
  firstName: '',
  lastName: '',
  middleName: '',
  admissionNumber: '',
  gender: 'male' as 'male' | 'female',
  dateOfBirth: '',
  placeOfBirth: '',
  address: '',
  nationality: 'Nigerian',
  stateOfOrigin: '',
  lga: '',
  religion: '',
  parentPhone: '',
  classId: '',
  previousSchool: '',
  reasonForLeaving: '',
  guardian: {
    name: '',
    relationship: 'Father',
    phone: '',
    email: '',
    occupation: '',
    address: '',
  },
  healthInfo: {
    bloodGroup: '',
    genotype: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  },
  createStudentAccount: false,
  createParentAccount: false,
};

export default function StudentsScreen() {
  const { user } = useAuth();
  const rawRole = (user?.role || 'student').toLowerCase();
  const isAdminOrAccountant = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant';
  const queryClient = useQueryClient();

  // Filter & Pagination States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('');

  // Action Modal State
  const [activeStudent, setActiveStudent] = useState<any | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [targetPromoteClassId, setTargetPromoteClassId] = useState('');

  // Add & Edit Student Form Modal State
  const [showStudentFormModal, setShowStudentFormModal] = useState(false);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'guardian' | 'health' | 'account'>('basic');

  const [studentForm, setStudentForm] = useState(initialStudentFormState);

  // Fetch Classes List for Filter, Promotion & Form Selection
  const { data: classesList = [] } = useQuery({
    queryKey: ['school-classes'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/classes');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Paginated & Filtered Students from Backend API
  const { data: studentsResponse, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['students-table', rawRole, page, limit, search, statusFilter, genderFilter, selectedClassId],
    staleTime: 0,
    queryFn: async () => {
      let endpoint = '/admin/students';
      if (rawRole === 'teacher') endpoint = '/teacher/students';
      if (rawRole === 'parent') endpoint = '/parent/students';
      if (rawRole === 'student') endpoint = '/student/profile';

      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (genderFilter !== 'all') params.gender = genderFilter;
      if (selectedClassId) params.classId = selectedClassId;

      const res = await apiClient.get(endpoint, { params });
      const rawData = res.data;

      let list: any[] = [];
      let total = 0;
      let totalPages = 1;

      if (Array.isArray(rawData)) {
        list = rawData;
        total = rawData.length;
        totalPages = 1;
      } else if (rawData && typeof rawData === 'object') {
        list = Array.isArray(rawData.data) ? rawData.data : Array.isArray(rawData.students) ? rawData.students : [];
        total = rawData.total ?? list.length;
        totalPages = rawData.pages ?? rawData.totalPages ?? Math.max(1, Math.ceil(total / limit));
      }

      return { list, total, totalPages };
    },
  });

  const students = studentsResponse?.list || [];
  const totalStudents = studentsResponse?.total || 0;
  const totalPages = studentsResponse?.totalPages || 1;

  // Handlers for Add & Edit Forms
  const handleOpenAddStudent = () => {
    setIsEditingStudent(false);
    setEditingStudentId(null);
    setActiveFormTab('basic');
    setStudentForm({
      ...initialStudentFormState,
      classId: classesList[0]?._id || classesList[0]?.id || '',
    });
    setShowStudentFormModal(true);
  };

  const handleOpenEditStudent = (student: any) => {
    setIsEditingStudent(true);
    setEditingStudentId(student._id || student.id);
    setActiveFormTab('basic');
    const existingClassId = typeof student.classId === 'object' ? student.classId?._id || student.classId?.id : student.classId;

    setStudentForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      middleName: student.middleName || '',
      admissionNumber: student.admissionNumber || student.admissionNo || '',
      gender: (student.gender || 'male').toLowerCase() as 'male' | 'female',
      dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).split('T')[0] : '',
      placeOfBirth: student.placeOfBirth || '',
      address: student.address || '',
      nationality: student.nationality || 'Nigerian',
      stateOfOrigin: student.stateOfOrigin || '',
      lga: student.lga || '',
      religion: student.religion || '',
      parentPhone: student.parentPhone || '',
      classId: existingClassId || classesList[0]?._id || '',
      previousSchool: student.previousSchool || '',
      reasonForLeaving: student.reasonForLeaving || '',
      guardian: {
        name: student.guardian?.name || '',
        relationship: student.guardian?.relationship || 'Father',
        phone: student.guardian?.phone || student.parentPhone || '',
        email: student.guardian?.email || '',
        occupation: student.guardian?.occupation || '',
        address: student.guardian?.address || student.address || '',
      },
      healthInfo: {
        bloodGroup: student.healthInfo?.bloodGroup || '',
        genotype: student.healthInfo?.genotype || '',
        allergies: Array.isArray(student.healthInfo?.allergies) ? student.healthInfo.allergies.join(', ') : student.healthInfo?.allergies || '',
        chronicConditions: student.healthInfo?.chronicConditions || '',
        emergencyContactName: student.healthInfo?.emergencyContactName || '',
        emergencyContactPhone: student.healthInfo?.emergencyContactPhone || '',
      },
      createStudentAccount: false,
      createParentAccount: false,
    });
    setShowActionModal(false);
    setShowStudentFormModal(true);
  };

  // Mutation: Save Student Record (Create / Update)
  const saveStudentMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        middleName: studentForm.middleName.trim(),
        gender: studentForm.gender,
        parentPhone: studentForm.parentPhone.trim(),
        classId: studentForm.classId,
      };

      if (studentForm.admissionNumber.trim()) payload.admissionNumber = studentForm.admissionNumber.trim();
      if (studentForm.dateOfBirth) payload.dateOfBirth = studentForm.dateOfBirth;
      if (studentForm.placeOfBirth.trim()) payload.placeOfBirth = studentForm.placeOfBirth.trim();
      if (studentForm.address.trim()) payload.address = studentForm.address.trim();
      if (studentForm.nationality) payload.nationality = studentForm.nationality;
      if (studentForm.stateOfOrigin.trim()) payload.stateOfOrigin = studentForm.stateOfOrigin.trim();
      if (studentForm.lga.trim()) payload.lga = studentForm.lga.trim();
      if (studentForm.religion.trim()) payload.religion = studentForm.religion.trim();
      if (studentForm.previousSchool.trim()) payload.previousSchool = studentForm.previousSchool.trim();
      if (studentForm.reasonForLeaving.trim()) payload.reasonForLeaving = studentForm.reasonForLeaving.trim();

      // Guardian Sub-document
      if (studentForm.guardian.name.trim() || studentForm.guardian.phone.trim()) {
        payload.guardian = {
          name: studentForm.guardian.name.trim(),
          relationship: studentForm.guardian.relationship,
          phone: studentForm.guardian.phone.trim() || studentForm.parentPhone.trim(),
          email: studentForm.guardian.email.trim(),
          occupation: studentForm.guardian.occupation.trim(),
          address: studentForm.guardian.address.trim(),
        };
      }

      // Health Sub-document
      if (studentForm.healthInfo.bloodGroup || studentForm.healthInfo.genotype || studentForm.healthInfo.allergies.trim()) {
        payload.healthInfo = {
          bloodGroup: studentForm.healthInfo.bloodGroup,
          genotype: studentForm.healthInfo.genotype,
          allergies: studentForm.healthInfo.allergies ? studentForm.healthInfo.allergies.split(',').map((s) => s.trim()) : [],
          chronicConditions: studentForm.healthInfo.chronicConditions.trim(),
          emergencyContactName: studentForm.healthInfo.emergencyContactName.trim(),
          emergencyContactPhone: studentForm.healthInfo.emergencyContactPhone.trim(),
        };
      }

      if (!isEditingStudent) {
        payload.createStudentAccount = studentForm.createStudentAccount;
        payload.createParentAccount = studentForm.createParentAccount;
      }

      if (isEditingStudent && editingStudentId) {
        return await apiClient.patch(`/admin/students/${editingStudentId}`, payload);
      } else {
        return await apiClient.post('/admin/students', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-table'] });
      setShowStudentFormModal(false);
      Alert.alert(
        'Success',
        isEditingStudent ? 'Student details updated successfully!' : 'New student created successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save student record.');
    },
  });

  // Mutation: Update Student Status (Active / Inactive)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      return await apiClient.patch(`/admin/students/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-table'] });
      setShowActionModal(false);
      setActiveStudent(null);
      Alert.alert('Success', 'Student status updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update student status.');
    },
  });

  // Mutation: Promote Student to New Class
  const promoteStudentMutation = useMutation({
    mutationFn: async ({ id, newClassId }: { id: string; newClassId: string }) => {
      return await apiClient.post(`/admin/students/${id}/promote`, { newClassId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-table'] });
      setShowPromoteModal(false);
      setShowActionModal(false);
      setActiveStudent(null);
      Alert.alert('Success', 'Student promoted successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to promote student.');
    },
  });

  const handleOpenAction = (student: any) => {
    setActiveStudent(student);
    setShowActionModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>Student Roster</ThemedText>
            <ThemedText style={styles.subtitle}>Academic directory & class management</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdminOrAccountant && (
              <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddStudent}>
                <UserPlus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.addBtnText}>Add Student</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
              {isFetching ? <ActivityIndicator size="small" color="#38bdf8" /> : <RefreshCw size={18} color="#38bdf8" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, admission no..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={(txt) => {
              setSearch(txt);
              setPage(1);
            }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills Bar */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('all'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>
                All Status
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'active' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('active'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'active' && styles.filterPillTextActive]}>
                Active
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'inactive' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('inactive'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'inactive' && styles.filterPillTextActive]}>
                Inactive
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'graduated' && styles.filterPillActive]}
              onPress={() => { setStatusFilter('graduated'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'graduated' && styles.filterPillTextActive]}>
                Graduated
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPillSm, genderFilter === 'all' && styles.filterPillActive]}
              onPress={() => { setGenderFilter('all'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, genderFilter === 'all' && styles.filterPillTextActive]}>
                All Genders
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPillSm, genderFilter === 'male' && styles.filterPillActive]}
              onPress={() => { setGenderFilter('male'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, genderFilter === 'male' && styles.filterPillTextActive]}>
                Male
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPillSm, genderFilter === 'female' && styles.filterPillActive]}
              onPress={() => { setGenderFilter('female'); setPage(1); }}
            >
              <ThemedText style={[styles.filterPillText, genderFilter === 'female' && styles.filterPillTextActive]}>
                Female
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stats Summary Bar */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <GraduationCap size={18} color="#38bdf8" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNumber}>{totalStudents}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Matching</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <Building2 size={18} color="#4ade80" style={{ marginBottom: 4 }} />
            <ThemedText style={[styles.statNumber, { color: '#4ade80' }]}>{classesList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Classes</ThemedText>
          </ThemedView>
        </View>

        {/* Data Table Container */}
        <ThemedView style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <ThemedText style={[styles.thCell, { flex: 2 }]}>STUDENT & ADM</ThemedText>
            <ThemedText style={[styles.thCell, { flex: 1.5 }]}>CLASS</ThemedText>
            <ThemedText style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</ThemedText>
            {isAdminOrAccountant && <ThemedText style={[styles.thCell, { width: 44, textAlign: 'right' }]}>ACTION</ThemedText>}
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#0284c7" />
              <ThemedText style={styles.loadingText}>Loading students table...</ThemedText>
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <ThemedText style={styles.errorText}>Failed to load student table records.</ThemedText>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.centerContainer}>
              <Users size={32} color="#64748b" style={{ marginBottom: 8 }} />
              <ThemedText style={styles.emptyTitle}>No Students Found</ThemedText>
              <ThemedText style={styles.emptySub}>No student records match the active filter criteria.</ThemedText>
            </View>
          ) : (
            students.map((item, idx) => {
              const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.fullName || item.name || 'Student';
              const admNo = item.admissionNo || item.admissionNumber || `ID-${item._id?.substring(0, 6)}`;

              const rawClassId = typeof item.classId === 'object' ? item.classId?._id || item.classId?.id : item.classId;
              const foundClass = classesList.find((c: any) => (c._id || c.id) === rawClassId);
              const className = foundClass
                ? `${foundClass.grade} - ${foundClass.name}`
                : (typeof item.classId === 'object' && item.classId
                    ? `${item.classId.grade ? item.classId.grade + ' - ' : ''}${item.classId.name || ''}`.trim()
                    : item.className || 'Unassigned');

              const statusRaw = (item.status || (item.isActive !== false ? 'active' : 'inactive')).toLowerCase();

              return (
                <View key={item._id || item.id || idx}>
                  {idx > 0 && <View style={styles.tableRowDivider} />}
                  <View style={styles.tableRow}>
                    <View style={{ flex: 2, paddingRight: 6 }}>
                      <ThemedText style={styles.tdName} numberOfLines={1}>
                        {displayName}
                      </ThemedText>
                      <ThemedText style={styles.tdAdm} numberOfLines={1}>
                        {admNo}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1.5, paddingRight: 4 }}>
                      <ThemedText style={styles.tdClass} numberOfLines={1}>
                        {className}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Badge
                        label={statusRaw.toUpperCase()}
                        variant={statusRaw === 'active' ? 'success' : statusRaw === 'graduated' ? 'info' : 'neutral'}
                        size="sm"
                      />
                    </View>

                    {isAdminOrAccountant && (
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleOpenAction(item)}
                      >
                        <MoreVertical size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Server-Side Pagination Bar */}
          <View style={styles.paginationBar}>
            <ThemedText style={styles.paginationText}>
              Page {page} of {totalPages} ({totalStudents} Total)
            </ThemedText>

            <View style={styles.pageButtonsRow}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={18} color={page <= 1 ? '#475569' : '#38bdf8'} />
                <ThemedText style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                  Prev
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ThemedText style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>
                  Next
                </ThemedText>
                <ChevronRight size={18} color={page >= totalPages ? '#475569' : '#38bdf8'} />
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>
      </ScrollView>

      {/* Admin Quick Action Sheet Modal */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Admin Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {activeStudent && (
              <View style={styles.studentPreviewCard}>
                <ThemedText style={styles.previewName}>
                  {activeStudent.firstName} {activeStudent.lastName}
                </ThemedText>
                <ThemedText style={styles.previewSub}>
                  Admission: {activeStudent.admissionNumber || activeStudent.admissionNo || 'N/A'}
                </ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => handleOpenEditStudent(activeStudent)}
            >
              <Pencil size={20} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.actionItemTitle}>Edit Student Details</ThemedText>
                <ThemedText style={styles.actionItemSub}>Modify basic info, guardian, medical & accounts</ThemedText>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                setShowActionModal(false);
                setShowPromoteModal(true);
              }}
            >
              <GraduationCap size={20} color="#4ade80" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.actionItemTitle}>Promote Student</ThemedText>
                <ThemedText style={styles.actionItemSub}>Advance student to next academic class</ThemedText>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            {activeStudent?.status === 'inactive' ? (
              <TouchableOpacity
                style={styles.modalActionItem}
                onPress={() =>
                  updateStatusMutation.mutate({ id: activeStudent._id || activeStudent.id, newStatus: 'active' })
                }
              >
                <UserCheck size={20} color="#4ade80" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.actionItemTitle, { color: '#4ade80' }]}>Activate Student</ThemedText>
                  <ThemedText style={styles.actionItemSub}>Restore student account to active roster</ThemedText>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalActionItem}
                onPress={() =>
                  updateStatusMutation.mutate({ id: activeStudent._id || activeStudent.id, newStatus: 'inactive' })
                }
              >
                <UserX size={20} color="#fbbf24" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.actionItemTitle, { color: '#fbbf24' }]}>Deactivate Student</ThemedText>
                  <ThemedText style={styles.actionItemSub}>Set status to inactive</ThemedText>
                </View>
              </TouchableOpacity>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* Complete Web-Parity 4-Tab Add & Edit Student Form Modal */}
      <Modal visible={showStudentFormModal} transparent animationType="slide" onRequestClose={() => setShowStudentFormModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { maxHeight: '90%', paddingHorizontal: 16 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditingStudent ? 'Edit Student Record' : 'Add New Student'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowStudentFormModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* 4 Form Section Tabs Bar */}
            <View style={styles.formTabBar}>
              <TouchableOpacity
                style={[styles.formTabItem, activeFormTab === 'basic' && styles.formTabItemActive]}
                onPress={() => setActiveFormTab('basic')}
              >
                <User size={14} color={activeFormTab === 'basic' ? '#38bdf8' : '#64748b'} />
                <ThemedText style={[styles.formTabText, activeFormTab === 'basic' && styles.formTabTextActive]}>Basic</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formTabItem, activeFormTab === 'guardian' && styles.formTabItemActive]}
                onPress={() => setActiveFormTab('guardian')}
              >
                <Users size={14} color={activeFormTab === 'guardian' ? '#38bdf8' : '#64748b'} />
                <ThemedText style={[styles.formTabText, activeFormTab === 'guardian' && styles.formTabTextActive]}>Guardian</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formTabItem, activeFormTab === 'health' && styles.formTabItemActive]}
                onPress={() => setActiveFormTab('health')}
              >
                <HeartPulse size={14} color={activeFormTab === 'health' ? '#38bdf8' : '#64748b'} />
                <ThemedText style={[styles.formTabText, activeFormTab === 'health' && styles.formTabTextActive]}>Health</ThemedText>
              </TouchableOpacity>

              {!isEditingStudent && (
                <TouchableOpacity
                  style={[styles.formTabItem, activeFormTab === 'account' && styles.formTabItemActive]}
                  onPress={() => setActiveFormTab('account')}
                >
                  <ShieldCheck size={14} color={activeFormTab === 'account' ? '#38bdf8' : '#64748b'} />
                  <ThemedText style={[styles.formTabText, activeFormTab === 'account' && styles.formTabTextActive]}>Portal</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              {/* TAB 1: BASIC INFO */}
              {activeFormTab === 'basic' && (
                <View>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>First Name *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. John"
                      placeholderTextColor="#64748b"
                      value={studentForm.firstName}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, firstName: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Last Name *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Doe"
                      placeholderTextColor="#64748b"
                      value={studentForm.lastName}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, lastName: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Middle Name</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Adam"
                      placeholderTextColor="#64748b"
                      value={studentForm.middleName}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, middleName: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Admission Number *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. ADM001"
                      placeholderTextColor="#64748b"
                      value={studentForm.admissionNumber}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, admissionNumber: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Parent Phone Number *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 08012345678"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      value={studentForm.parentPhone}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, parentPhone: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Gender *</ThemedText>
                    <View style={styles.genderRow}>
                      <TouchableOpacity
                        style={[styles.genderBtn, studentForm.gender === 'male' && styles.genderBtnActive]}
                        onPress={() => setStudentForm((p) => ({ ...p, gender: 'male' }))}
                      >
                        <ThemedText style={[styles.genderBtnText, studentForm.gender === 'male' && styles.genderBtnTextActive]}>
                          Male
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, studentForm.gender === 'female' && styles.genderBtnActive]}
                        onPress={() => setStudentForm((p) => ({ ...p, gender: 'female' }))}
                      >
                        <ThemedText style={[styles.genderBtnText, studentForm.gender === 'female' && styles.genderBtnTextActive]}>
                          Female
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Class *</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {classesList.map((c: any) => {
                        const cId = c._id || c.id;
                        const isSelected = studentForm.classId === cId;
                        const label = c.grade && c.name ? `${c.grade} - ${c.name}` : c.grade || c.name || 'Class';
                        return (
                          <TouchableOpacity
                            key={cId}
                            style={[styles.classPill, isSelected && styles.classPillActive]}
                            onPress={() => setStudentForm((p) => ({ ...p, classId: cId }))}
                          >
                            <ThemedText style={[styles.classPillText, isSelected && styles.classPillTextActive]}>
                              {label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Date of Birth (YYYY-MM-DD)</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 2012-05-15"
                      placeholderTextColor="#64748b"
                      value={studentForm.dateOfBirth}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, dateOfBirth: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>State of Origin</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Lagos"
                      placeholderTextColor="#64748b"
                      value={studentForm.stateOfOrigin}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, stateOfOrigin: val }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>LGA</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Ikeja"
                      placeholderTextColor="#64748b"
                      value={studentForm.lga}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, lga: val }))}
                    />
                  </View>
                </View>
              )}

              {/* TAB 2: GUARDIAN DETAILS */}
              {activeFormTab === 'guardian' && (
                <View>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Guardian Name</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Mr. Robert Doe"
                      placeholderTextColor="#64748b"
                      value={studentForm.guardian.name}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, guardian: { ...p.guardian, name: val } }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Relationship</ThemedText>
                    <View style={styles.genderRow}>
                      {['Father', 'Mother', 'Guardian'].map((rel) => {
                        const isSelected = studentForm.guardian.relationship === rel;
                        return (
                          <TouchableOpacity
                            key={rel}
                            style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                            onPress={() => setStudentForm((p) => ({ ...p, guardian: { ...p.guardian, relationship: rel } }))}
                          >
                            <ThemedText style={[styles.genderBtnText, isSelected && styles.genderBtnTextActive]}>
                              {rel}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Guardian Phone</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 08012345678"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      value={studentForm.guardian.phone}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, guardian: { ...p.guardian, phone: val } }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Guardian Email</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. guardian@gmail.com"
                      placeholderTextColor="#64748b"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={studentForm.guardian.email}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, guardian: { ...p.guardian, email: val } }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Guardian Occupation</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Engineer"
                      placeholderTextColor="#64748b"
                      value={studentForm.guardian.occupation}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, guardian: { ...p.guardian, occupation: val } }))}
                    />
                  </View>
                </View>
              )}

              {/* TAB 3: HEALTH DETAILS */}
              {activeFormTab === 'health' && (
                <View>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Blood Group</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => {
                        const isSelected = studentForm.healthInfo.bloodGroup === bg;
                        return (
                          <TouchableOpacity
                            key={bg}
                            style={[styles.classPill, isSelected && styles.classPillActive]}
                            onPress={() => setStudentForm((p) => ({ ...p, healthInfo: { ...p.healthInfo, bloodGroup: bg } }))}
                          >
                            <ThemedText style={[styles.classPillText, isSelected && styles.classPillTextActive]}>{bg}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Genotype</ThemedText>
                    <View style={styles.genderRow}>
                      {['AA', 'AS', 'SS', 'AC'].map((gt) => {
                        const isSelected = studentForm.healthInfo.genotype === gt;
                        return (
                          <TouchableOpacity
                            key={gt}
                            style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                            onPress={() => setStudentForm((p) => ({ ...p, healthInfo: { ...p.healthInfo, genotype: gt } }))}
                          >
                            <ThemedText style={[styles.genderBtnText, isSelected && styles.genderBtnTextActive]}>{gt}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Known Allergies</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Peanuts, Dust"
                      placeholderTextColor="#64748b"
                      value={studentForm.healthInfo.allergies}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, healthInfo: { ...p.healthInfo, allergies: val } }))}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Emergency Contact Phone</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 08099887766"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                      value={studentForm.healthInfo.emergencyContactPhone}
                      onChangeText={(val) => setStudentForm((p) => ({ ...p, healthInfo: { ...p.healthInfo, emergencyContactPhone: val } }))}
                    />
                  </View>
                </View>
              )}

              {/* TAB 4: PORTAL ACCOUNT SETUP */}
              {activeFormTab === 'account' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.switchTitle}>Create Student Portal Account</ThemedText>
                      <ThemedText style={styles.switchSub}>Generate login credentials for student</ThemedText>
                    </View>
                    <Switch
                      value={studentForm.createStudentAccount}
                      onValueChange={(val) => setStudentForm((p) => ({ ...p, createStudentAccount: val }))}
                      trackColor={{ false: '#334155', true: '#0284c7' }}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.switchTitle}>Create Parent Portal Account</ThemedText>
                      <ThemedText style={styles.switchSub}>Generate login credentials for parent</ThemedText>
                    </View>
                    <Switch
                      value={studentForm.createParentAccount}
                      onValueChange={(val) => setStudentForm((p) => ({ ...p, createParentAccount: val }))}
                      trackColor={{ false: '#334155', true: '#0284c7' }}
                    />
                  </View>
                </View>
              )}

              {/* Submit Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveFormBtn,
                  (!studentForm.firstName || !studentForm.lastName || !studentForm.parentPhone || !studentForm.classId) && styles.btnDisabled,
                ]}
                disabled={!studentForm.firstName || !studentForm.lastName || !studentForm.parentPhone || !studentForm.classId || saveStudentMutation.isPending}
                onPress={() => saveStudentMutation.mutate()}
              >
                {saveStudentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveFormBtnText}>
                    {isEditingStudent ? 'Save Changes' : 'Create Student Record'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Promote Student Modal */}
      <Modal visible={showPromoteModal} transparent animationType="slide" onRequestClose={() => setShowPromoteModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Promote Student</ThemedText>
              <TouchableOpacity onPress={() => setShowPromoteModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.promoteSub}>
              Select target class to promote {activeStudent?.firstName} {activeStudent?.lastName}:
            </ThemedText>

            <ScrollView style={{ maxHeight: 220, marginVertical: 12 }}>
              {classesList.map((c: any) => {
                const isSelected = targetPromoteClassId === (c._id || c.id);
                return (
                  <TouchableOpacity
                    key={c._id || c.id}
                    style={[styles.classSelectItem, isSelected && styles.classSelectItemActive]}
                    onPress={() => setTargetPromoteClassId(c._id || c.id)}
                  >
                    <ThemedText style={[styles.classSelectText, isSelected && styles.classSelectTextActive]}>
                      {c.grade} - {c.name}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmPromoteBtn, !targetPromoteClassId && styles.btnDisabled]}
              disabled={!targetPromoteClassId || promoteStudentMutation.isPending}
              onPress={() => {
                if (activeStudent && targetPromoteClassId) {
                  promoteStudentMutation.mutate({
                    id: activeStudent._id || activeStudent.id,
                    newClassId: targetPromoteClassId,
                  });
                }
              }}
            >
              {promoteStudentMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.confirmPromoteBtnText}>Confirm Promotion</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  filterSection: {
    marginBottom: 14,
    gap: 8,
  },
  filterPillsRow: {
    gap: 8,
    paddingRight: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillSm: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  filterPillText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  thCell: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableRowDivider: {
    height: 1,
    backgroundColor: '#334155',
  },
  tdName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  tdAdm: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  tdClass: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '500',
  },
  actionIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0f172a',
  },
  paginationText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  pageButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  pageBtnDisabled: {
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  pageBtnTextDisabled: {
    color: '#475569',
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  formTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  formTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  formTabItemActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  formTabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  formTabTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  studentPreviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  previewName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  previewSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  actionItemSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  promoteSub: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  classSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    marginBottom: 6,
  },
  classSelectItemActive: {
    borderColor: '#38bdf8',
    borderWidth: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  classSelectText: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  classSelectTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  confirmPromoteBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmPromoteBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 9,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  genderBtnText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  genderBtnTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  classPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  classPillActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  classPillText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  classPillTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  switchSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  saveFormBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveFormBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
