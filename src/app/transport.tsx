import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bus, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function TransportScreen() {
  const router = useRouter();

  const { data: routesList = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-transport-list'],
    queryFn: async () => {
      const res = await apiClient.get('/transport').catch(() => ({ data: [] }));
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
          <ThemedText style={styles.title}>School Transport</ThemedText>
          <ThemedText style={styles.sub}>Bus routes & driver assignments</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <Bus size={18} color="#a78bfa" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{routesList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Bus Routes</ThemedText>
          </ThemedView>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load transport routes</ThemedText>
          </ThemedView>
        ) : routesList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Bus size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Transport Routes Registered</ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 10 }}>
            {routesList.map((item: any, idx: number) => {
              const routeName = item.routeName || item.name || 'Bus Route';
              const driver = item.driverName || 'Assigned Driver';

              return (
                <ThemedView key={item._id || item.id || idx} style={styles.itemCard}>
                  <View style={styles.iconBox}>
                    <Bus size={18} color="#a78bfa" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemName}>{routeName}</ThemedText>
                    <ThemedText style={styles.itemSub}>Driver: {driver}</ThemedText>
                  </View>
                  <Badge label="ACTIVE" variant="info" size="sm" />
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
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167, 139, 250, 0.12)', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  itemSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
});
