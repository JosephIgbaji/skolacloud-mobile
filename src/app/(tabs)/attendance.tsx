import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Calendar, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';

export default function AttendanceScreen() {
  const [activeTab, setActiveTab] = useState<'logs' | 'summary'>('logs');

  const attendanceLogs = [
    { date: 'Today, Aug 19', status: 'Present', time: '07:45 AM', type: 'On Time' },
    { date: 'Yesterday, Aug 18', status: 'Present', time: '07:50 AM', type: 'On Time' },
    { date: 'Mon, Aug 17', status: 'Late', time: '08:15 AM', type: 'Late Entry' },
    { date: 'Fri, Aug 14', status: 'Present', time: '07:40 AM', type: 'On Time' },
    { date: 'Thu, Aug 13', status: 'Excused', time: '--', type: 'Medical' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Attendance Tracker</ThemedText>
          <ThemedText style={styles.subtitle}>View daily rosters & attendance history</ThemedText>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={styles.statNumber}>94%</ThemedText>
            <ThemedText style={styles.statLabel}>Present Rate</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#38bdf8' }]}>18</ThemedText>
            <ThemedText style={styles.statLabel}>Days Present</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#fbbf24' }]}>1</ThemedText>
            <ThemedText style={styles.statLabel}>Late Days</ThemedText>
          </ThemedView>
        </View>

        {/* Recent Attendance Logs */}
        <ThemedText style={styles.sectionTitle}>Recent Attendance Logs</ThemedText>

        <ThemedView style={styles.logsCard}>
          {attendanceLogs.map((item, idx) => (
            <View key={idx}>
              {idx > 0 && <View style={styles.itemDivider} />}
              <View style={styles.logItem}>
                <View style={styles.logLeft}>
                  {item.status === 'Present' && <CheckCircle2 size={20} color="#4ade80" />}
                  {item.status === 'Late' && <AlertTriangle size={20} color="#fbbf24" />}
                  {item.status === 'Excused' && <Clock size={20} color="#38bdf8" />}
                  <View style={{ marginLeft: 12 }}>
                    <ThemedText style={styles.logDate}>{item.date}</ThemedText>
                    <ThemedText style={styles.logTime}>{item.time}</ThemedText>
                  </View>
                </View>
                <Badge
                  label={item.status}
                  variant={item.status === 'Present' ? 'success' : item.status === 'Late' ? 'warning' : 'info'}
                  size="sm"
                />
              </View>
            </View>
          ))}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ade80',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 14,
  },
  logsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  logTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
});
