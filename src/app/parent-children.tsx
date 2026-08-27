import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Phone,
  MessageSquare,
  School,
  UserCheck,
  Calendar,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

function formatClassLabel(cls: any): string {
  if (!cls) return 'Class';
  const name = typeof cls === 'string' ? cls : (cls.name || cls.className || '').trim();
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

export default function ParentChildrenScreen() {
  const router = useRouter();

  // 1. Fetch Parent's Linked Children
  const {
    data: childrenList = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['parent-children-full-list'],
    queryFn: async () => {
      try {
        let res = await apiClient.get('/parent/students/children').catch(() => null);
        if (!res?.data) res = await apiClient.get('/parents/children').catch(() => null);
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  const handleCallTeacher = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>My Children / Wards</ThemedText>
          <ThemedText style={styles.sub}>Academic Directory & Teacher Contacts</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#38bdf8" />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
        ) : childrenList.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <Users size={36} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No Children Linked</ThemedText>
            <ThemedText style={styles.emptySub}>
              Please contact the school administration to link your child's profile to your parent account.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: 14 }}>
            {childrenList.map((child: any) => {
              const fullName = `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Student';
              const className = formatClassLabel(child.classId || { name: child.className, grade: child.grade });
              const admNo = child.admissionNumber || 'N/A';
              const gender = child.gender || 'N/A';
              const teacherName = child.classTeacherName || child.classId?.teacherId?.fullName || child.classId?.teacherId?.name || 'Class Teacher';
              const teacherPhone = child.classTeacherPhone || child.classId?.teacherId?.phone || '';

              return (
                <ThemedView key={child._id || child.id} style={styles.childCard}>
                  <View style={styles.childCardTop}>
                    <View style={styles.avatarBox}>
                      <ThemedText style={styles.avatarText}>
                        {fullName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.childName}>{fullName}</ThemedText>
                      <ThemedText style={styles.childSub}>
                        Adm No: {admNo} • {className}
                      </ThemedText>
                    </View>

                    <Badge label="ACTIVE" variant="success" size="sm" />
                  </View>

                  {/* Child Info Breakdown */}
                  <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <GraduationCap size={14} color="#38bdf8" />
                      <ThemedText style={styles.infoLabel}>Class Arm:</ThemedText>
                      <ThemedText style={styles.infoValue}>{className}</ThemedText>
                    </View>

                    <View style={styles.infoRow}>
                      <School size={14} color="#38bdf8" />
                      <ThemedText style={styles.infoLabel}>Form Master:</ThemedText>
                      <ThemedText style={styles.infoValue}>{teacherName}</ThemedText>
                    </View>

                    <View style={styles.infoRow}>
                      <UserCheck size={14} color="#38bdf8" />
                      <ThemedText style={styles.infoLabel}>Gender:</ThemedText>
                      <ThemedText style={styles.infoValue}>{gender}</ThemedText>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCallTeacher(teacherPhone)}
                      disabled={!teacherPhone}
                    >
                      <Phone size={15} color="#ffffff" />
                      <ThemedText style={styles.callBtnText}>
                        {teacherPhone ? `Call Teacher (${teacherName})` : 'Teacher Contact N/A'}
                      </ThemedText>
                    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#38bdf8' },

  content: { padding: 16, gap: 14 },

  childCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 12 },
  childCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  childName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  childSub: { fontSize: 12, color: '#38bdf8', marginTop: 2 },

  infoBox: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#334155' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, color: '#94a3b8', width: 90 },
  infoValue: { fontSize: 12, fontWeight: '600', color: '#f8fafc', flex: 1 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0284c7', paddingVertical: 10, borderRadius: 10 },
  callBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
