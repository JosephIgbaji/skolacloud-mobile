import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  GraduationCap,
  Search,
  RefreshCw,
  X,
  UserPlus,
  ShieldCheck,
  Eye,
  Pencil,
  MoreVertical,
  UserCheck,
  UserX,
  Phone,
  User,
  BookOpen,
  Shield,
  Heart,
  ChevronRight,
  Check,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

type DetailTab = 'personal' | 'academic' | 'guardian' | 'health';

function formatClassLabel(cls: any): string {
  if (!cls) return 'N/A';
  if (typeof cls === 'string') return cls;

  const name = (cls.name || '').trim();
  const grade = (cls.grade || cls.gradeLevel || cls.classGroup || cls.group || '').trim();

  if (!grade) return name || 'N/A';
  if (!name) return grade;

  const lowerName = name.toLowerCase();
  const lowerGrade = grade.toLowerCase();

  if (lowerName.includes(lowerGrade)) {
    return name;
  }

  return `${grade} ${name}`;
}

export default function AdminStudentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Active Modals & Selected Student
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Active Tab inside Detail Modal
  const [detailTab, setDetailTab] = useState<DetailTab>('personal');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'male' as 'male' | 'female',
    classId: '',
    admissionNumber: '',
    admissionDate: '',
    parentPhone: '',
    guardianName: '',
    guardianRelationship: 'Parent',
    guardianPhone: '',
    bloodGroup: '',
    genotype: '',
    allergies: '',
  });

  // 1. Fetch All School Classes for Admin Filter & Form
  const { data: allClasses = [] } = useQuery({
    queryKey: ['admin-school-classes'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/classes').catch(() => null);
        let list = res?.data;
        if (list && typeof list === 'object' && Array.isArray(list.data)) list = list.data;
        if (!Array.isArray(list)) list = [];
        return list;
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch School-wide Students
  const {
    data: studentsResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-students-list', selectedClassId],
    queryFn: async () => {
      const params: any = {};
      if (selectedClassId && selectedClassId !== 'all') {
        params.classId = selectedClassId;
      }
      const res = await apiClient.get('/admin/students', { params });
      return res.data;
    },
  });

  const rawStudents = useMemo(() => {
    const data = studentsResponse;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.students)) return data.students;
    return [];
  }, [studentsResponse]);

  const filteredStudents = useMemo(() => {
    return rawStudents.filter((s: any) => {
      const fullName = (s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
      const admNo = (s.admissionNumber || s.regNumber || '').toLowerCase();
      const matchesSearch =
        !searchQuery ||
        fullName.includes(searchQuery.toLowerCase()) ||
        admNo.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const isActive = s.status === 'active';
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      return true;
    });
  }, [rawStudents, searchQuery, statusFilter]);

  const selectedClassName = useMemo(() => {
    if (selectedClassId === 'all') return 'All Classes';
    const found = allClasses.find((c: any) => (c._id || c.id).toString() === selectedClassId);
    return found ? formatClassLabel(found) : 'Selected Class';
  }, [allClasses, selectedClassId]);

  // 3. Mutations for Create / Edit Student
  const saveStudentMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        classId: formData.classId,
        admissionNumber: formData.admissionNumber.trim(),
        parentPhone: formData.parentPhone.trim(),
      };

      if (formData.middleName.trim()) payload.middleName = formData.middleName.trim();
      if (formData.admissionDate.trim()) payload.admissionDate = formData.admissionDate.trim();

      if (formData.guardianName.trim() || formData.guardianPhone.trim()) {
        payload.guardian = {
          name: formData.guardianName.trim() || `${formData.firstName} Guardian`,
          relationship: formData.guardianRelationship || 'Parent',
          phone: formData.guardianPhone.trim() || formData.parentPhone.trim(),
        };
      }

      if (formData.bloodGroup.trim() || formData.genotype.trim() || formData.allergies.trim()) {
        payload.healthInfo = {
          bloodGroup: formData.bloodGroup.trim() || undefined,
          genotype: formData.genotype.trim() || undefined,
          allergies: formData.allergies.trim() ? [formData.allergies.trim()] : undefined,
        };
      }

      if (isEditing && selectedStudent) {
        const id = selectedStudent._id || selectedStudent.id;
        return await apiClient.patch(`/admin/students/${id}`, payload);
      } else {
        return await apiClient.post('/admin/students', payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-list'] });
      setShowFormModal(false);
      if (isEditing && selectedStudent) {
        const updated = res?.data || { ...selectedStudent, ...formData };
        setSelectedStudent(updated);
      }
      Alert.alert(
        'Success 🎉',
        isEditing ? 'Student record updated successfully!' : 'New student registered successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save student record.');
    },
  });

  // 4. Mutation for Status Toggle
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'active' | 'inactive' }) => {
      return await apiClient.patch(`/admin/students/${id}/status`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-list'] });
      if (selectedStudent) {
        setSelectedStudent((prev: any) => (prev ? { ...prev, status: variables.newStatus } : null));
      }
      setShowActionModal(false);
      Alert.alert('Success', `Student status changed to ${variables.newStatus.toUpperCase()}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update student status.');
    },
  });

  // Handlers
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedStudent(null);
    const yr = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const defaultClassId = allClasses.length > 0 ? (allClasses[0]._id || allClasses[0].id).toString() : '';

    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      gender: 'male',
      classId: defaultClassId,
      admissionNumber: `ADM-${yr}-${rand}`,
      admissionDate: new Date().toISOString().split('T')[0],
      parentPhone: '',
      guardianName: '',
      guardianRelationship: 'Parent',
      guardianPhone: '',
      bloodGroup: '',
      genotype: '',
      allergies: '',
    });
    setShowFormModal(true);
  };

  const handleOpenDetail = (student: any) => {
    setSelectedStudent(student);
    setDetailTab('personal');
    setShowDetailModal(true);
  };

  const handleOpenEdit = (student: any) => {
    setIsEditing(true);
    setSelectedStudent(student);

    const cId =
      typeof student.classId === 'object'
        ? (student.classId?._id || student.classId?.id || '').toString()
        : (student.classId || '').toString();

    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      middleName: student.middleName || '',
      gender: (student.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male',
      classId: cId || (allClasses.length > 0 ? (allClasses[0]._id || allClasses[0].id).toString() : ''),
      admissionNumber: student.admissionNumber || student.regNumber || '',
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
      parentPhone: student.parentPhone || student.guardianPhone || '',
      guardianName: student.guardian?.name || student.parentName || '',
      guardianRelationship: student.guardian?.relationship || 'Parent',
      guardianPhone: student.guardian?.phone || student.parentPhone || '',
      bloodGroup: student.healthInfo?.bloodGroup || '',
      genotype: student.healthInfo?.genotype || '',
      allergies: Array.isArray(student.healthInfo?.allergies)
        ? student.healthInfo.allergies.join(', ')
        : student.healthInfo?.allergies || '',
    });
    setShowActionModal(false);
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleCallParent = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Parent phone number is not registered for this student.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Admin Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>School Student Registry</ThemedText>
          <ThemedText style={styles.sub}>Admin Management Portal</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />}
      >
        {/* Admin Quick Action Banner */}
        <ThemedView style={styles.adminActionCard}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="#38bdf8" />
              <ThemedText style={styles.adminCardTitle}>STUDENT MANAGEMENT</ThemedText>
            </View>
            <ThemedText style={styles.adminCardSub}>
              {rawStudents.length} total students registered in school database.
            </ThemedText>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
            <UserPlus size={16} color="#ffffff" />
            <ThemedText style={styles.addBtnText}>Add Student</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* School Class Selector Pills */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.label}>
            FILTER BY CLASS ({allClasses.length + 1}):
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classPillsRow}>
            <TouchableOpacity
              style={[styles.classPillBtn, selectedClassId === 'all' && styles.classPillBtnActive]}
              onPress={() => setSelectedClassId('all')}
            >
              <ThemedText style={[styles.classPillBtnText, selectedClassId === 'all' && styles.classPillBtnTextActive]}>
                All Classes
              </ThemedText>
            </TouchableOpacity>

            {allClasses.map((cls: any) => {
              const cId = (cls._id || cls.id).toString();
              const isSelected = selectedClassId === cId;
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.classPillBtn, isSelected && styles.classPillBtnActive]}
                  onPress={() => setSelectedClassId(cId)}
                >
                  <ThemedText style={[styles.classPillBtnText, isSelected && styles.classPillBtnTextActive]}>
                    {formatClassLabel(cls)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${selectedClassName}...`}
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

        {/* Status Filter */}
        <View style={styles.genderRow}>
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.genderBtn, statusFilter === st && styles.genderBtnActive]}
              onPress={() => setStatusFilter(st)}
            >
              <ThemedText style={[styles.genderBtnText, statusFilter === st && styles.genderBtnTextActive]}>
                {st.toUpperCase()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : filteredStudents.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <GraduationCap size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Students Found</ThemedText>
            <ThemedText style={styles.emptySub}>No student records match your query.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            <ThemedText style={styles.countText}>
              Showing {filteredStudents.length} Students ({selectedClassName})
            </ThemedText>

            {filteredStudents.map((s: any) => {
              const studentName = s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`;
              const className = formatClassLabel(s.classId || s.className);
              const parentPhone = s.parentPhone || s.guardian?.phone || s.guardianPhone;
              const isActive = s.status === 'active';

              return (
                <TouchableOpacity
                  key={s._id || s.id}
                  activeOpacity={0.85}
                  onPress={() => handleOpenDetail(s)}
                >
                  <ThemedView style={styles.studentCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarBox}>
                        <ThemedText style={styles.avatarText}>
                          {(studentName || 'S').charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>

                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.studentName}>{studentName}</ThemedText>
                        <ThemedText style={styles.studentSubText}>
                          Adm: {s.admissionNumber || 'N/A'} • Class: {className}
                        </ThemedText>
                      </View>

                      <Badge
                        label={(s.status || 'Active').toUpperCase()}
                        variant={isActive ? 'success' : 'neutral'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={styles.cardQuickBtn}
                        onPress={() => handleOpenDetail(s)}
                      >
                        <Eye size={14} color="#38bdf8" />
                        <ThemedText style={[styles.cardQuickText, { color: '#38bdf8' }]}>View</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardQuickBtn}
                        onPress={() => handleOpenEdit(s)}
                      >
                        <Pencil size={14} color="#fbbf24" />
                        <ThemedText style={[styles.cardQuickText, { color: '#fbbf24' }]}>Edit</ThemedText>
                      </TouchableOpacity>

                      {parentPhone ? (
                        <TouchableOpacity
                          style={styles.cardQuickBtn}
                          onPress={() => handleCallParent(parentPhone)}
                        >
                          <Phone size={14} color="#4ade80" />
                          <ThemedText style={[styles.cardQuickText, { color: '#4ade80' }]}>Call Parent</ThemedText>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.cardMoreBtn}
                        onPress={() => {
                          setSelectedStudent(s);
                          setShowActionModal(true);
                        }}
                      >
                        <MoreVertical size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </ThemedView>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 1. Quick Action Menu Modal */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <ThemedText style={styles.modalTitle}>Student Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <>
                <View style={styles.previewCard}>
                  <ThemedText style={styles.previewName}>
                    {selectedStudent.fullName || `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`}
                  </ThemedText>
                  <ThemedText style={styles.previewSub}>
                    Adm: {selectedStudent.admissionNumber || 'N/A'} • Class: {formatClassLabel(selectedStudent.classId || selectedStudent.className)}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.modalActionItem}
                  onPress={() => {
                    setShowActionModal(false);
                    handleOpenDetail(selectedStudent);
                  }}
                >
                  <Eye size={20} color="#38bdf8" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.actionItemTitle}>View Full Profile</ThemedText>
                    <ThemedText style={styles.actionItemSub}>View personal, academic, guardian & health details</ThemedText>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity
                  style={styles.modalActionItem}
                  onPress={() => handleOpenEdit(selectedStudent)}
                >
                  <Pencil size={20} color="#fbbf24" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.actionItemTitle}>Edit Student Details</ThemedText>
                    <ThemedText style={styles.actionItemSub}>Modify name, class, admission & contacts</ThemedText>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                {selectedStudent.status === 'inactive' ? (
                  <TouchableOpacity
                    style={styles.modalActionItem}
                    onPress={() => {
                      const id = selectedStudent._id || selectedStudent.id;
                      if (id) toggleStatusMutation.mutate({ id, newStatus: 'active' });
                    }}
                  >
                    <UserCheck size={20} color="#4ade80" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.actionItemTitle, { color: '#4ade80' }]}>Activate Student</ThemedText>
                      <ThemedText style={styles.actionItemSub}>Enable active status for this student</ThemedText>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalActionItem}
                    onPress={() => {
                      const id = selectedStudent._id || selectedStudent.id;
                      if (id) toggleStatusMutation.mutate({ id, newStatus: 'inactive' });
                    }}
                  >
                    <UserX size={20} color="#f87171" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.actionItemTitle, { color: '#f87171' }]}>Deactivate Student</ThemedText>
                      <ThemedText style={styles.actionItemSub}>Set student status to inactive</ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* 2. Segmented Detail View Modal (matching applications.tsx pattern) */}
      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.detailModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.modalTitle}>
                  {selectedStudent ? selectedStudent.fullName || `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}` : 'Student Details'}
                </ThemedText>
                <ThemedText style={styles.modalSub}>
                  Admission No: {selectedStudent?.admissionNumber || selectedStudent?.regNumber || 'N/A'}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Status Banner */}
            {selectedStudent && (
              <View style={styles.modalStatusBanner}>
                <ThemedText style={styles.bannerText}>
                  Class: {formatClassLabel(selectedStudent.classId || selectedStudent.className)}
                </ThemedText>
                <Badge
                  label={(selectedStudent.status || 'Active').toUpperCase()}
                  variant={selectedStudent.status === 'active' ? 'success' : 'neutral'}
                  size="md"
                />
              </View>
            )}

            {/* Segmented Subtabs */}
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
                    <IconComp size={14} color={isActive ? '#38bdf8' : '#94a3b8'} style={{ marginBottom: 2 }} />
                    <ThemedText style={[styles.detailSegmentText, isActive && styles.detailSegmentTextActive]}>
                      {tab.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {selectedStudent && detailTab === 'personal' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Personal Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>First Name</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.firstName || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Last Name</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.lastName || 'N/A'}</ThemedText>
                    </View>
                    {selectedStudent.middleName ? (
                      <View style={styles.infoRow}>
                        <ThemedText style={styles.infoKey}>Middle Name</ThemedText>
                        <ThemedText style={styles.infoVal}>{selectedStudent.middleName}</ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Gender</ThemedText>
                      <ThemedText style={styles.infoVal}>{(selectedStudent.gender || 'N/A').toUpperCase()}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Date of Birth</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Nationality</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.nationality || 'Nigerian'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>State / LGA</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {`${selectedStudent.stateOfOrigin || 'N/A'}${selectedStudent.lga ? ' / ' + selectedStudent.lga : ''}`}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Residential Address</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.address || 'N/A'}</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {selectedStudent && detailTab === 'academic' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Academic & Enrollment Details</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Assigned Class</ThemedText>
                      <ThemedText style={[styles.infoVal, { color: '#38bdf8', fontWeight: 'bold' }]}>
                        {formatClassLabel(selectedStudent.classId || selectedStudent.className)}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Admission Number</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.admissionNumber || selectedStudent.regNumber || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Admission Date</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {selectedStudent.admissionDate ? new Date(selectedStudent.admissionDate).toLocaleDateString() : 'N/A'}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Status</ThemedText>
                      <ThemedText style={styles.infoVal}>{(selectedStudent.status || 'Active').toUpperCase()}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Previous School</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.previousSchool || 'None recorded'}</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {selectedStudent && detailTab === 'guardian' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Parent / Guardian Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Guardian Name</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.guardian?.name || selectedStudent.parentName || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Relationship</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.guardian?.relationship || 'Parent'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Parent Phone Number</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <ThemedText style={[styles.infoVal, { color: '#4ade80', fontWeight: 'bold' }]}>
                          {selectedStudent.parentPhone || selectedStudent.guardian?.phone || 'N/A'}
                        </ThemedText>
                        {(selectedStudent.parentPhone || selectedStudent.guardian?.phone) && (
                          <TouchableOpacity
                            style={styles.callParentPill}
                            onPress={() => handleCallParent(selectedStudent.parentPhone || selectedStudent.guardian?.phone)}
                          >
                            <Phone size={12} color="#ffffff" style={{ marginRight: 4 }} />
                            <ThemedText style={styles.callParentPillText}>Call</ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Guardian Email</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.guardian?.email || selectedStudent.parentEmail || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Address</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.guardian?.address || selectedStudent.address || 'Same as student'}</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {selectedStudent && detailTab === 'health' && (
                <View style={styles.detailSectionCard}>
                  <ThemedText style={styles.sectionHeaderTitle}>Health & Medical Information</ThemedText>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Blood Group</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.healthInfo?.bloodGroup || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoKey}>Genotype</ThemedText>
                      <ThemedText style={styles.infoVal}>{selectedStudent.healthInfo?.genotype || 'N/A'}</ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Allergies</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {Array.isArray(selectedStudent.healthInfo?.allergies)
                          ? selectedStudent.healthInfo.allergies.join(', ') || 'None recorded'
                          : selectedStudent.healthInfo?.allergies || 'None recorded'}
                      </ThemedText>
                    </View>
                    <View style={styles.infoRowFull}>
                      <ThemedText style={styles.infoKey}>Emergency Contact</ThemedText>
                      <ThemedText style={styles.infoVal}>
                        {selectedStudent.healthInfo?.emergencyContactName || 'Parent Contact'}{' '}
                        {selectedStudent.healthInfo?.emergencyContactPhone ? `(${selectedStudent.healthInfo.emergencyContactPhone})` : ''}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalEditBtn}
                onPress={() => handleOpenEdit(selectedStudent)}
              >
                <Pencil size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.modalEditBtnText}>Edit Student Details</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* 3. Add & Edit Student Form Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent onRequestClose={() => setShowFormModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditing ? 'Edit Student Details' : 'Register New Student'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Basic Information Section */}
              <ThemedText style={styles.formSectionHeader}>1. BASIC INFORMATION</ThemedText>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>First Name *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Samuel"
                  placeholderTextColor="#64748b"
                  value={formData.firstName}
                  onChangeText={(val) => setFormData((p) => ({ ...p, firstName: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Last Name *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Adebayo"
                  placeholderTextColor="#64748b"
                  value={formData.lastName}
                  onChangeText={(val) => setFormData((p) => ({ ...p, lastName: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Middle Name</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Chukwuemeka"
                  placeholderTextColor="#64748b"
                  value={formData.middleName}
                  onChangeText={(val) => setFormData((p) => ({ ...p, middleName: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Gender *</ThemedText>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, formData.gender === 'male' && styles.roleBtnActive]}
                    onPress={() => setFormData((p) => ({ ...p, gender: 'male' }))}
                  >
                    <ThemedText style={[styles.roleBtnText, formData.gender === 'male' && styles.roleBtnTextActive]}>
                      Male
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, formData.gender === 'female' && styles.roleBtnActive]}
                    onPress={() => setFormData((p) => ({ ...p, gender: 'female' }))}
                  >
                    <ThemedText style={[styles.roleBtnText, formData.gender === 'female' && styles.roleBtnTextActive]}>
                      Female
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Assigned Class *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {allClasses.map((cls: any) => {
                    const cId = (cls._id || cls.id).toString();
                    const isSel = formData.classId === cId;
                    return (
                      <TouchableOpacity
                        key={cId}
                        style={[styles.classSelectPill, isSel && styles.classSelectPillActive]}
                        onPress={() => setFormData((p) => ({ ...p, classId: cId }))}
                      >
                        <ThemedText style={[styles.classSelectText, isSel && styles.classSelectTextActive]}>
                          {formatClassLabel(cls)}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Admission Information Section */}
              <ThemedText style={styles.formSectionHeader}>2. ADMISSION & ENROLLMENT</ThemedText>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Admission Number *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. ADM-2026-1002"
                  placeholderTextColor="#64748b"
                  value={formData.admissionNumber}
                  onChangeText={(val) => setFormData((p) => ({ ...p, admissionNumber: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Admission Date</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  value={formData.admissionDate}
                  onChangeText={(val) => setFormData((p) => ({ ...p, admissionDate: val }))}
                />
              </View>

              {/* Parent & Guardian Information Section */}
              <ThemedText style={styles.formSectionHeader}>3. PARENT & GUARDIAN DETAILS</ThemedText>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Parent Contact Phone *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 08012345678"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={formData.parentPhone}
                  onChangeText={(val) => setFormData((p) => ({ ...p, parentPhone: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Guardian Name</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Mr. Joseph Adebayo"
                  placeholderTextColor="#64748b"
                  value={formData.guardianName}
                  onChangeText={(val) => setFormData((p) => ({ ...p, guardianName: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Relationship</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Father / Mother / Uncle"
                  placeholderTextColor="#64748b"
                  value={formData.guardianRelationship}
                  onChangeText={(val) => setFormData((p) => ({ ...p, guardianRelationship: val }))}
                />
              </View>

              {/* Health Information Section */}
              <ThemedText style={styles.formSectionHeader}>4. HEALTH PROFILE (OPTIONAL)</ThemedText>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.formLabel}>Blood Group</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. O+"
                    placeholderTextColor="#64748b"
                    value={formData.bloodGroup}
                    onChangeText={(val) => setFormData((p) => ({ ...p, bloodGroup: val }))}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.formLabel}>Genotype</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. AA"
                    placeholderTextColor="#64748b"
                    value={formData.genotype}
                    onChangeText={(val) => setFormData((p) => ({ ...p, genotype: val }))}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Allergies</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Peanuts, Dust"
                  placeholderTextColor="#64748b"
                  value={formData.allergies}
                  onChangeText={(val) => setFormData((p) => ({ ...p, allergies: val }))}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!formData.firstName || !formData.lastName || !formData.admissionNumber || !formData.classId || !formData.parentPhone) &&
                    styles.btnDisabled,
                ]}
                disabled={
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.admissionNumber ||
                  !formData.classId ||
                  !formData.parentPhone ||
                  saveStudentMutation.isPending
                }
                onPress={() => saveStudentMutation.mutate()}
              >
                {saveStudentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Register Student'}
                  </ThemedText>
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },

  content: { padding: 16, gap: 14 },

  adminActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  adminCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  adminCardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  label: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8' },
  classPillsRow: { gap: 8, paddingVertical: 4 },
  classPillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  classPillBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  classPillBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  classPillBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 6, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  genderBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  genderBtnText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  genderBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  countText: { fontSize: 13, color: '#38bdf8', fontWeight: 'bold' },

  studentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  studentSubText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: '#334155' },

  cardActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardQuickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  cardQuickText: { fontSize: 11, fontWeight: 'bold' },
  cardMoreBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Modals Overlay & Common
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  modalSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  modalDivider: { height: 1, backgroundColor: '#334155', marginVertical: 4 },

  // Quick Action Modal
  actionModalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, borderWidth: 1, borderColor: '#334155' },
  actionModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  previewCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 12 },
  previewName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  previewSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modalActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  actionItemSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  // Segmented Detail Modal
  detailModalContent: { height: '88%', backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalStatusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  bannerText: { fontSize: 13, color: '#cbd5e1', fontWeight: '500' },
  detailSegmentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  detailSegmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center' },
  detailSegmentBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8' },
  detailSegmentText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  detailSegmentTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  detailScroll: { padding: 16 },
  detailSectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeaderTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8 },
  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'column', gap: 2 },
  infoRowFull: { flexDirection: 'column', gap: 2 },
  infoKey: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  infoVal: { fontSize: 14, color: '#f8fafc', fontWeight: '500' },
  callParentPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  callParentPillText: { fontSize: 11, color: '#ffffff', fontWeight: 'bold' },

  modalFooterActions: { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' },
  modalEditBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#0284c7' },
  modalEditBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Form Modal
  formModalContent: { height: '90%', backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  formSectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5, marginTop: 4, marginBottom: 2 },
  formGroup: { marginBottom: 4 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 42, fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 9, alignItems: 'center' },
  roleBtnActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  roleBtnText: { fontSize: 12, color: '#94a3b8' },
  roleBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  classSelectPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  classSelectPillActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  classSelectText: { fontSize: 12, color: '#94a3b8' },
  classSelectTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 14, marginBottom: 20 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});

