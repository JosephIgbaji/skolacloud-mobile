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
  MoreVertical,
  Pencil,
  Trash2,
  User,
  GraduationCap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { apiClient } from '@/lib/api-client';

export default function AcademicSetupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'terms' | 'classes'>('sessions');

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showClassActionModal, setShowClassActionModal] = useState(false);

  const [showGradePickerModal, setShowGradePickerModal] = useState(false);
  const [showTeacherPickerModal, setShowTeacherPickerModal] = useState(false);

  const [activeClass, setActiveClass] = useState<any | null>(null);
  const [isEditingClass, setIsEditingClass] = useState(false);

  // Form States
  const [sessionForm, setSessionForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    autoCreateTerms: true,
  });

  const [termForm, setTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    sessionId: '',
  });

  const [gradeNameInput, setGradeNameInput] = useState('');

  const [classForm, setClassForm] = useState({
    grade: '',
    name: '',
    section: '',
    roomNumber: '',
    capacity: '40',
    teacherId: '',
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

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

  // Active current session object
  const activeSessionObj = sessionsList.find((s: any) => (s._id || s.id) === selectedSessionId) ||
    sessionsList.find((s: any) => s.isCurrent) ||
    sessionsList[0];

  const currentSessionId = activeSessionObj ? (activeSessionObj._id || activeSessionObj.id) : '';

  // 2. Fetch Terms strictly for current session
  const { data: termsList = [], isLoading: isLoadingTerms, refetch: refetchTerms } = useQuery({
    queryKey: ['admin-terms', currentSessionId],
    enabled: Boolean(currentSessionId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/terms', { params: { sessionId: currentSessionId } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Registered Grades (Academic Levels e.g. JSS 1, SS 3)
  const { data: gradesList = [] } = useQuery({
    queryKey: ['admin-grades'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/grades');
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Classes List
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

  // 5. Fetch Teachers for Form Teacher Selector
  const { data: teachersList = [] } = useQuery({
    queryKey: ['admin-teachers-select'],
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

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/admin/sessions', {
        name: sessionForm.name.trim(),
        startDate: sessionForm.startDate,
        endDate: sessionForm.endDate,
        autoCreateTerms: sessionForm.autoCreateTerms,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-terms'] });
      setShowSessionModal(false);
      setSessionForm({ name: '', startDate: '', endDate: '', autoCreateTerms: true });
      Alert.alert('Success', 'Academic session & 3 terms created successfully!');
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
        sessionId: termForm.sessionId || currentSessionId,
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

  const createGradeMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/grades', { name: gradeNameInput.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grades'] });
      setShowGradeModal(false);
      setGradeNameInput('');
      Alert.alert('Success', 'Grade level created successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create grade.');
    },
  });

  // Handlers for Add & Edit Class
  const handleOpenAddClass = () => {
    setIsEditingClass(false);
    setActiveClass(null);
    setClassForm({
      grade: gradesList[0]?.name || '',
      name: '',
      section: '',
      roomNumber: '',
      capacity: '40',
      teacherId: '',
    });
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls: any) => {
    setIsEditingClass(true);
    setActiveClass(cls);

    const existingTeacherId = typeof cls.teacherId === 'object'
      ? (cls.teacherId?._id || cls.teacherId?.id || '')
      : (cls.teacherId || '');

    setClassForm({
      grade: cls.grade || '',
      name: cls.name || '',
      section: cls.section || '',
      roomNumber: cls.roomNumber || '',
      capacity: String(cls.capacity || '40'),
      teacherId: existingTeacherId,
    });
    setShowClassActionModal(false);
    setShowClassModal(true);
  };

  // Mutation: Save Class (Create / Update)
  const saveClassMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        grade: classForm.grade.trim(),
        name: classForm.name.trim(),
        capacity: Number(classForm.capacity) || 40,
      };
      if (classForm.section.trim()) payload.section = classForm.section.trim();
      if (classForm.roomNumber.trim()) payload.roomNumber = classForm.roomNumber.trim();
      if (classForm.teacherId) payload.teacherId = classForm.teacherId;

      if (isEditingClass && activeClass) {
        const id = activeClass._id || activeClass.id;
        return await apiClient.patch(`/admin/classes/${id}`, payload);
      } else {
        return await apiClient.post('/admin/classes', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setShowClassModal(false);
      Alert.alert(
        'Success',
        isEditingClass ? 'Class details updated successfully!' : 'New class created successfully!'
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save class.');
    },
  });

  // Mutation: Delete Class
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/admin/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setShowClassActionModal(false);
      setActiveClass(null);
      Alert.alert('Success', 'Class arm deleted successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete class.');
    },
  });

  const refetchAll = () => {
    refetchSessions();
    refetchTerms();
    refetchClasses();
  };

  const selectedTeacherObj = teachersList.find(
    (t: any) => (t._id || t.id) === classForm.teacherId
  );
  const selectedTeacherName = selectedTeacherObj
    ? (selectedTeacherObj.fullName || `${selectedTeacherObj.firstName || ''} ${selectedTeacherObj.lastName || ''}`.trim())
    : 'None';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>School Academic Setup</ThemedText>
          <ThemedText style={styles.sub}>Configure sessions, terms & class structure</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={refetchAll}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Progress Overview */}
        <ThemedView style={styles.progressCard}>
          <ThemedText style={styles.progressCardTitle}>Setup Checklist</ThemedText>
          <ThemedText style={styles.progressCardSub}>Complete these 3 steps to onboard your school</ThemedText>

          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={sessionsList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, sessionsList.length > 0 && styles.stepTextDone]}>
                1. Academic Sessions ({sessionsList.length})
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={termsList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, termsList.length > 0 && styles.stepTextDone]}>
                2. Academic Terms ({termsList.length})
              </ThemedText>
            </View>

            <View style={styles.stepItem}>
              <CheckCircle2 size={16} color={classesList.length > 0 ? '#4ade80' : '#64748b'} />
              <ThemedText style={[styles.stepText, classesList.length > 0 && styles.stepTextDone]}>
                3. Classes & Arms ({classesList.length})
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Tab Switcher */}
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
                <ThemedText style={styles.emptyTitle}>No Academic Sessions Found</ThemedText>
                <ThemedText style={styles.emptySub}>Create your school's first academic session (e.g. 2025/2026).</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {sessionsList.map((item: any, idx: number) => {
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
                      <Badge label={item.isCurrent ? 'ACTIVE' : 'SESSION'} variant={item.isCurrent ? 'success' : 'info'} size="sm" />
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
              <View>
                <ThemedText style={styles.sectionTitle}>Academic Terms</ThemedText>
                <ThemedText style={styles.sessionBadgeText}>
                  Session: {activeSessionObj?.name || 'Current Session'}
                </ThemedText>
              </View>
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
                <ThemedText style={styles.emptyTitle}>No Terms Found for {activeSessionObj?.name || 'Session'}</ThemedText>
                <ThemedText style={styles.emptySub}>Add terms to this session (e.g. 1st Term, 2nd Term, 3rd Term).</ThemedText>
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

        {/* TAB 3: CLASSES & ARMS */}
        {activeTab === 'classes' && (
          <View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Classes & Arms</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.secondaryAddBtn} onPress={() => setShowGradeModal(true)}>
                  <GraduationCap size={15} color="#38bdf8" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.secondaryAddBtnText}>Add Grade</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryAddBtn} onPress={handleOpenAddClass}>
                  <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.primaryAddBtnText}>Add Class Arm</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {isLoadingClasses ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : classesList.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <MonitorPlay size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Classes Configured</ThemedText>
                <ThemedText style={styles.emptySub}>Add class arms (e.g. Grade: SS 3, Arm: GOLD, Capacity: 40).</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {classesList.map((item: any, idx: number) => {
                  const className = `${item.grade || ''} - ${item.name || ''}`.trim();
                  const teacherObj = typeof item.teacherId === 'object' ? item.teacherId : null;
                  const teacherName = teacherObj
                    ? (teacherObj.fullName || `${teacherObj.firstName || ''} ${teacherObj.lastName || ''}`.trim())
                    : 'Unassigned';

                  const extraDetails = [
                    item.section ? `Sec: ${item.section}` : null,
                    item.roomNumber ? `Room: ${item.roomNumber}` : null,
                  ].filter(Boolean).join(' • ');

                  return (
                    <ThemedView key={item._id || item.id || idx} style={styles.cardItem}>
                      <View style={[styles.cardIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.12)' }]}>
                        <MonitorPlay size={20} color="#a78bfa" />
                      </View>

                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <ThemedText style={styles.cardTitle}>{className}</ThemedText>
                        <ThemedText style={styles.cardSub}>Teacher: {teacherName}</ThemedText>
                        {extraDetails ? (
                          <ThemedText style={styles.extraDetailsText}>{extraDetails}</ThemedText>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge label={`Cap: ${item.capacity || 40}`} variant="neutral" size="sm" />
                      </View>

                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => {
                          setActiveClass(item);
                          setShowClassActionModal(true);
                        }}
                      >
                        <MoreVertical size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal 1: Add Session */}
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

            <DatePickerField
              label="Start Date *"
              value={sessionForm.startDate}
              onChange={(val) => setSessionForm((p) => ({ ...p, startDate: val }))}
              placeholder="Select Start Date"
            />

            <DatePickerField
              label="End Date *"
              value={sessionForm.endDate}
              onChange={(val) => setSessionForm((p) => ({ ...p, endDate: val }))}
              placeholder="Select End Date"
            />

            <View style={styles.autoTermCard}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.autoTermTitle}>Auto-Create 3 Terms (1st, 2nd, 3rd)</ThemedText>
                <ThemedText style={styles.autoTermSub}>Automatically provisions standard Nigerian terms for this session</ThemedText>
              </View>
              <Switch
                value={sessionForm.autoCreateTerms}
                onValueChange={(val) => setSessionForm((p) => ({ ...p, autoCreateTerms: val }))}
                trackColor={{ false: '#334155', true: '#0284c7' }}
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

            <DatePickerField
              label="Start Date *"
              value={termForm.startDate}
              onChange={(val) => setTermForm((p) => ({ ...p, startDate: val }))}
              placeholder="Select Term Start Date"
            />

            <DatePickerField
              label="End Date *"
              value={termForm.endDate}
              onChange={(val) => setTermForm((p) => ({ ...p, endDate: val }))}
              placeholder="Select Term End Date"
            />

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

      {/* Modal 3: Add Grade Level */}
      <Modal visible={showGradeModal} transparent animationType="slide" onRequestClose={() => setShowGradeModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Grade Level</ThemedText>
              <TouchableOpacity onPress={() => setShowGradeModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Grade Name *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. JSS 1, SS 3, PRIMARY 2"
                placeholderTextColor="#64748b"
                value={gradeNameInput}
                onChangeText={setGradeNameInput}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, !gradeNameInput.trim() && styles.btnDisabled]}
              disabled={!gradeNameInput.trim() || createGradeMutation.isPending}
              onPress={() => createGradeMutation.mutate()}
            >
              {createGradeMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>Add Grade Level</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Modal 4: Add / Edit Class Arm */}
      <Modal visible={showClassModal} transparent animationType="slide" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {isEditingClass ? 'Edit Class Arm' : 'Create Class Arm'}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Grade / Level *</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowGradePickerModal(true)}
                >
                  <ThemedText style={classForm.grade ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {classForm.grade || 'Select Grade Level'}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Arm / Class Name *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. GOLD, SILVER, 1A"
                  placeholderTextColor="#64748b"
                  value={classForm.name}
                  onChangeText={(val) => setClassForm((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.formLabel}>Section (Optional)</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Science"
                    placeholderTextColor="#64748b"
                    value={classForm.section}
                    onChangeText={(val) => setClassForm((p) => ({ ...p, section: val }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.formLabel}>Room No. (Optional)</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 101"
                    placeholderTextColor="#64748b"
                    value={classForm.roomNumber}
                    onChangeText={(val) => setClassForm((p) => ({ ...p, roomNumber: val }))}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Max Capacity (Optional)</ThemedText>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 40"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={classForm.capacity}
                  onChangeText={(val) => setClassForm((p) => ({ ...p, capacity: val }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Assigned Form Teacher (Optional)</ThemedText>
                <TouchableOpacity
                  style={styles.formInputSelect}
                  onPress={() => setShowTeacherPickerModal(true)}
                >
                  <ThemedText style={classForm.teacherId ? styles.formInputSelectText : styles.formInputPlaceholder}>
                    {selectedTeacherName}
                  </ThemedText>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, (!classForm.grade || !classForm.name) && styles.btnDisabled]}
                disabled={!classForm.grade || !classForm.name || saveClassMutation.isPending}
                onPress={() => saveClassMutation.mutate()}
              >
                {saveClassMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>
                    {isEditingClass ? 'Save Changes' : 'Create Class Arm'}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Class Action Sheet Modal */}
      <Modal visible={showClassActionModal} transparent animationType="fade" onRequestClose={() => setShowClassActionModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Class Arm Actions</ThemedText>
              <TouchableOpacity onPress={() => setShowClassActionModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {activeClass && (
              <View style={styles.previewCard}>
                <ThemedText style={styles.previewName}>
                  {activeClass.grade} - {activeClass.name}
                </ThemedText>
                <ThemedText style={styles.previewSub}>
                  Capacity: {activeClass.capacity || 40} • Room: {activeClass.roomNumber || 'N/A'}
                </ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => handleOpenEditClass(activeClass)}
            >
              <Pencil size={20} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.actionItemTitle}>Edit Class Details</ThemedText>
                <ThemedText style={styles.actionItemSub}>Modify grade, arm name, capacity & teacher</ThemedText>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                const id = activeClass._id || activeClass.id;
                Alert.alert(
                  'Delete Class Arm',
                  `Are you sure you want to delete ${activeClass?.grade} - ${activeClass?.name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteClassMutation.mutate(id) },
                  ]
                );
              }}
            >
              <Trash2 size={20} color="#f87171" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.actionItemTitle, { color: '#f87171' }]}>Delete Class Arm</ThemedText>
                <ThemedText style={styles.actionItemSub}>Remove class arm configuration</ThemedText>
              </View>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* Grade Picker Modal */}
      <Modal visible={showGradePickerModal} transparent animationType="slide" onRequestClose={() => setShowGradePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Grade Level</ThemedText>
              <TouchableOpacity onPress={() => setShowGradePickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {gradesList.map((g: any) => {
                const gName = g.name || g;
                const isSelected = classForm.grade === gName;
                return (
                  <TouchableOpacity
                    key={g._id || g.id || gName}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setClassForm((p) => ({ ...p, grade: gName }));
                      setShowGradePickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {gName}
                    </ThemedText>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Teacher Picker Modal */}
      <Modal visible={showTeacherPickerModal} transparent animationType="slide" onRequestClose={() => setShowTeacherPickerModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Form Teacher</ThemedText>
              <TouchableOpacity onPress={() => setShowTeacherPickerModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.pickerItem, !classForm.teacherId && styles.pickerItemActive]}
                onPress={() => {
                  setClassForm((p) => ({ ...p, teacherId: '' }));
                  setShowTeacherPickerModal(false);
                }}
              >
                <ThemedText style={[styles.pickerItemText, !classForm.teacherId && styles.pickerItemTextActive]}>
                  None
                </ThemedText>
                {!classForm.teacherId && <Check size={18} color="#38bdf8" />}
              </TouchableOpacity>

              {teachersList.map((t: any) => {
                const tId = t._id || t.id;
                const isSelected = classForm.teacherId === tId;
                const name = t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email;

                return (
                  <TouchableOpacity
                    key={tId}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setClassForm((p) => ({ ...p, teacherId: tId }));
                      setShowTeacherPickerModal(false);
                    }}
                  >
                    <ThemedText style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
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
  sessionBadgeText: { fontSize: 12, color: '#38bdf8', marginTop: 2 },
  primaryAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  primaryAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  secondaryAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
  secondaryAddBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  cardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  cardIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  extraDetailsText: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  actionIconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
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
  autoTermCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155', marginVertical: 8 },
  autoTermTitle: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
  autoTermSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: '#0f172a', marginBottom: 6 },
  pickerItemActive: { borderColor: '#38bdf8', borderWidth: 1, backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  pickerItemText: { fontSize: 14, color: '#cbd5e1' },
  pickerItemTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});
