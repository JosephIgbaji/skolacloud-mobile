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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  User,
  Check,
  ChevronRight,
  UserCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function SubjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rawRole = (user?.role || 'student').toLowerCase();
  const isAdminOrAccountant = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant';

  const [search, setSearch] = useState('');

  // Modals & Active Subject
  const [showFormModal, setShowFormModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showTeacherPickerModal, setShowTeacherPickerModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    teacherId: '',
  });

  // 1. Fetch Subjects List
  const { data: subjectsResponse, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['subjects-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/subjects', { params: { limit: 100, search: search.trim() || undefined } });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  const subjectsList = Array.isArray(subjectsResponse) ? subjectsResponse : [];

  // 2. Fetch Teachers List for Assignment Selector
  const { data: teachersList = [] } = useQuery({
    queryKey: ['admin-teachers-select'],
    enabled: isAdminOrAccountant,
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/teachers');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Handlers for Add & Edit
  const handleOpenAdd = () => {
    setIsEditing(false);
    setActiveSubject(null);
    setFormData({ name: '', code: '', description: '', teacherId: '' });
    setShowFormModal(true);
  };

  const handleOpenEdit = (subject: any) => {
    setIsEditing(true);
    setActiveSubject(subject);

    const existingTeacherId = typeof subject.teacherId === 'object'
      ? (subject.teacherId?._id || subject.teacherId?.id || '')
      : (subject.teacherId || '');

    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      description: subject.description || '',
      teacherId: existingTeacherId,
    });
    setShowActionModal(false);
    setShowFormModal(true);
  };

  // Mutation: Save Subject (Create / Update)
  const saveSubjectMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: formData.name.trim(),
      };
      if (formData.code.trim()) payload.code = formData.code.trim();
      if (formData.description.trim()) payload.description = formData.description.trim();
      if (formData.teacherId) payload.teacherId = formData.teacherId;

      if (isEditing && activeSubject) {
        const id = activeSubject._id || activeSubject.id;
        return await apiClient.patch(`/subjects/${id}`, payload);
      } else {
        return await apiClient.post('/subjects', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects-list'] });
      setShowFormModal(false);
      Alert.alert(
        'Success',
        isEditing ? 'Subject details updated successfully!' : 'New subject added successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save subject.');
    },
  });

  // Mutation: Delete Subject
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects-list'] });
      setShowActionModal(false);
      setActiveSubject(null);
      Alert.alert('Success', 'Subject deleted successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete subject.');
    },
  });

  const handleDeleteConfirm = (subject: any) => {
    const id = subject._id || subject.id;
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete ${subject.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSubjectMutation.mutate(id),
        },
      ]
    );
  };

  const selectedTeacherObj = teachersList.find(
    (t: any) => (t._id || t.id) === formData.teacherId
  );
  const selectedTeacherName = selectedTeacherObj
    ? (selectedTeacherObj.fullName || `${selectedTeacherObj.firstName || ''} ${selectedTeacherObj.lastName || ''}`.trim())
    : 'Unassigned';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Subjects & Curriculum</ThemedText>
          <ThemedText style={styles.sub}>Academic subject directory & teacher assignment</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdminOrAccountant && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <ThemedText style={styles.addBtnText}>Add Subject</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
            {isFetching ? <ActivityIndicator size="small" color="#38bdf8" /> : <RefreshCw size={18} color="#38bdf8" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects, codes..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stats Summary Row */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <BookOpen size={18} color="#a78bfa" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{subjectsList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Subjects</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <UserCheck size={18} color="#38bdf8" style={{ marginBottom: 4 }} />
            <ThemedText style={[styles.statNum, { color: '#38bdf8' }]}>
              {subjectsList.filter((s: any) => Boolean(s.teacherId)).length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Assigned Teachers</ThemedText>
          </ThemedView>
        </View>

        {/* Subjects List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.errorText}>Failed to load subject records.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : subjectsList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <BookOpen size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Subjects Found</ThemedText>
            <ThemedText style={styles.emptySub}>
              {search ? 'Adjust search query to find subject' : 'Add academic subjects (e.g. Mathematics, English Language).'}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {subjectsList.map((item: any, idx: number) => {
              const code = item.code || 'N/A';
              const name = item.name || 'Subject';
              const description = item.description || '';

              const teacherObj = typeof item.teacherId === 'object' ? item.teacherId : null;
              const teacherName = teacherObj ? (teacherObj.fullName || teacherObj.name || `${teacherObj.firstName || ''} ${teacherObj.lastName || ''}`.trim()) : 'Unassigned';

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.itemCard}>
                  <View style={styles.iconBox}>
                    <BookOpen size={20} color="#a78bfa" />
                  </View>

                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ThemedText style={styles.itemName}>{name}</ThemedText>
                      {item.code ? (
                        <View style={styles.codeBadge}>
                          <ThemedText style={styles.codeBadgeText}>{code}</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    {description ? (
                      <ThemedText style={styles.itemDesc} numberOfLines={1}>
                        {description}
                      </ThemedText>
                    ) : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <User size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                      <ThemedText style={styles.teacherNameText} numberOfLines={1}>
                        Teacher: {teacherName}
                      </ThemedText>
                    </View>
                  </View>

                  {isAdminOrAccountant && (
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      onPress={() => {
                        setActiveSubject(item);
                        setShowActionModal(true);
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
      </ScrollView>

      {/* Quick Action Sheet Modal */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Subject Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {activeSubject && (
              <View style={styles.previewCard}>
                <ThemedText style={styles.previewName}>{activeSubject.name}</ThemedText>
                <ThemedText style={styles.previewSub}>Code: {activeSubject.code || 'N/A'}</ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => handleOpenEdit(activeSubject)}
            >
              <Pencil size={20} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.actionItemTitle}>Edit Subject</ThemedText>
                <ThemedText style={styles.actionItemSub}>Modify name, code, description & assigned teacher</ThemedText>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                setShowActionModal(false);
                handleDeleteConfirm(activeSubject);
              }}
            >
              <Trash2 size={20} color="#f87171" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.actionItemTitle, { color: '#f87171' }]}>Delete Subject</ThemedText>
                <ThemedText style={styles.actionItemSub}>Remove subject from school curriculum</ThemedText>
              </View>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Add & Edit Subject Form Modal */}
      <Modal visible={showFormModal} transparent animationType="slide" onRequestClose={() => setShowFormModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditing ? 'Edit Subject Details' : 'Add New Subject'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Subject Name *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Mathematics"
                  placeholderTextColor="#64748b"
                  value={formData.name}
                  onChangeText={(val) => setFormData((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Subject Code (Optional)</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. MATH101"
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                  value={formData.code}
                  onChangeText={(val) => setFormData((p) => ({ ...p, code: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Description (Optional)</ThemedText>
                <TextInput
                  style={[styles.formInput, { height: 70, paddingTop: 10 }]}
                  placeholder="Brief description of the subject..."
                  placeholderTextColor="#64748b"
                  multiline
                  value={formData.description}
                  onChangeText={(val) => setFormData((p) => ({ ...p, description: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Assigned Teacher (Optional)</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowTeacherPickerModal(true)}
                >
                  <ThemedText style={formData.teacherId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {selectedTeacherName}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, !formData.name && styles.btnDisabled]}
                disabled={!formData.name || saveSubjectMutation.isPending}
                onPress={() => saveSubjectMutation.mutate()}
              >
                {saveSubjectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Add Subject'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Teacher Selection Modal */}
      <Modal visible={showTeacherPickerModal} transparent animationType="slide" onRequestClose={() => setShowTeacherPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Assign Teacher</ThemedText>
              <TouchableOpacity onPress={() => setShowTeacherPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.teacherItem, !formData.teacherId && styles.teacherItemActive]}
                onPress={() => {
                  setFormData((p) => ({ ...p, teacherId: '' }));
                  setShowTeacherPickerModal(false);
                }}
              >
                <ThemedText style={[styles.teacherItemText, !formData.teacherId && styles.teacherItemTextActive]}>
                  Unassigned
                </ThemedText>
                {!formData.teacherId && <Check size={18} color="#38bdf8" />}
              </TouchableOpacity>

              {teachersList.map((t: any) => {
                const tId = t._id || t.id;
                const isSelected = formData.teacherId === tId;
                const name = t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;

                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.teacherItem, isSelected && styles.teacherItemActive]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, teacherId: tId }));
                      setShowTeacherPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.teacherItemText, isSelected && styles.teacherItemTextActive]}>
                      {name}
                    </ThemedText>
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
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  content: { padding: 16 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#a78bfa' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(167, 139, 250, 0.12)', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  codeBadge: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  codeBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#a78bfa' },
  itemDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  teacherNameText: { fontSize: 12, color: '#cbd5e1' },
  actionIconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#0284c7', borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  previewCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 14 },
  previewName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  previewSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modalActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionItemTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  actionItemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: '#334155', marginVertical: 4 },
  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 42, fontSize: 14 },
  formInputSelect: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 42 },
  formInputSelectText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  formInputPlaceholder: { color: '#64748b', fontSize: 14 },
  teacherItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#0f172a', marginBottom: 6 },
  teacherItemActive: { borderColor: '#38bdf8', borderWidth: 1, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  teacherItemText: { fontSize: 14, color: '#cbd5e1' },
  teacherItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
