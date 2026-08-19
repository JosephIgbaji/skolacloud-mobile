import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MonitorPlay, Plus, Users, RefreshCw, CalendarRange, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function ClassesScreen() {
  const router = useRouter();

  const { data: classesList = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-classes-list'],
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Classes & Arms</ThemedText>
          <ThemedText style={styles.sub}>Academic arms & class teachers</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          {isFetching ? <ActivityIndicator size="small" color="#38bdf8" /> : <RefreshCw size={18} color="#38bdf8" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Academic Setup Navigation Banner */}
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => router.push('/academic-setup')}
        >
          <View style={styles.setupBannerIcon}>
            <CalendarRange size={20} color="#38bdf8" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.setupBannerTitle}>School Academic Setup</ThemedText>
            <ThemedText style={styles.setupBannerSub}>Configure Academic Sessions, Terms & Classes</ThemedText>
          </View>
          <ChevronRight size={18} color="#38bdf8" />
        </TouchableOpacity>

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
            <ThemedText style={styles.errorText}>Failed to load classes records.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : classesList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <MonitorPlay size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Classes Configured</ThemedText>
            <ThemedText style={styles.emptySub}>
              Use the School Academic Setup button above to create your school's classes and arms.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {classesList.map((c: any, idx: number) => {
              const className = `${c.grade || ''} - ${c.name || ''}`.trim();
              const teacherName = typeof c.teacherId === 'object' ? `${c.teacherId?.firstName || ''} ${c.teacherId?.lastName || ''}`.trim() : 'Unassigned';

              return (
                <ThemedView key={c._id || c.id || idx} style={styles.cardItem}>
                  <View style={styles.cardIconBox}>
                    <MonitorPlay size={20} color="#4ade80" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.cardTitle}>{className}</ThemedText>
                    <ThemedText style={styles.cardSub}>Teacher: {teacherName || 'Unassigned'}</ThemedText>
                  </View>
                  <Badge label={`Cap: ${c.capacity || 40}`} variant="neutral" size="sm" />
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
  setupBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#38bdf8', marginBottom: 14, gap: 12 },
  setupBannerIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.12)', justifyContent: 'center', alignItems: 'center' },
  setupBannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  setupBannerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#4ade80' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  cardIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(74, 222, 128, 0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#0284c7', borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
});
