import React from 'react';
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
  MonitorPlay,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = typeof cls === 'string' ? cls : (cls.name || '').trim();
  const grade = (cls.grade || cls.gradeLevel || cls.classGroup || cls.group || '').trim();

  if (!grade) return name || 'Class';
  if (!name) return grade;

  if (name.toLowerCase().includes(grade.toLowerCase())) {
    return name;
  }
  if (name.length <= 3) {
    return `${grade} ${name}`;
  }
  return `${grade} (${name})`;
}

export default function AdminClassesScreen() {
  const router = useRouter();

  const { data: allClasses = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-classes-all-directory'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/classes');
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
          <ThemedText style={styles.title}>Classes & Arms Setup</ThemedText>
          <ThemedText style={styles.sub}>School Grade Structure</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Class', 'Opening new class form...')}
        >
          <Plus size={16} color="#ffffff" />
          <ThemedText style={styles.addBtnText}>Add Class</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : allClasses.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <MonitorPlay size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Found</ThemedText>
            <ThemedText style={styles.emptySub}>No school classes created yet.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {allClasses.map((cls: any) => {
              const teacherName = (cls.teacherId as any)?.fullName || (cls.teacherId as any)?.name || 'Unassigned';

              return (
                <ThemedView key={cls._id || cls.id} style={styles.classCard}>
                  <View style={styles.iconBox}>
                    <MonitorPlay size={20} color="#4ade80" />
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText style={styles.className}>{formatClassLabel(cls)}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <UserCheck size={12} color="#94a3b8" />
                      <ThemedText style={styles.subText}>Teacher: {teacherName}</ThemedText>
                    </View>
                  </View>

                  <Badge label={cls.grade || 'Grade'} variant="info" size="sm" />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  content: { padding: 16, gap: 14 },
  classCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(74, 222, 128, 0.15)', justifyContent: 'center', alignItems: 'center' },
  className: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  subText: { fontSize: 12, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
