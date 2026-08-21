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
  Award,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Download,
  Share2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function AdminResultsScreen() {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Fetch School Classes
  const { data: allClasses = [] } = useQuery({
    queryKey: ['admin-classes-results-broadsheet'],
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
          <ThemedText style={styles.title}>Results & Broadsheets</ThemedText>
          <ThemedText style={styles.sub}>Admin Approval & Publishing</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.cardBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="#38bdf8" />
            <ThemedText style={styles.cardTitle}>EXAM APPROVAL & BROADSHEET PORTAL</ThemedText>
          </View>
          <ThemedText style={styles.cardSub}>
            Approve teacher-submitted grade entries and publish report cards to parents.
          </ThemedText>
        </ThemedView>

        {/* Class Filter */}
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.label}>SELECT CLASS BROADSHEET:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.pillBtn, selectedClassId === 'all' && styles.pillBtnActive]}
              onPress={() => setSelectedClassId('all')}
            >
              <ThemedText style={[styles.pillText, selectedClassId === 'all' && styles.pillTextActive]}>
                All Classes
              </ThemedText>
            </TouchableOpacity>

            {allClasses.map((cls: any) => {
              const cId = (cls._id || cls.id).toString();
              const isSel = selectedClassId === cId;
              return (
                <TouchableOpacity
                  key={cId}
                  style={[styles.pillBtn, isSel && styles.pillBtnActive]}
                  onPress={() => setSelectedClassId(cId)}
                >
                  <ThemedText style={[styles.pillText, isSel && styles.pillTextActive]}>
                    {cls.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ThemedView style={styles.emptyCard}>
          <FileSpreadsheet size={42} color="#38bdf8" style={{ marginBottom: 10 }} />
          <ThemedText style={styles.emptyTitle}>Broadsheet Ready</ThemedText>
          <ThemedText style={styles.emptySub}>
            Select a class above to generate termly broadsheets and approve grades.
          </ThemedText>
        </ThemedView>
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
  content: { padding: 16, gap: 14 },
  cardBox: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: '#38bdf8' },
  cardSub: { fontSize: 12, color: '#94a3b8' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#1e293b', padding: 36, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
