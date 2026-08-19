import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, DollarSign } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';

export default function FeesScreen() {
  const feeTransactions = [
    { id: 'TX-9021', term: 'First Term 2025/2026', student: 'Amina Yusuf (SS 3)', amount: '₦145,000', status: 'Paid', date: 'Aug 18, 2026' },
    { id: 'TX-9022', term: 'First Term 2025/2026', student: 'Chidiebere Okafor (SS 3)', amount: '₦145,000', status: 'Paid', date: 'Aug 17, 2026' },
    { id: 'TX-9023', term: 'First Term 2025/2026', student: 'Emmanuel Adebayo (JSS 2)', amount: '₦120,000', status: 'Partial', date: 'Aug 15, 2026' },
    { id: 'TX-9024', term: 'First Term 2025/2026', student: 'Fatima Ibrahim (Pri 5)', amount: '₦95,000', status: 'Unpaid', date: 'Pending' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>School Fees & Finance</ThemedText>
          <ThemedText style={styles.subtitle}>Track fee collections, invoices & revenue</ThemedText>
        </View>

        {/* Financial Summary */}
        <ThemedView style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <ThemedText style={styles.summaryLabel}>Term Revenue Collected</ThemedText>
              <ThemedText style={styles.summaryAmount}>₦18,450,000</ThemedText>
            </View>
            <View style={styles.iconBadge}>
              <CreditCard size={24} color="#38bdf8" />
            </View>
          </View>
          <View style={styles.summaryFooter}>
            <ThemedText style={styles.footerStat}>Target: ₦22,000,000</ThemedText>
            <Badge label="83.8% Collected" variant="success" size="sm" />
          </View>
        </ThemedView>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#4ade80' }]}>₦14.2M</ThemedText>
            <ThemedText style={styles.statLabel}>Full Payments</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statNumber, { color: '#fbbf24' }]}>₦4.25M</ThemedText>
            <ThemedText style={styles.statLabel}>Pending Balance</ThemedText>
          </ThemedView>
        </View>

        {/* Transactions / Invoice Roster */}
        <ThemedText style={styles.sectionTitle}>Recent Fee Collections</ThemedText>

        <ThemedView style={styles.listCard}>
          {feeTransactions.map((item, idx) => (
            <View key={item.id}>
              {idx > 0 && <View style={styles.itemDivider} />}
              <View style={styles.txItem}>
                <View style={styles.txLeft}>
                  {item.status === 'Paid' ? (
                    <CheckCircle2 size={20} color="#4ade80" />
                  ) : item.status === 'Partial' ? (
                    <Clock size={20} color="#fbbf24" />
                  ) : (
                    <CreditCard size={20} color="#f87171" />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <ThemedText style={styles.studentName} numberOfLines={1}>{item.student}</ThemedText>
                    <ThemedText style={styles.txSub}>{item.term} • {item.date}</ThemedText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={styles.txAmount}>{item.amount}</ThemedText>
                  <Badge
                    label={item.status}
                    variant={item.status === 'Paid' ? 'success' : item.status === 'Partial' ? 'warning' : 'danger'}
                    size="sm"
                  />
                </View>
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
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerStat: {
    fontSize: 12,
    color: '#cbd5e1',
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
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
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
  listCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  txSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
});
