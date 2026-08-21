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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  GraduationCap,
  Search,
  RefreshCw,
  X,
  UserPlus,
  Filter,
  ShieldCheck,
  Building,
  Upload,
  Layers,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function AdminStudentsScreen() {
  const router = useRouter();

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 1. Fetch All School Classes for Admin Filter
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
    return found ? found.name : 'Selected Class';
  }, [allClasses, selectedClassId]);

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
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => Alert.alert('Add Student', 'Opening new student registration portal...')}
          >
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
                    {cls.name}
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
              const className = (s.classId as any)?.name || s.className || 'N/A';

              return (
                <ThemedView key={s._id || s.id} style={styles.studentCard}>
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
                      variant={s.status === 'active' ? 'success' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </ThemedView>
              );
            })}
          </View>
        )}
      </ScrollView>
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

  studentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  studentSubText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
