import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MonitorPlay,
  RefreshCw,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function TeacherClassesScreen() {
  const router = useRouter();

  const { data: myClasses = [], isLoading, refetch } = useQuery({
    queryKey: ['teacher-classes-list-workspace'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/teachers/classes').catch(() => null);
        let list = res?.data;
        if (list && typeof list === 'object' && Array.isArray(list.data)) list = list.data;
        if (!Array.isArray(list)) list = [];
        if (list.length === 0) {
          const fallback = await apiClient.get('/teachers/classes/all').catch(() => null);
          if (Array.isArray(fallback?.data)) list = fallback.data;
        }
        return list;
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
          <ThemedText style={styles.title}>My Assigned Classes</ThemedText>
          <ThemedText style={styles.sub}>Class Teacher Responsibilities</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : myClasses.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <MonitorPlay size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Assigned</ThemedText>
            <ThemedText style={styles.emptySub}>You have not been assigned as a primary class teacher yet.</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 12 }}>
            {myClasses.map((cls: any) => (
              <TouchableOpacity
                key={cls._id || cls.id}
                style={styles.classCard}
                onPress={() => router.push('/teacher-students')}
              >
                <View style={styles.iconBox}>
                  <MonitorPlay size={20} color="#4ade80" />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={styles.className}>{cls.name}</ThemedText>
                  <ThemedText style={styles.subText}>Grade: {cls.grade || 'Junior Secondary'}</ThemedText>
                </View>

                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },
  content: { padding: 16, gap: 14 },
  classCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(74, 222, 128, 0.15)', justifyContent: 'center', alignItems: 'center' },
  className: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  subText: { fontSize: 12, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
