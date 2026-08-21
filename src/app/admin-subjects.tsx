import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function AdminSubjectsScreen() {
  const router = useRouter();

  const { data: allSubjects = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-subjects-all'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subjects', { params: { limit: 100 } });
        const raw = res.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Subjects & Curriculum</ThemedText>
          <ThemedText style={styles.sub}>School Subject Directory</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Subject', 'Opening subject creation form...')}
        >
          <Plus size={16} color="#ffffff" />
          <ThemedText style={styles.addBtnText}>Add Subject</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : allSubjects.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <BookOpen size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Subjects Found</ThemedText>
            <ThemedText style={styles.emptySub}>No school subjects created yet.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {allSubjects.map((sub: any) => (
              <ThemedView key={sub._id || sub.id} style={styles.subjectCard}>
                <View style={styles.iconBox}>
                  <BookOpen size={20} color="#a78bfa" />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.subjectName}>{sub.name}</ThemedText>
                  <ThemedText style={styles.codeText}>Code: {sub.code || 'SUB-101'}</ThemedText>
                </View>

                <Badge label={sub.category || 'General'} variant="info" size="sm" />
              </ThemedView>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  content: { padding: 16, gap: 14 },
  subjectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(167, 139, 250, 0.15)', justifyContent: 'center', alignItems: 'center' },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  codeText: { fontSize: 12, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
