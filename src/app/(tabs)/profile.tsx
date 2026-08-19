import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mail,
  School as SchoolIcon,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  Phone,
  HelpCircle,
  Smartphone,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, subdomain } = useAuth();

  const fullName = user?.fullName || user?.name || user?.email || 'User Account';
  const email = user?.email || 'user@skolacloud.app';
  const roleRaw = (user?.role || 'student').toUpperCase();
  const phone = user?.phone || 'Not provided';
  const schoolName = user?.school?.name || 'SkolaCloud Academy';
  const activeSubdomain = user?.school?.subdomain || subdomain || 'system';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            Account Profile
          </ThemedText>
        </View>

        {/* Profile Card */}
        <ThemedView style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarInitial}>
              {fullName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.nameText}>{fullName}</ThemedText>
          <Badge label={roleRaw} variant="info" size="md" style={{ marginBottom: 16 }} />

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Mail size={18} color="#94a3b8" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>Email:</ThemedText>
            <ThemedText style={styles.infoValue}>{email}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Phone size={18} color="#94a3b8" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>Phone:</ThemedText>
            <ThemedText style={styles.infoValue}>{phone}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <SchoolIcon size={18} color="#94a3b8" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>School:</ThemedText>
            <ThemedText style={styles.infoValue}>{schoolName}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Smartphone size={18} color="#94a3b8" style={styles.infoIcon} />
            <ThemedText style={styles.infoLabel}>School ID:</ThemedText>
            <ThemedText style={styles.infoValue}>{activeSubdomain}</ThemedText>
          </View>
        </ThemedView>

        {/* Quick Account Settings */}
        <ThemedText style={styles.sectionTitle}>Account & Preferences</ThemedText>

        <ThemedView style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Lock size={20} color="#38bdf8" style={{ marginRight: 12 }} />
            <ThemedText style={styles.menuText}>Change Password</ThemedText>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <Bell size={20} color="#c084fc" style={{ marginRight: 12 }} />
            <ThemedText style={styles.menuText}>Push Notifications</ThemedText>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <HelpCircle size={20} color="#4ade80" style={{ marginRight: 12 }} />
            <ThemedText style={styles.menuText}>Help & Support</ThemedText>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={logout}>
            <LogOut size={20} color="#f87171" style={{ marginRight: 12 }} />
            <ThemedText style={[styles.menuText, { color: '#f87171' }]}>
              Sign Out
            </ThemedText>
            <ChevronRight size={18} color="#f87171" />
          </TouchableOpacity>
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
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 14,
  },
  menuContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#334155',
  },
});
