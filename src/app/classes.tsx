import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MonitorPlay, Plus, Users, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function ClassesScreen() {
  const router = useRouter();

  const { data: classesList = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: async () => {
      const res = await apiClient.get('/classes');
      const raw = res.data;
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Classes & Sections</ThemedText>
          <ThemedText style={styles.sub}>Academic arms & class teachers</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <MonitorPlay size={18} color="#4ade80" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{classesList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Active Classes</ThemedText>
          </ThemedView>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load classes</ThemedText>
          </ThemedView>
        ) : classesList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <MonitorPlay size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Configured</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {classesList.map((item: any, idx: number) => {
              const className = `${item.grade || ''} ${item.name || ''}`.trim() || 'Class Arm';
              const capacity = item.capacity || 40;

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.classCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                      <MonitorPlay size={20} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.className}>{className}</ThemedText>
                      <ThemedText style={styles.classSub}>Grade: {item.grade || 'N/A'}</ThemedText>
                    </View>
                    <Badge label={`${item.studentCount || 0} / ${capacity}`} variant="neutral" size="sm" />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  content: { padding: 16 },
  statsRow: { marginBottom: 16 },
  statCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  statLabel: { fontSize: 11, color: '#94a3b8' },
  classCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  className: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  classSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
});
