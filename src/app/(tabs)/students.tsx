import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, GraduationCap, Building2, ChevronRight, UserPlus } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';

export default function StudentsScreen() {
  const [search, setSearch] = useState('');

  const mockStudents = [
    { id: '1', name: 'Amina Yusuf', admissionNo: 'SK-2025-001', class: 'SS 3 Gold', status: 'Active' },
    { id: '2', name: 'Chidiebere Okafor', admissionNo: 'SK-2025-004', class: 'SS 3 Gold', status: 'Active' },
    { id: '3', name: 'Emmanuel Adebayo', admissionNo: 'SK-2025-012', class: 'JSS 2 Diamond', status: 'Active' },
    { id: '4', name: 'Fatima Ibrahim', admissionNo: 'SK-2025-019', class: 'Primary 5 Alpha', status: 'Active' },
    { id: '5', name: 'Grace Danjuma', admissionNo: 'SK-2025-027', class: 'JSS 1 Silver', status: 'Active' },
  ];

  const filteredStudents = mockStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Student Roster</ThemedText>
          <ThemedText style={styles.subtitle}>Academic directory & class enrollments</ThemedText>
        </View>

        {/* Search Bar */}
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
            <ThemedText style={styles.statNumber}>1,248</ThemedText>
            <ThemedText style={styles.statLabel}>Enrolled Students</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <Building2 size={20} color="#4ade80" style={{ marginBottom: 6 }} />
            <ThemedText style={[styles.statNumber, { color: '#4ade80' }]}>24</ThemedText>
            <ThemedText style={styles.statLabel}>Active Classes</ThemedText>
          </ThemedView>
        </View>

        {/* Student List */}
        <ThemedText style={styles.sectionTitle}>Students ({filteredStudents.length})</ThemedText>

        <ThemedView style={styles.listCard}>
          {filteredStudents.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 && <View style={styles.itemDivider} />}
              <TouchableOpacity style={styles.studentItem}>
                <View style={styles.avatarCircle}>
                  <ThemedText style={styles.avatarInitial}>{item.name.charAt(0)}</ThemedText>
                </View>
                <View style={styles.studentInfo}>
                  <ThemedText style={styles.studentName}>{item.name}</ThemedText>
                  <ThemedText style={styles.studentSub}>
                    {item.admissionNo} • <ThemedText style={{ color: '#38bdf8' }}>{item.class}</ThemedText>
                  </ThemedText>
                </View>
                <Badge label={item.status} variant="success" size="sm" />
              </TouchableOpacity>
            </View>
          ))}
        </ThemedView>
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
  header: {
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
});
