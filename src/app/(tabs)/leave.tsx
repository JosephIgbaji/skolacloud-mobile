import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';

export default function LeaveScreen() {
  const leaveRequests = [
    { type: 'Medical Leave', dates: 'Aug 12 - Aug 13', days: '2 Days', status: 'Approved', reason: 'Flu & Doctor Visit' },
    { type: 'Personal Leave', dates: 'Sep 05', days: '1 Day', status: 'Pending', reason: 'Family Engagement' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>Leave Management</ThemedText>
            <ThemedText style={styles.subtitle}>Apply & track your leave applications</ThemedText>
          </View>
        </View>

        {/* Apply Leave Button */}
        <TouchableOpacity style={styles.applyButton}>
          <Plus size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <ThemedText style={styles.applyButtonText}>Apply for Leave</ThemedText>
        </TouchableOpacity>

        {/* Leave Balance Overview */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={styles.statNumber}>12</ThemedText>
            <ThemedText style={styles.statLabel}>Annual Allowance</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#38bdf8' }]}>10</ThemedText>
            <ThemedText style={styles.statLabel}>Days Remaining</ThemedText>
          </ThemedView>
        </View>

        {/* Leave Requests */}
        <ThemedText style={styles.sectionTitle}>Leave Applications</ThemedText>

        <View style={styles.listContainer}>
          {leaveRequests.map((req, idx) => (
            <ThemedView key={idx} style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Calendar size={18} color="#38bdf8" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.requestType}>{req.type}</ThemedText>
                </View>
                <Badge
                  label={req.status}
                  variant={req.status === 'Approved' ? 'success' : 'warning'}
                  size="sm"
                />
              </View>
              <ThemedText style={styles.datesText}>{req.dates} ({req.days})</ThemedText>
              <ThemedText style={styles.reasonText}>Reason: {req.reason}</ThemedText>
            </ThemedView>
          ))}
        </View>
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
  headerRow: {
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
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 24,
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
  listContainer: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  datesText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
