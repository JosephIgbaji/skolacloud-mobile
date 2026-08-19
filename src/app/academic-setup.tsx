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
  Calendar,
  CalendarRange,
  MonitorPlay,
  Plus,
  Check,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function AcademicSetupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'terms' | 'classes'>('sessions');

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  // Form States
  const [sessionForm, setSessionForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const [termForm, setTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    sessionId: '',
  });

  const [classForm, setClassForm] = useState({
    grade: '',
    name: '',
    capacity: '40',
  });

  // 1. Fetch Sessions
  const { data: sessionsList = [], isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['admin-sessions'],
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

  // 2. Fetch Terms
  const { data: termsList = [], isLoading: isLoadingTerms, refetch: refetchTerms } = useQuery({
    queryKey: ['admin-terms'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/terms');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Classes
  const { data: classesList = [], isLoading: isLoadingClasses, refetch: refetchClasses } = useQuery({
    queryKey: ['admin-classes'],
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

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/sessions', {
        name: sessionForm.name.trim(),
        startDate: sessionForm.startDate,
        endDate: sessionForm.endDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setShowSessionModal(false);
      setSessionForm({ name: '', startDate: '', endDate: '' });
      Alert.alert('Success', 'Academic session created successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create academic session.');
    },
  });

  const createTermMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/terms', {
        name: termForm.name.trim(),
        startDate: termForm.startDate,
        endDate: termForm.endDate,
        sessionId: termForm.sessionId || sessionsList[0]?._id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terms'] });
      setShowTermModal(false);
      setTermForm({ name: '', startDate: '', endDate: '', sessionId: '' });
      Alert.alert('Success', 'Academic term created successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create term.');
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/classes', {
        grade: classForm.grade.trim(),
        name: classForm.name.trim(),
        capacity: Number(classForm.capacity) || 40,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setShowClassModal(false);
      setClassForm({ grade: '', name: '', capacity: '40' });
      Alert.alert('Success', 'Class created successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create class.');
    },
  });

  const refetchAll = () => {
    refetchSessions();
    refetchTerms();
    refetchClasses();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>School Academic Setup</ThemedText>
          <ThemedText style={styles.sub}>Sessions, terms & class structure</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={refetchAll}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Onboarding Setup Progress Card */}
        <ThemedView style={styles.progressCard}>
          <ThemedText style={styles.progressCardTitle}>Initial Setup Progress</ThemedText>
          <ThemedText style={styles.progressCardSub}>Configure academic year foundation for your school</ThemedText>

          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={sessionsList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, sessionsList.length > 0 && styles.stepTextDone]}>
                1. Sessions ({sessionsList.length})
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={termsList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, termsList.length > 0 && styles.stepTextDone]}>
                2. Terms ({termsList.length})
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={classesList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, classesList.length > 0 && styles.stepTextDone]}>
                3. Classes ({classesList.length})
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'sessions' && styles.tabBtnActive]}
            onPress={() => setActiveTab('sessions')}
          >
            <CalendarRange size={16} color={activeTab === 'sessions' ? '#38bdf8' : '#64748b'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'sessions' && styles.tabBtnTextActive]}>
              Sessions ({sessionsList.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'terms' && styles.tabBtnActive]}
            onPress={() => setActiveTab('terms')}
          >
            <Calendar size={16} color={activeTab === 'terms' ? '#38bdf8' : '#64748b'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'terms' && styles.tabBtnTextActive]}>
              Terms ({termsList.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'classes' && styles.tabBtnActive]}
            onPress={() => setActiveTab('classes')}
          >
            <MonitorPlay size={16} color={activeTab === 'classes' ? '#38bdf8' : '#64748b'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'classes' && styles.tabBtnTextActive]}>
              Classes ({classesList.length})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* TAB 1: SESSIONS */}
        {activeTab === 'sessions' && (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Academic Sessions</ThemedText>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => setShowSessionModal(true)}>
                <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <ThemedText style={styles.primaryAddBtnText}>Add Session</ThemedText>
              </TouchableOpacity>
            </View>

            {isLoadingSessions ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : sessionsList.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <CalendarRange size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Academic Sessions Created</ThemedText>
                <ThemedText style={styles.emptySub}>Create your school session (e.g. 2025/2026 Academic Year).</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {sessionsList.map((item: any, idx: number) => {
                  const isCurrent = item.isCurrent || idx === 0;
                  return (
                    <ThemedView key={item._id || item.id || idx} style={styles.cardItem}>
                      <View style={styles.cardIconBox}>
                        <CalendarRange size={20} color="#38bdf8" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                        <ThemedText style={styles.cardSub}>
                          {item.startDate ? String(item.startDate).split('T')[0] : 'Start Date'} — {item.endDate ? String(item.endDate).split('T')[0] : 'End Date'}
                        </ThemedText>
                      </View>
                      <Badge label={isCurrent ? 'CURRENT' : 'SESSION'} variant={isCurrent ? 'success' : 'neutral'} size="sm" />
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: TERMS */}
        {activeTab === 'terms' && (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Academic Terms</ThemedText>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => setShowTermModal(true)}>
                <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <ThemedText style={styles.primaryAddBtnText}>Add Term</ThemedText>
              </TouchableOpacity>
            </View>

            {isLoadingTerms ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : termsList.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Calendar size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Academic Terms Created</ThemedText>
                <ThemedText style={styles.emptySub}>Add terms to active session (e.g. 1st Term, 2nd Term, 3rd Term).</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {termsList.map((item: any, idx: number) => {
                  return (
                    <ThemedView key={item._id || item.id || idx} style={styles.cardItem}>
                      <View style={[styles.cardIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.12)' }]}>
                        <Calendar size={20} color="#4ade80" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
                        <ThemedText style={styles.cardSub}>
                          {item.startDate ? String(item.startDate).split('T')[0] : 'Start Date'} — {item.endDate ? String(item.endDate).split('T')[0] : 'End Date'}
                        </ThemedText>
                      </View>
                      <Badge label={item.isCurrent ? 'ACTIVE TERM' : 'TERM'} variant={item.isCurrent ? 'success' : 'info'} size="sm" />
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: CLASSES */}
        {activeTab === 'classes' && (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Classes & Arms</ThemedText>
              <TouchableOpacity style={styles.primaryAddBtn} onPress={() => setShowClassModal(true)}>
                <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <ThemedText style={styles.primaryAddBtnText}>Add Class</ThemedText>
              </TouchableOpacity>
            </View>

            {isLoadingClasses ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : classesList.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <MonitorPlay size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Classes Created</ThemedText>
                <ThemedText style={styles.emptySub}>Create class grades and arms (e.g. Grade: SS 3, Arm: GOLD).</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {classesList.map((item: any, idx: number) => {
                  const className = `${item.grade || ''} - ${item.name || ''}`.trim();
                  return (
                    <ThemedView key={item._id || item.id || idx} style={styles.cardItem}>
                      <View style={[styles.cardIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.12)' }]}>
                        <MonitorPlay size={20} color="#a78bfa" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.cardTitle}>{className}</ThemedText>
                        <ThemedText style={styles.cardSub}>Grade: {item.grade} • Arm: {item.name}</ThemedText>
                      </View>
                      <Badge label={`Cap: ${item.capacity || 40}`} variant="neutral" size="sm" />
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal 1: Add Academic Session */}
      <Modal visible={showSessionModal} transparent animationType="slide" onRequestClose={() => setShowSessionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Academic Session</ThemedText>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Session Name *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2025/2026 Academic Session"
                placeholderTextColor="#64748b"
                value={sessionForm.name}
                onChangeText={(val) => setSessionForm((p) => ({ ...p, name: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Start Date (YYYY-MM-DD) *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2025-09-01"
                placeholderTextColor="#64748b"
                value={sessionForm.startDate}
                onChangeText={(val) => setSessionForm((p) => ({ ...p, startDate: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>End Date (YYYY-MM-DD) *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2026-07-25"
                placeholderTextColor="#64748b"
                value={sessionForm.endDate}
                onChangeText={(val) => setSessionForm((p) => ({ ...p, endDate: val }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!sessionForm.name || !sessionForm.startDate || !sessionForm.endDate) && styles.btnDisabled]}
              disabled={!sessionForm.name || !sessionForm.startDate || !sessionForm.endDate || createSessionMutation.isPending}
              onPress={() => createSessionMutation.mutate()}
            >
              {createSessionMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>Save Academic Session</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Modal 2: Add Term */}
      <Modal visible={showTermModal} transparent animationType="slide" onRequestClose={() => setShowTermModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Academic Term</ThemedText>
              <TouchableOpacity onPress={() => setShowTermModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Term Name *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 1st Term"
                placeholderTextColor="#64748b"
                value={termForm.name}
                onChangeText={(val) => setTermForm((p) => ({ ...p, name: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Start Date (YYYY-MM-DD) *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2025-09-10"
                placeholderTextColor="#64748b"
                value={termForm.startDate}
                onChangeText={(val) => setTermForm((p) => ({ ...p, startDate: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>End Date (YYYY-MM-DD) *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 2025-12-18"
                placeholderTextColor="#64748b"
                value={termForm.endDate}
                onChangeText={(val) => setTermForm((p) => ({ ...p, endDate: val }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!termForm.name || !termForm.startDate || !termForm.endDate) && styles.btnDisabled]}
              disabled={!termForm.name || !termForm.startDate || !termForm.endDate || createTermMutation.isPending}
              onPress={() => createTermMutation.mutate()}
            >
              {createTermMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>Save Academic Term</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Modal 3: Add Class & Arm */}
      <Modal visible={showClassModal} transparent animationType="slide" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create Class & Arm</ThemedText>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Grade / Class Group *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SS 3 or JSS 1 or PRIMARY 2"
                placeholderTextColor="#64748b"
                value={classForm.grade}
                onChangeText={(val) => setClassForm((p) => ({ ...p, grade: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Class Arm / Name *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. GOLD or SILVER or A"
                placeholderTextColor="#64748b"
                value={classForm.name}
                onChangeText={(val) => setClassForm((p) => ({ ...p, name: val }))}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Class Capacity</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 40"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={classForm.capacity}
                onChangeText={(val) => setClassForm((p) => ({ ...p, capacity: val }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!classForm.grade || !classForm.name) && styles.btnDisabled]}
              disabled={!classForm.grade || !classForm.name || createClassMutation.isPending}
              onPress={() => createClassMutation.mutate()}
            >
              {createClassMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>Create Class Arm</ThemedText>
              )}
            </TouchableOpacity>
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
  content: { padding: 16 },
  progressCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  progressCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  progressCardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 12 },
  stepRow: { gap: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { fontSize: 13, color: '#64748b' },
  stepTextDone: { color: '#f8fafc', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf8' },
  tabBtnText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  tabBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#f8fafc' },
  primaryAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  primaryAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  cardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  cardIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 42, fontSize: 14 },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
