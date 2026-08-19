import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, GraduationCap, Building2, UserPlus, RefreshCw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function StudentsScreen() {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const rawRole = (user?.role || 'student').toLowerCase();

  // Fetch real students from backend API
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students-list', rawRole],
    queryFn: async () => {
      let endpoint = '/admin/students';
      if (rawRole === 'teacher') endpoint = '/teacher/students';
      if (rawRole === 'parent') endpoint = '/parent/students';
      if (rawRole === 'student') endpoint = '/student/profile';

      const res = await apiClient.get(endpoint);
      const rawData = res.data;
      if (Array.isArray(rawData)) return rawData;
      if (Array.isArray(rawData?.data)) return rawData.data;
      if (Array.isArray(rawData?.students)) return rawData.students;
      return [];
    },
  });

  const studentsList: any[] = data || [];

  const filteredStudents = studentsList.filter((s) => {
    const fullName = `${s.firstName || ''} ${s.lastName || ''} ${s.fullName || s.name || ''}`.trim().toLowerCase();
    const adm = (s.admissionNo || s.admissionNumber || '').toLowerCase();
    const cls = (s.className || s.class?.name || s.classId?.name || '').toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || adm.includes(query) || cls.includes(query);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>Student Directory</ThemedText>
            <ThemedText style={styles.subtitle}>Enrolled students & academic classes</ThemedText>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
            <RefreshCw size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student name, ID or class..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <GraduationCap size={20} color="#38bdf8" style={{ marginBottom: 6 }} />
            <ThemedText style={styles.statNumber}>{studentsList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Enrolled Students</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <Building2 size={20} color="#4ade80" style={{ marginBottom: 6 }} />
            <ThemedText style={[styles.statNumber, { color: '#4ade80' }]}>
              {Math.max(1, Math.ceil(studentsList.length / 30))}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Active Classes</ThemedText>
          </ThemedView>
        </View>

        {/* Student Roster Section */}
        <ThemedText style={styles.sectionTitle}>
          Student Roster ({filteredStudents.length})
        </ThemedText>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <ThemedText style={styles.loadingText}>Fetching student records...</ThemedText>
          </View>
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load students</ThemedText>
            <ThemedText style={styles.emptySub}>Please check backend connection and retry.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry Connection</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : filteredStudents.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Users size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No students found</ThemedText>
            <ThemedText style={styles.emptySub}>
              {search ? 'No student records match your search criteria.' : 'No student records registered in the database yet.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listCard}>
            {filteredStudents.map((item, idx) => {
              const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.fullName || item.name || 'Student';
              const admNo = item.admissionNo || item.admissionNumber || `ID-${item._id?.substring(0, 6)}`;
              const className = item.className || item.class?.name || item.classId?.name || 'Unassigned';
              const status = item.isActive !== false ? 'Active' : 'Inactive';

              return (
                <View key={item._id || item.id || idx}>
                  {idx > 0 && <View style={styles.itemDivider} />}
                  <TouchableOpacity style={styles.studentItem}>
                    <View style={styles.avatarCircle}>
                      <ThemedText style={styles.avatarInitial}>
                        {displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.studentInfo}>
                      <ThemedText style={styles.studentName}>{displayName}</ThemedText>
                      <ThemedText style={styles.studentSub}>
                        {admNo} • <ThemedText style={{ color: '#38bdf8' }}>{className}</ThemedText>
                      </ThemedText>
                    </View>
                    <Badge label={status} variant={status === 'Active' ? 'success' : 'neutral'} size="sm" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    height: 48,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 14,
  },
  listCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  studentSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0284c7',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
