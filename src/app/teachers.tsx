import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';

export default function TeachersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rawRole = (user?.role || 'student').toLowerCase();
  const isAdminOrAccountant = rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'accountant';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [roleFilter, setRoleFilter] = useState('all'); // all, teacher, accountant, admin

  // Modals & Active Teacher
  const [showFormModal, setShowFormModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'teacher' as 'teacher' | 'accountant' | 'admin',
  });

  // 1. Fetch Teachers & Staff List
  const { data: staffResponse, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-teachers-list', search, statusFilter, roleFilter],
    queryFn: async () => {
      let endpoint = '/admin/teachers';
      if (!isAdminOrAccountant) endpoint = '/users';

      const res = await apiClient.get(endpoint);
      const raw = res.data;
      let data = Array.isArray(raw) ? raw : raw?.data || [];

      // Apply client-side filters if needed
      if (!isAdminOrAccountant) {
        data = data.filter((u: any) => u.role === 'teacher' || u.role === 'accountant' || u.role === 'admin');
      }

      return data;
    },
  });

  const staffList = Array.isArray(staffResponse) ? staffResponse : [];

  // Filtered List based on Search & Pills
  const filteredStaff = staffList.filter((s: any) => {
    const name = (s.fullName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
    const email = (s.email || '').toLowerCase();
    const username = (s.username || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesQuery = !q || name.includes(q) || email.includes(q) || username.includes(q);

    const isUserActive = s.isActive !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isUserActive) ||
      (statusFilter === 'inactive' && !isUserActive);

    const userRole = (s.role || 'teacher').toLowerCase();
    const matchesRole = roleFilter === 'all' || userRole === roleFilter.toLowerCase();

    return matchesQuery && matchesStatus && matchesRole;
  });

  // Handlers for Add & Edit
  const handleOpenAdd = () => {
    setIsEditing(false);
    setActiveTeacher(null);
    setFormData({
      fullName: '',
      email: '',
      username: '',
      phone: '',
      role: 'teacher',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (teacher: any) => {
    setIsEditing(true);
    setActiveTeacher(teacher);
    setFormData({
      fullName: teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
      email: teacher.email || '',
      username: teacher.username || '',
      phone: teacher.phone || '',
      role: (teacher.role || 'teacher').toLowerCase() as any,
    });
    setShowActionModal(false);
    setShowFormModal(true);
  };

  // Mutation: Save Teacher (Create / Update)
  const saveTeacherMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        fullName: formData.fullName.trim(),
        role: formData.role,
      };
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.username.trim()) payload.username = formData.username.trim();
      if (formData.phone.trim()) payload.phone = formData.phone.trim();

      if (isEditing && activeTeacher) {
        const id = activeTeacher._id || activeTeacher.id;
        return await apiClient.patch(`/admin/teachers/${id}`, payload);
      } else {
        return await apiClient.post('/admin/teachers', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teachers-list'] });
      setShowFormModal(false);
      Alert.alert(
        'Success',
        isEditing ? 'Staff details updated successfully!' : 'New staff member added successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save staff record.');
    },
  });

  // Mutation: Toggle Active / Inactive Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiClient.patch(`/admin/teachers/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teachers-list'] });
      setShowActionModal(false);
      setActiveTeacher(null);
      Alert.alert('Success', 'Staff status updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update staff status.');
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
          <ThemedText style={styles.title}>Staff</ThemedText>
          <ThemedText style={styles.sub}>Faculty directory</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdminOrAccountant && (
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <UserPlus size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <ThemedText style={styles.addBtnText}>Add Staff</ThemedText>
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
            placeholder="Search name, email, username..."
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

        {/* Filter Section */}
        <View style={styles.filterSection}>
          {/* Status Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
              onPress={() => setStatusFilter('all')}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>
                All Status
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'active' && styles.filterPillActive]}
              onPress={() => setStatusFilter('active')}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'active' && styles.filterPillTextActive]}>
                Active Only
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'inactive' && styles.filterPillActive]}
              onPress={() => setStatusFilter('inactive')}
            >
              <ThemedText style={[styles.filterPillText, statusFilter === 'inactive' && styles.filterPillTextActive]}>
                Inactive Only
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>

          {/* Role Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPillSm, roleFilter === 'all' && styles.filterPillActive]}
              onPress={() => setRoleFilter('all')}
            >
              <ThemedText style={[styles.filterPillText, roleFilter === 'all' && styles.filterPillTextActive]}>
                All Roles
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPillSm, roleFilter === 'teacher' && styles.filterPillActive]}
              onPress={() => setRoleFilter('teacher')}
            >
              <ThemedText style={[styles.filterPillText, roleFilter === 'teacher' && styles.filterPillTextActive]}>
                Teachers
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPillSm, roleFilter === 'accountant' && styles.filterPillActive]}
              onPress={() => setRoleFilter('accountant')}
            >
              <ThemedText style={[styles.filterPillText, roleFilter === 'accountant' && styles.filterPillTextActive]}>
                Accountants
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPillSm, roleFilter === 'admin' && styles.filterPillActive]}
              onPress={() => setRoleFilter('admin')}
            >
              <ThemedText style={[styles.filterPillText, roleFilter === 'admin' && styles.filterPillTextActive]}>
                Admins
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <Users size={18} color="#38bdf8" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{filteredStaff.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Staff</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ShieldCheck size={18} color="#4ade80" style={{ marginBottom: 4 }} />
            <ThemedText style={[styles.statNum, { color: '#4ade80' }]}>
              {staffList.filter((s: any) => s.role === 'teacher').length}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Teachers</ThemedText>
          </ThemedView>
        </View>

        {/* Staff Directory List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.errorText}>Failed to load staff directory records.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : filteredStaff.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Users size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Faculty Found</ThemedText>
            <ThemedText style={styles.emptySub}>No staff records match active search or filter criteria.</ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listCard}>
            {filteredStaff.map((item: any, idx: number) => {
              const displayName = item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email || 'Staff Member';
              const roleLabel = (item.role || 'teacher').toUpperCase();
              const isUserActive = item.isActive !== false;

              return (
                <View key={item._id || item.id || idx}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.itemRow}>
                    <View style={styles.avatarCircle}>
                      <ThemedText style={styles.avatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={styles.nameText} numberOfLines={1}>
                          {displayName}
                        </ThemedText>
                      </View>

                      {item.email ? (
                        <ThemedText style={styles.subText} numberOfLines={1}>
                          {item.email}
                        </ThemedText>
                      ) : null}

                      {item.phone ? (
                        <ThemedText style={styles.subText} numberOfLines={1}>
                          Phone: {item.phone}
                        </ThemedText>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={roleLabel} variant="info" size="sm" />
                      <Badge
                        label={isUserActive ? 'ACTIVE' : 'INACTIVE'}
                        variant={isUserActive ? 'success' : 'neutral'}
                        size="sm"
                      />
                    </View>

                    {isAdminOrAccountant && (
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => {
                          setActiveTeacher(item);
                          setShowActionModal(true);
                        }}
                      >
                        <MoreVertical size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ThemedView>
        )}
      </ScrollView>

      {/* Quick Action Sheet Modal */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Staff Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {activeTeacher && (
              <>
                <View style={styles.previewCard}>
                  <ThemedText style={styles.previewName}>
                    {activeTeacher.fullName || `${activeTeacher.firstName || ''} ${activeTeacher.lastName || ''}`.trim()}
                  </ThemedText>
                  <ThemedText style={styles.previewSub}>
                    Role: {(activeTeacher.role || 'teacher').toUpperCase()} • Email: {activeTeacher.email || 'N/A'}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.modalActionItem}
                  onPress={() => handleOpenEdit(activeTeacher)}
                >
                  <Pencil size={20} color="#38bdf8" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.actionItemTitle}>Edit Staff Details</ThemedText>
                    <ThemedText style={styles.actionItemSub}>Modify name, email, phone & role</ThemedText>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                {activeTeacher.isActive === false ? (
                  <TouchableOpacity
                    style={styles.modalActionItem}
                    onPress={() => {
                      const id = activeTeacher._id || activeTeacher.id;
                      if (id) {
                        toggleStatusMutation.mutate({ id, isActive: true });
                      }
                    }}
                  >
                    <UserCheck size={20} color="#4ade80" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.actionItemTitle, { color: '#4ade80' }]}>Activate Account</ThemedText>
                      <ThemedText style={styles.actionItemSub}>Restore staff access to the platform</ThemedText>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalActionItem}
                    onPress={() => {
                      const id = activeTeacher._id || activeTeacher.id;
                      if (id) {
                        toggleStatusMutation.mutate({ id, isActive: false });
                      }
                    }}
                  >
                    <UserX size={20} color="#fbbf24" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.actionItemTitle, { color: '#fbbf24' }]}>Deactivate Account</ThemedText>
                      <ThemedText style={styles.actionItemSub}>Suspend staff login credentials</ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* Add & Edit Staff Form Modal */}
      <Modal visible={showFormModal} transparent animationType="slide" onRequestClose={() => setShowFormModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditing ? 'Edit Staff Details' : 'Add New Staff Member'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {!isEditing && (
                <View style={styles.infoNoteCard}>
                  <Info size={18} color="#38bdf8" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.infoNoteText}>
                    Default password for new staff account is set to <ThemedText style={{ fontWeight: 'bold', color: '#38bdf8' }}>password123</ThemedText>.
                  </ThemedText>
                </View>
              )}

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Full Name *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#64748b"
                  value={formData.fullName}
                  onChangeText={(val) => setFormData((p) => ({ ...p, fullName: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Email Address *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. john@school.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(val) => setFormData((p) => ({ ...p, email: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Phone Number</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 08012345678"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(val) => setFormData((p) => ({ ...p, phone: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Staff Role *</ThemedText>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, formData.role === 'teacher' && styles.roleBtnActive]}
                    onPress={() => setFormData((p) => ({ ...p, role: 'teacher' }))}
                  >
                    <ThemedText style={[styles.roleBtnText, formData.role === 'teacher' && styles.roleBtnTextActive]}>
                      Teacher
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleBtn, formData.role === 'accountant' && styles.roleBtnActive]}
                    onPress={() => setFormData((p) => ({ ...p, role: 'accountant' }))}
                  >
                    <ThemedText style={[styles.roleBtnText, formData.role === 'accountant' && styles.roleBtnTextActive]}>
                      Accountant
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleBtn, formData.role === 'admin' && styles.roleBtnActive]}
                    onPress={() => setFormData((p) => ({ ...p, role: 'admin' }))}
                  >
                    <ThemedText style={[styles.roleBtnText, formData.role === 'admin' && styles.roleBtnTextActive]}>
                      Admin
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!formData.fullName || !formData.email) && styles.btnDisabled]}
                disabled={!formData.fullName || !formData.email || saveTeacherMutation.isPending}
                onPress={() => saveTeacherMutation.mutate()}
              >
                {saveTeacherMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Create Staff Member'}
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
  filterSection: { marginBottom: 14, gap: 8 },
  filterPillsRow: { gap: 8, paddingRight: 10 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillSm: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  filterPillText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  filterPillTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  listCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#334155' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 17 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  subText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155' },
  actionIconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
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
  infoNoteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  infoNoteText: { flex: 1, fontSize: 12, color: '#cbd5e1' },
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
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 9, alignItems: 'center' },
  roleBtnActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)' },
  roleBtnText: { fontSize: 12, color: '#94a3b8' },
  roleBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
