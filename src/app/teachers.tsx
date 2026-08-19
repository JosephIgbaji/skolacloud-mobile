import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Users, UserPlus, Mail, Phone, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function TeachersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: staffList = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-teachers-list'],
    queryFn: async () => {
      const res = await apiClient.get('/users');
      const raw = res.data;
      const data = Array.isArray(raw) ? raw : raw?.data || [];
      return data.filter((u: any) => u.role === 'teacher' || u.role === 'accountant' || u.role === 'staff');
    },
  });

  const filteredStaff = staffList.filter((s: any) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const email = (s.email || '').toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Teachers & Staff</ThemedText>
          <ThemedText style={styles.sub}>Manage faculty & user roles</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => refetch()}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff name or email..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <Users size={18} color="#38bdf8" style={{ marginBottom: 4 }} />
            <ThemedText style={styles.statNum}>{staffList.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Faculty</ThemedText>
          </ThemedView>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load staff list</ThemedText>
          </ThemedView>
        ) : filteredStaff.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Users size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Faculty Found</ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listCard}>
            {filteredStaff.map((item: any, idx: number) => {
              const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
              const roleLabel = (item.role || 'teacher').toUpperCase();

              return (
                <View key={item._id || item.id || idx}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.itemRow}>
                    <View style={styles.avatarCircle}>
                      <ThemedText style={styles.avatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.nameText}>{displayName}</ThemedText>
                      <ThemedText style={styles.subText}>{item.email}</ThemedText>
                    </View>
                    <Badge label={roleLabel} variant="info" size="sm" />
                  </View>
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },
  content: { padding: 16 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },
  statsRow: { marginBottom: 14 },
  statCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#334155' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  statLabel: { fontSize: 11, color: '#94a3b8' },
  listCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#334155' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  nameText: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  subText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155' },
  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
});
