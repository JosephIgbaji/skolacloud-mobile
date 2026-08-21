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
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient } from '@/lib/api-client';

export default function AdminTimetableScreen() {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const { data: allClasses = [] } = useQuery({
    queryKey: ['admin-timetable-classes'],
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
          <ThemedText style={styles.title}>Master Timetable Builder</ThemedText>
          <ThemedText style={styles.sub}>School Period Schedules</ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Add Period', 'Opening timetable period builder...')}
        >
          <Plus size={16} color="#ffffff" />
          <ThemedText style={styles.addBtnText}>Add Slot</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <ThemedText style={styles.label}>SELECT CLASS TIMETABLE:</ThemedText>
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
          <Calendar size={42} color="#38bdf8" style={{ marginBottom: 10 }} />
          <ThemedText style={styles.emptyTitle}>Master Schedule Builder</ThemedText>
          <ThemedText style={styles.emptySub}>
            Select a class above to manage its weekly period schedule and assign subject teachers.
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  content: { padding: 16, gap: 14 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  pillBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  pillTextActive: { color: '#ffffff', fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#1e293b', padding: 36, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
