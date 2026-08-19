import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

export default function FeesScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fees-structures'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/fees');
        const rawData = res.data;
        if (Array.isArray(rawData)) return rawData;
        if (Array.isArray(rawData?.data)) return rawData.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  const feeItems: any[] = data || [];

  const totalFeesAmount = feeItems.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.title}>School Fees & Billing</ThemedText>
            <ThemedText style={styles.subtitle}>Fee structures, invoicing & revenue</ThemedText>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
            <RefreshCw size={18} color="#38bdf8" />
          </TouchableOpacity>
        </View>

        {/* Financial Summary */}
        <ThemedView style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <ThemedText style={styles.summaryLabel}>Total Active Fee Structures</ThemedText>
              <ThemedText style={styles.summaryAmount}>
                ₦{totalFeesAmount.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.iconBadge}>
              <CreditCard size={24} color="#38bdf8" />
            </View>
          </View>
          <View style={styles.summaryFooter}>
            <ThemedText style={styles.footerStat}>Configured Fee Categories: {feeItems.length}</ThemedText>
            <Badge label="Active Term" variant="success" size="sm" />
          </View>
        </ThemedView>

        {/* Fee Structures Roster */}
        <ThemedText style={styles.sectionTitle}>Fee Schedules & Categories ({feeItems.length})</ThemedText>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <ThemedText style={styles.loadingText}>Loading fee structures...</ThemedText>
          </View>
        ) : isError ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyTitle}>Unable to load fee structures</ThemedText>
            <ThemedText style={styles.emptySub}>Please check server connection and retry.</ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : feeItems.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <CreditCard size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyTitle}>No fee structures configured</ThemedText>
            <ThemedText style={styles.emptySub}>
              Fee schedules configured by the Bursar or Admin will appear here.
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.listCard}>
            {feeItems.map((item, idx) => (
              <View key={item._id || item.id || idx}>
                {idx > 0 && <View style={styles.itemDivider} />}
                <View style={styles.txItem}>
                  <View style={styles.txLeft}>
                    <CheckCircle2 size={20} color="#4ade80" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <ThemedText style={styles.titleText} numberOfLines={1}>
                        {item.name || item.title || 'Tuition Fee'}
                      </ThemedText>
                      <ThemedText style={styles.txSub}>
                        {item.term || 'Current Term'} • {item.session || 'Active Session'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={styles.txAmount}>
                      ₦{Number(item.amount || 0).toLocaleString()}
                    </ThemedText>
                    <Badge label="Required" variant="info" size="sm" />
                  </View>
                </View>
              </View>
            ))}
          </ThemedView>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
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
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  txSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0284c7',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
