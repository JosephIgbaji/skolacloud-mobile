import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  LogOut,
  LogIn,
  Calendar,
  Search,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  X,
  Briefcase,
  MapPin,
  Compass,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export default function StaffAttendanceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const role = (user?.role || 'staff').toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'superadmin' || role === 'accountant';

  // Active Tab: 'clockin' | 'roster' | 'history'
  const [activeTab, setActiveTab] = useState<'clockin' | 'roster' | 'history'>(isAdmin ? 'roster' : 'clockin');

  // Real-time ticking digital clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTimeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // GPS Location State
  const [locationStatus, setLocationStatus] = useState<string>('Initializing GPS...');
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Set Campus Location Modal (Admin)
  const [showLocationConfigModal, setShowLocationConfigModal] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState('300');

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('GPS Permission Denied');
          return;
        }
        setLocationStatus('GPS Location Active');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        setLocationStatus('GPS Ready');
      }
    })();
  }, []);

  // Fetch fresh position before action
  const getFreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to verify you are on school premises.');
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentCoords(coords);
      return coords;
    } catch (err: any) {
      throw new Error(err.message || 'Unable to retrieve your current GPS location.');
    }
  };

  // Search & Filter state for Admin Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Single Roster Date Selection State (Admin)
  const todayStr = new Date().toISOString().split('T')[0];
  const [rosterDate, setRosterDate] = useState<string>(todayStr);
  const [rosterDatePreset, setRosterDatePreset] = useState<'today' | 'yesterday' | '2days' | 'custom'>('today');
  const [showRosterDateModal, setShowRosterDateModal] = useState<boolean>(false);
  const [customRosterInput, setCustomRosterInput] = useState<string>('');

  // Date Range History Filter State (Admin & Staff)
  const [historyPreset, setHistoryPreset] = useState<'7days' | '30days' | 'month' | 'custom'>('7days');
  const [historyStartDate, setHistoryStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showHistoryRangeModal, setShowHistoryRangeModal] = useState<boolean>(false);
  const [customStartInput, setCustomStartInput] = useState<string>('');
  const [customEndInput, setCustomEndInput] = useState<string>('');

  // Date handlers for Roster Tab
  const handleSelectRosterDatePreset = (preset: 'today' | 'yesterday' | '2days' | 'custom') => {
    setRosterDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setRosterDate(now.toISOString().split('T')[0]);
    } else if (preset === 'yesterday') {
      now.setDate(now.getDate() - 1);
      setRosterDate(now.toISOString().split('T')[0]);
    } else if (preset === '2days') {
      now.setDate(now.getDate() - 2);
      setRosterDate(now.toISOString().split('T')[0]);
    } else if (preset === 'custom') {
      setCustomRosterInput(rosterDate);
      setShowRosterDateModal(true);
    }
  };

  const handleApplyCustomRosterDate = () => {
    if (customRosterInput.trim()) {
      setRosterDate(customRosterInput.trim());
    }
    setShowRosterDateModal(false);
  };

  // Date handlers for History Tab
  const handleSelectHistoryRangePreset = (preset: '7days' | '30days' | 'month' | 'custom') => {
    setHistoryPreset(preset);
    const end = new Date();
    const endStr = end.toISOString().split('T')[0];
    setHistoryEndDate(endStr);

    if (preset === '7days') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      setHistoryStartDate(start.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setHistoryStartDate(start.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      setHistoryStartDate(start.toISOString().split('T')[0]);
    } else if (preset === 'custom') {
      setCustomStartInput(historyStartDate);
      setCustomEndInput(historyEndDate);
      setShowHistoryRangeModal(true);
    }
  };

  const handleApplyCustomHistoryRange = () => {
    if (customStartInput.trim() && customEndInput.trim()) {
      setHistoryStartDate(customStartInput.trim());
      setHistoryEndDate(customEndInput.trim());
    }
    setShowHistoryRangeModal(false);
  };

  // Manual Override Modal (Admin)
  const [selectedStaffForOverride, setSelectedStaffForOverride] = useState<any>(null);
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'late' | 'absent' | 'excused'>('present');
  const [overrideRemark, setOverrideRemark] = useState('');

  // Fetch Current School Info (Location & Geofence)
  const { data: mySchoolData, refetch: refetchSchool } = useQuery({
    queryKey: ['my-school-info'],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await apiClient.get('/schools/my-school');
      return res.data;
    },
  });

  // 1. Fetch Staff Member's Today Status
  const {
    data: todayStatusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['staff-today-status'],
    queryFn: async () => {
      const res = await apiClient.get('/staff-attendance/today-status');
      return res.data;
    },
  });

  // 2. Fetch HRM Summary & Roster for Selected Date (Admin / Accountant)
  const {
    data: todaySummaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['staff-today-summary', rosterDate],
    enabled: isAdmin,
    queryFn: async () => {
      const params: any = {};
      if (rosterDate) params.date = rosterDate;
      const res = await apiClient.get('/staff-attendance/today-summary', { params });
      return res.data;
    },
  });

  // 3. Fetch Attendance History Log (School-wide for Admin, Personal for Staff)
  const {
    data: myHistoryLogs = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['staff-history-logs', isAdmin, historyStartDate, historyEndDate],
    queryFn: async () => {
      const endpoint = isAdmin ? '/staff-attendance/all-logs' : '/staff-attendance/my-attendance';
      const params: any = {};
      if (historyStartDate) params.startDate = historyStartDate;
      if (historyEndDate) params.endDate = historyEndDate;

      const res = await apiClient.get(endpoint, { params });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    },
  });

  // Group history logs by date (reverse chronological order)
  const groupedHistoryLogs = useMemo(() => {
    const map: Record<string, any[]> = {};

    myHistoryLogs.forEach((log: any) => {
      const rawDateStr = log.checkInTimestamp || log.date;
      if (!rawDateStr) return;

      const dateObj = new Date(rawDateStr);
      // Extract local year, month, day to prevent UTC timezone offset shifts
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(log);
    });

    const sortedDates = Object.keys(map).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map((dateKey) => ({
      dateKey,
      formattedDate: new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      logs: map[dateKey],
    }));
  }, [myHistoryLogs]);

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getFreshLocation();
      return await apiClient.post('/staff-attendance/clock-in', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        deviceInfo: 'Mobile App (GPS Verified)',
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-status'] });
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-my-history'] });
      const record = res.data;
      const isLate = record?.isLate;
      Alert.alert(
        isLate ? 'Clocked In (Late) ⚠️' : 'Clocked In Successfully 🎉',
        isLate
          ? `You clocked in at ${record.checkInTime}. Official start time is 08:00 AM.`
          : `Great job! Clocked in on time at ${record.checkInTime}.`
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Clock In Rejected ❌',
        err.response?.data?.message || err.message || 'Failed to verify clock-in location.'
      );
    },
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getFreshLocation().catch(() => ({ latitude: undefined, longitude: undefined }));
      return await apiClient.post('/staff-attendance/clock-out', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-status'] });
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-my-history'] });
      const record = res.data;
      Alert.alert(
        'Clocked Out 🎉',
        `You clocked out at ${record.checkOutTime}. Shift duration: ${record.durationText || 'N/A'}.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Clock Out Failed', err.response?.data?.message || 'Unable to clock out.');
    },
  });

  // Save School Campus GPS Location Mutation (Admin)
  const setSchoolLocationMutation = useMutation({
    mutationFn: async () => {
      const coords = await getFreshLocation();
      const radius = parseInt(geofenceRadius, 10) || 300;
      return await apiClient.patch('/schools/location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        geofenceRadiusMeters: radius,
        isGeofencingEnabled: true,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-school-info'] });
      setShowLocationConfigModal(false);
      const school = res.data;
      Alert.alert(
        'Campus Location Saved 📍',
        `School campus GPS location has been locked!\nLatitude: ${school.latitude.toFixed(4)}, Longitude: ${school.longitude.toFixed(4)}\nAllowed radius: ${school.geofenceRadiusMeters} meters.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Location Update Failed', err.response?.data?.message || err.message || 'Failed to set school GPS location.');
    },
  });

  // Override Attendance Mutation (Admin)
  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaffForOverride) return;
      return await apiClient.post('/staff-attendance/record', {
        userId: selectedStaffForOverride.staffId,
        status: overrideStatus,
        remark: overrideRemark || `Manually recorded as ${overrideStatus.toUpperCase()} by Admin`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-today-summary'] });
      setSelectedStaffForOverride(null);
      setOverrideRemark('');
      Alert.alert('Success', 'Staff attendance updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update staff attendance.');
    },
  });

  const isClockedIn = todayStatusData?.clockedIn;
  const isClockedOut = todayStatusData?.clockedOut;

  // Filter Roster
  const rosterList = todaySummaryData?.roster || [];
  const filteredRoster = rosterList.filter((item: any) => {
    const matchesSearch =
      !searchQuery ||
      (item.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'present') return item.status === 'present';
    if (statusFilter === 'late') return item.status === 'late' || item.isLate;
    if (statusFilter === 'absent') return item.status === 'absent';
    return true;
  });

  const summaryMetrics = todaySummaryData?.summary || {
    totalStaff: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    totalHoursWorked: 0,
  };

  const onRefresh = () => {
    refetchStatus();
    if (isAdmin) {
      refetchSummary();
      refetchSchool();
    }
    refetchHistory();
  };

  const hasConfiguredCampusLocation =
    mySchoolData?.latitude !== undefined &&
    mySchoolData?.latitude !== null &&
    mySchoolData?.longitude !== undefined &&
    mySchoolData?.longitude !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Staff HRM & Attendance</ThemedText>
          <ThemedText style={styles.sub}>Clock in/out & geofence tracking</ThemedText>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <RefreshCw size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Segment Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'clockin' && styles.tabBtnActive]}
          onPress={() => setActiveTab('clockin')}
        >
          <Clock size={15} color={activeTab === 'clockin' ? '#38bdf8' : '#94a3b8'} />
          <ThemedText style={[styles.tabBtnText, activeTab === 'clockin' && styles.tabBtnTextActive]}>
            My Shift
          </ThemedText>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'roster' && styles.tabBtnActive]}
            onPress={() => setActiveTab('roster')}
          >
            <Users size={15} color={activeTab === 'roster' ? '#38bdf8' : '#94a3b8'} />
            <ThemedText style={[styles.tabBtnText, activeTab === 'roster' && styles.tabBtnTextActive]}>
              HRM Roster ({rosterList.length})
            </ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Calendar size={15} color={activeTab === 'history' ? '#38bdf8' : '#94a3b8'} />
          <ThemedText style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            History Logs
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* TAB 1: MY SHIFT (CLOCK IN / CLOCK OUT) */}
        {activeTab === 'clockin' && (
          <View style={{ gap: 16 }}>
            {/* Live Ticking Clock Banner */}
            <ThemedView style={styles.clockBannerCard}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveText}>REALTIME CLOCK</ThemedText>
              </View>

              <ThemedText style={styles.digitalClockTime}>{formattedTimeStr}</ThemedText>
              <ThemedText style={styles.digitalClockDate}>{formattedDateStr}</ThemedText>
              <ThemedText style={styles.resumptionInfo}>Official School Resumption: 08:00 AM</ThemedText>

              {/* GPS Geofence Pill */}
              <View style={styles.gpsPill}>
                <MapPin size={12} color="#38bdf8" />
                <ThemedText style={styles.gpsPillText}>{locationStatus}</ThemedText>
              </View>
            </ThemedView>

            {/* Shift Status Banner & Action Button */}
            {isLoadingStatus ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
            ) : (
              <ThemedView style={styles.actionCard}>
                {/* Status Indicator */}
                {!isClockedIn ? (
                  <View style={styles.statusIndicatorRow}>
                    <View style={[styles.statusIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                      <Clock size={22} color="#eab308" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.statusTitle}>Not Clocked In Yet</ThemedText>
                      <ThemedText style={styles.statusSub}>Tap button when you arrive on school campus.</ThemedText>
                    </View>
                    <Badge label="OFFLINE" variant="neutral" size="sm" />
                  </View>
                ) : !isClockedOut ? (
                  <View style={styles.statusIndicatorRow}>
                    <View style={[styles.statusIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                      <CheckCircle2 size={22} color="#4ade80" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.statusTitle}>
                        Clocked In at {todayStatusData.checkInTime}
                      </ThemedText>
                      <ThemedText style={styles.statusSub}>
                        Status: {todayStatusData.isLate ? `LATE (by ${todayStatusData.lateMinutes} mins)` : 'ON TIME (Present)'}
                      </ThemedText>
                    </View>
                    <Badge
                      label={todayStatusData.isLate ? 'LATE' : 'PRESENT'}
                      variant={todayStatusData.isLate ? 'warning' : 'success'}
                      size="sm"
                    />
                  </View>
                ) : (
                  <View style={styles.statusIndicatorRow}>
                    <View style={[styles.statusIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                      <Briefcase size={22} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.statusTitle}>Shift Completed Today 🎉</ThemedText>
                      <ThemedText style={styles.statusSub}>
                        Duration: {todayStatusData.durationText || `${todayStatusData.hoursWorked} hrs`}
                      </ThemedText>
                    </View>
                    <Badge label="COMPLETED" variant="info" size="sm" />
                  </View>
                )}

                <View style={styles.cardDivider} />

                {/* Clock In / Out Action Button */}
                {!isClockedIn ? (
                  <TouchableOpacity
                    style={[styles.clockInBtn, clockInMutation.isPending && styles.btnDisabled]}
                    onPress={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                  >
                    {clockInMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <LogIn size={20} color="#ffffff" style={{ marginRight: 8 }} />
                        <ThemedText style={styles.clockBtnText}>CLOCK IN TO WORK</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                ) : !isClockedOut ? (
                  <TouchableOpacity
                    style={[styles.clockOutBtn, clockOutMutation.isPending && styles.btnDisabled]}
                    onPress={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                  >
                    {clockOutMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <LogOut size={20} color="#ffffff" style={{ marginRight: 8 }} />
                        <ThemedText style={styles.clockBtnText}>CLOCK OUT (END SHIFT)</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBox}>
                    <CheckCircle2 size={24} color="#4ade80" />
                    <ThemedText style={styles.completedText}>
                      You have finished your work shift for today ({todayStatusData.checkInTime} - {todayStatusData.checkOutTime}).
                    </ThemedText>
                  </View>
                )}
              </ThemedView>
            )}

            {/* Shift Metrics Card */}
            <ThemedView style={styles.shiftMetricsCard}>
              <ThemedText style={styles.metricsTitle}>Today's Shift Details</ThemedText>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricLabel}>Clock In</ThemedText>
                  <ThemedText style={styles.metricVal}>{todayStatusData?.checkInTime || '-'}</ThemedText>
                </View>

                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricLabel}>Clock Out</ThemedText>
                  <ThemedText style={styles.metricVal}>{todayStatusData?.checkOutTime || '-'}</ThemedText>
                </View>

                <View style={styles.metricItem}>
                  <ThemedText style={styles.metricLabel}>Hours Worked</ThemedText>
                  <ThemedText style={[styles.metricVal, { color: '#38bdf8' }]}>
                    {todayStatusData?.durationText || (todayStatusData?.hoursWorked ? `${todayStatusData.hoursWorked} hrs` : '-')}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          </View>
        )}

        {/* TAB 2: HRM ROSTER & TODAY SUMMARY (ADMIN / ACCOUNTANT) */}
        {activeTab === 'roster' && isAdmin && (
          <View style={{ gap: 14 }}>
            {/* Single Roster Date Selector Card */}
            <ThemedView style={styles.dateSelectorCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={styles.dateSelectorTitle}>ROSTER DATE</ThemedText>
                <Badge
                  label={rosterDate === todayStr ? 'TODAY' : rosterDate}
                  variant={rosterDate === todayStr ? 'info' : 'warning'}
                  size="sm"
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.datePill, rosterDatePreset === 'today' && styles.datePillActive]}
                  onPress={() => handleSelectRosterDatePreset('today')}
                >
                  <ThemedText style={[styles.datePillText, rosterDatePreset === 'today' && styles.datePillTextActive]}>
                    Today
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, rosterDatePreset === 'yesterday' && styles.datePillActive]}
                  onPress={() => handleSelectRosterDatePreset('yesterday')}
                >
                  <ThemedText style={[styles.datePillText, rosterDatePreset === 'yesterday' && styles.datePillTextActive]}>
                    Yesterday
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, rosterDatePreset === '2days' && styles.datePillActive]}
                  onPress={() => handleSelectRosterDatePreset('2days')}
                >
                  <ThemedText style={[styles.datePillText, rosterDatePreset === '2days' && styles.datePillTextActive]}>
                    2 Days Ago
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, rosterDatePreset === 'custom' && styles.datePillActive]}
                  onPress={() => handleSelectRosterDatePreset('custom')}
                >
                  <Calendar size={13} color={rosterDatePreset === 'custom' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 4 }} />
                  <ThemedText style={[styles.datePillText, rosterDatePreset === 'custom' && styles.datePillTextActive]}>
                    Custom Date
                  </ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>

            {/* Admin Campus GPS Location Config Banner */}
            <ThemedView style={styles.locationConfigBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Compass size={22} color="#38bdf8" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.configBannerTitle}>Campus GPS Geofence Settings</ThemedText>
                  <ThemedText style={styles.configBannerSub}>
                    {hasConfiguredCampusLocation
                      ? `Locked: ${mySchoolData.latitude.toFixed(3)}, ${mySchoolData.longitude.toFixed(3)} (${mySchoolData.geofenceRadiusMeters || 300}m radius)`
                      : 'Campus location not set. Staff can currently clock in from anywhere.'}
                  </ThemedText>
                </View>
              </View>

              <TouchableOpacity
                style={styles.configCampusBtn}
                onPress={() => setShowLocationConfigModal(true)}
              >
                <MapPin size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.configCampusText}>
                  {hasConfiguredCampusLocation ? 'Update Campus GPS' : 'Set Campus Location'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {/* Stat Summary Metrics Grid */}
            <View style={styles.summaryGrid}>
              <ThemedView style={styles.summaryCard}>
                <Users size={18} color="#38bdf8" style={{ marginBottom: 4 }} />
                <ThemedText style={styles.summaryNum}>{summaryMetrics.totalStaff}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Staff</ThemedText>
              </ThemedView>

              <ThemedView style={styles.summaryCard}>
                <UserCheck size={18} color="#4ade80" style={{ marginBottom: 4 }} />
                <ThemedText style={[styles.summaryNum, { color: '#4ade80' }]}>
                  {summaryMetrics.presentCount}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Present</ThemedText>
              </ThemedView>

              <ThemedView style={styles.summaryCard}>
                <AlertTriangle size={18} color="#fbbf24" style={{ marginBottom: 4 }} />
                <ThemedText style={[styles.summaryNum, { color: '#fbbf24' }]}>
                  {summaryMetrics.lateCount}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Late Arrivals</ThemedText>
              </ThemedView>

              <ThemedView style={styles.summaryCard}>
                <UserX size={18} color="#f87171" style={{ marginBottom: 4 }} />
                <ThemedText style={[styles.summaryNum, { color: '#f87171' }]}>
                  {summaryMetrics.absentCount}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Not Clocked In</ThemedText>
              </ThemedView>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterPillsRow}>
              {(['all', 'present', 'late', 'absent'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterPill, statusFilter === st && styles.filterPillActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <ThemedText style={[styles.filterPillText, statusFilter === st && styles.filterPillTextActive]}>
                    {st === 'all' ? 'All Staff' : st.toUpperCase()}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchWrapper}>
              <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff member by name or email..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Roster Cards */}
            {isLoadingSummary ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : filteredRoster.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Users size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No Staff Records Found</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredRoster.map((staff: any) => {
                  const isLate = staff.isLate || staff.status === 'late';
                  const isPresent = staff.status === 'present';

                  return (
                    <ThemedView key={staff.staffId} style={styles.rosterCard}>
                      <View style={styles.rosterHeader}>
                        <View style={styles.avatarBox}>
                          <ThemedText style={styles.avatarText}>
                            {(staff.fullName || 'S').charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.staffNameText}>{staff.fullName}</ThemedText>
                          <ThemedText style={styles.staffRoleText}>
                            {(staff.role || 'Staff').toUpperCase()} • {staff.email}
                          </ThemedText>
                        </View>

                        <Badge
                          label={isLate ? 'LATE' : isPresent ? 'PRESENT' : 'NOT CLOCKED IN'}
                          variant={isLate ? 'warning' : isPresent ? 'success' : 'neutral'}
                          size="sm"
                        />
                      </View>

                      <View style={styles.cardDivider} />

                      <View style={styles.rosterTimeRow}>
                        <View style={styles.timeCol}>
                          <ThemedText style={styles.timeLabel}>Check In</ThemedText>
                          <ThemedText style={styles.timeVal}>{staff.checkInTime || '-'}</ThemedText>
                        </View>

                        <View style={styles.timeCol}>
                          <ThemedText style={styles.timeLabel}>Check Out</ThemedText>
                          <ThemedText style={styles.timeVal}>{staff.checkOutTime || '-'}</ThemedText>
                        </View>

                        <View style={styles.timeCol}>
                          <ThemedText style={styles.timeLabel}>Duration</ThemedText>
                          <ThemedText style={[styles.timeVal, { color: '#38bdf8' }]}>
                            {staff.durationText || `${staff.hoursWorked} hrs`}
                          </ThemedText>
                        </View>

                        <TouchableOpacity
                          style={styles.editOverrideBtn}
                          onPress={() => {
                            setSelectedStaffForOverride(staff);
                            setOverrideStatus(staff.status === 'absent' ? 'present' : staff.status);
                          }}
                        >
                          <ThemedText style={styles.editOverrideText}>Edit</ThemedText>
                        </TouchableOpacity>
                      </View>

                      {staff.distanceFromSchoolMeters !== null && staff.distanceFromSchoolMeters !== undefined && (
                        <View style={styles.distanceRow}>
                          <MapPin size={12} color="#38bdf8" />
                          <ThemedText style={styles.distanceText}>
                            Verified Location: {staff.distanceFromSchoolMeters}m from campus
                          </ThemedText>
                        </View>
                      )}
                    </ThemedView>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: HISTORY LOGS & DATE RANGE FILTER */}
        {activeTab === 'history' && (
          <View style={{ gap: 12 }}>
            {/* Date Range Filter Card */}
            <ThemedView style={styles.dateSelectorCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={styles.dateSelectorTitle}>DATE RANGE FILTER</ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#38bdf8', fontWeight: 'bold' }}>
                  {historyStartDate} to {historyEndDate}
                </ThemedText>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.datePill, historyPreset === '7days' && styles.datePillActive]}
                  onPress={() => handleSelectHistoryRangePreset('7days')}
                >
                  <ThemedText style={[styles.datePillText, historyPreset === '7days' && styles.datePillTextActive]}>
                    Last 7 Days
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, historyPreset === '30days' && styles.datePillActive]}
                  onPress={() => handleSelectHistoryRangePreset('30days')}
                >
                  <ThemedText style={[styles.datePillText, historyPreset === '30days' && styles.datePillTextActive]}>
                    Last 30 Days
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, historyPreset === 'month' && styles.datePillActive]}
                  onPress={() => handleSelectHistoryRangePreset('month')}
                >
                  <ThemedText style={[styles.datePillText, historyPreset === 'month' && styles.datePillTextActive]}>
                    This Month
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePill, historyPreset === 'custom' && styles.datePillActive]}
                  onPress={() => handleSelectHistoryRangePreset('custom')}
                >
                  <Calendar size={13} color={historyPreset === 'custom' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 4 }} />
                  <ThemedText style={[styles.datePillText, historyPreset === 'custom' && styles.datePillTextActive]}>
                    Custom Range
                  </ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </ThemedView>

            <ThemedText style={styles.sectionTitle}>
              {isAdmin ? 'School Staff Attendance Logs' : 'My Attendance Logs'} ({myHistoryLogs.length})
            </ThemedText>

            {isLoadingHistory ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : groupedHistoryLogs.length === 0 ? (
              <ThemedView style={styles.emptyCard}>
                <Clock size={36} color="#64748b" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyTitle}>No History Logs Recorded</ThemedText>
                <ThemedText style={styles.emptySub}>No attendance logs found for the selected date range.</ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: 16 }}>
                {groupedHistoryLogs.map((group: any) => (
                  <View key={group.dateKey} style={{ gap: 8 }}>
                    {/* Date Section Header */}
                    <View style={styles.dateGroupHeader}>
                      <Calendar size={15} color="#38bdf8" />
                      <ThemedText style={styles.dateGroupHeaderTitle}>{group.formattedDate}</ThemedText>
                      <Badge
                        label={`${group.logs.length} ${group.logs.length === 1 ? 'Log' : 'Logs'}`}
                        variant="info"
                        size="sm"
                      />
                    </View>

                    {/* Attendance Cards under this date */}
                    <View style={{ gap: 8 }}>
                      {group.logs.map((log: any, idx: number) => {
                        const staffName = log.userId?.fullName || (typeof log.userId === 'string' ? log.userId : 'Staff Member');
                        const staffRole = (log.userId?.role || '').toUpperCase();
                        const statusLabel = (log.status || (log.isLate ? 'LATE' : 'PRESENT')).toUpperCase();
                        const statusVariant = log.isLate || log.status === 'late' ? 'warning' : log.status === 'absent' ? 'danger' : 'success';

                        return (
                          <ThemedView key={log._id || log.id || idx} style={styles.historyCard}>
                            {isAdmin ? (
                              <View style={styles.rosterHeader}>
                                <View style={styles.avatarBox}>
                                  <ThemedText style={styles.avatarText}>
                                    {(staffName || 'S').charAt(0).toUpperCase()}
                                  </ThemedText>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <ThemedText style={styles.staffNameText}>{staffName}</ThemedText>
                                  <ThemedText style={styles.staffRoleText}>{log.userId?.email || staffRole}</ThemedText>
                                </View>
                                <Badge label={statusLabel} variant={statusVariant} size="sm" />
                              </View>
                            ) : (
                              <View style={styles.nonAdminHistoryHeader}>
                                <ThemedText style={styles.historyHeaderUserTitle}>Clock-in Record</ThemedText>
                                <Badge label={statusLabel} variant={statusVariant} size="sm" />
                              </View>
                            )}

                            <View style={styles.cardDivider} />

                            <View style={styles.historyBody}>
                              <View style={styles.historyMetaCol}>
                                <ThemedText style={styles.historyMetaLabel}>Check In</ThemedText>
                                <ThemedText style={styles.historyMetaVal}>{log.checkInTime || '-'}</ThemedText>
                              </View>

                              <View style={styles.historyMetaCol}>
                                <ThemedText style={styles.historyMetaLabel}>Check Out</ThemedText>
                                <ThemedText style={styles.historyMetaVal}>{log.checkOutTime || '-'}</ThemedText>
                              </View>

                              <View style={styles.historyMetaCol}>
                                <ThemedText style={styles.historyMetaLabel}>Duration</ThemedText>
                                <ThemedText style={[styles.historyMetaVal, { color: '#38bdf8' }]}>
                                  {log.durationText || (log.hoursWorked ? `${log.hoursWorked} hrs` : '-')}
                                </ThemedText>
                              </View>
                            </View>

                            {log.distanceFromSchoolMeters !== null && log.distanceFromSchoolMeters !== undefined && (
                              <View style={styles.distanceRow}>
                                <MapPin size={12} color="#38bdf8" />
                                <ThemedText style={styles.distanceText}>
                                  Location: {log.distanceFromSchoolMeters}m from campus
                                </ThemedText>
                              </View>
                            )}
                          </ThemedView>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* CAMPUS GPS CONFIG MODAL (ADMIN) */}
      <Modal visible={showLocationConfigModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Set Campus Location & Geofence</ThemedText>
              <TouchableOpacity onPress={() => setShowLocationConfigModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 14 }}>
              <ThemedText style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 20 }}>
                Stand at your school main gate or reception desk and tap the button below to lock your campus GPS location.
              </ThemedText>

              <ThemedView style={styles.coordDisplayBox}>
                <MapPin size={20} color="#38bdf8" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 12, color: '#94a3b8' }}>Detected Current GPS</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: '#f8fafc' }}>
                    {currentCoords
                      ? `Lat: ${currentCoords.latitude.toFixed(5)}, Lng: ${currentCoords.longitude.toFixed(5)}`
                      : 'Fetching GPS coordinates...'}
                  </ThemedText>
                </View>
              </ThemedView>

              <ThemedText style={styles.inputLabel}>Allowed Geofence Radius (meters)</ThemedText>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="e.g. 300"
                placeholderTextColor="#94a3b8"
                value={geofenceRadius}
                onChangeText={setGeofenceRadius}
              />
              <ThemedText style={{ fontSize: 11, color: '#64748b' }}>
                Staff members beyond this radius will be blocked from clocking in. Default is 300 meters.
              </ThemedText>

              <TouchableOpacity
                style={[styles.confirmBtn, setSchoolLocationMutation.isPending && styles.btnDisabled]}
                onPress={() => setSchoolLocationMutation.mutate()}
                disabled={setSchoolLocationMutation.isPending || !currentCoords}
              >
                {setSchoolLocationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MapPin size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.confirmBtnText}>Lock My Position as Campus GPS</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* OVERRIDE MODAL (ADMIN) */}
      <Modal visible={Boolean(selectedStaffForOverride)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Override Attendance</ThemedText>
              <TouchableOpacity onPress={() => setSelectedStaffForOverride(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 14 }}>
              <ThemedText style={{ color: '#cbd5e1', fontSize: 14 }}>
                Updating record for{' '}
                <ThemedText style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                  {selectedStaffForOverride?.fullName}
                </ThemedText>
              </ThemedText>

              <ThemedText style={styles.inputLabel}>Select Status</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['present', 'late', 'absent', 'excused'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusOptBtn, overrideStatus === st && styles.statusOptBtnActive]}
                    onPress={() => setOverrideStatus(st)}
                  >
                    <ThemedText
                      style={[styles.statusOptText, overrideStatus === st && styles.statusOptTextActive]}
                    >
                      {st.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.inputLabel}>Admin Remark / Reason</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Official duty outside campus..."
                placeholderTextColor="#94a3b8"
                value={overrideRemark}
                onChangeText={setOverrideRemark}
              />

              <TouchableOpacity
                style={[styles.confirmBtn, overrideMutation.isPending && styles.btnDisabled]}
                onPress={() => overrideMutation.mutate()}
                disabled={overrideMutation.isPending}
              >
                {overrideMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.confirmBtnText}>Save Attendance Override</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ROSTER CUSTOM DATE MODAL */}
      <Modal visible={showRosterDateModal} animationType="slide" transparent onRequestClose={() => setShowRosterDateModal(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Roster Date</ThemedText>
              <TouchableOpacity onPress={() => setShowRosterDateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <ThemedText style={styles.inputLabel}>Target Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2026-08-25"
                placeholderTextColor="#94a3b8"
                value={customRosterInput}
                onChangeText={setCustomRosterInput}
              />
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApplyCustomRosterDate}>
                <ThemedText style={styles.confirmBtnText}>Apply Date Filter</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* HISTORY CUSTOM RANGE MODAL */}
      <Modal visible={showHistoryRangeModal} animationType="slide" transparent onRequestClose={() => setShowHistoryRangeModal(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Attendance Date Range</ThemedText>
              <TouchableOpacity onPress={() => setShowHistoryRangeModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={{ gap: 4 }}>
                <ThemedText style={styles.inputLabel}>Start Date (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2026-08-01"
                  placeholderTextColor="#94a3b8"
                  value={customStartInput}
                  onChangeText={setCustomStartInput}
                />
              </View>

              <View style={{ gap: 4 }}>
                <ThemedText style={styles.inputLabel}>End Date (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 2026-08-28"
                  placeholderTextColor="#94a3b8"
                  value={customEndInput}
                  onChangeText={setCustomEndInput}
                />
              </View>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleApplyCustomHistoryRange}>
                <ThemedText style={styles.confirmBtnText}>Apply Range Filter</ThemedText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8' },

  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#1e293b', gap: 6 },
  tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabBtnTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  content: { padding: 16 },

  // Date Selector & Range Pills
  dateSelectorCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' },
  dateSelectorTitle: { fontSize: 11, fontWeight: 'bold', color: '#38bdf8', letterSpacing: 0.5 },
  datePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  datePillActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  datePillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  datePillTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  // Digital Clock Banner
  clockBannerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8' },
  liveText: { fontSize: 10, color: '#38bdf8', fontWeight: 'bold', letterSpacing: 1 },
  digitalClockTime: { fontSize: 32, fontWeight: 'black', color: '#f8fafc', letterSpacing: 1 },
  digitalClockDate: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  resumptionInfo: { fontSize: 11, color: '#fbbf24', marginTop: 8, fontWeight: '500' },

  gpsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  gpsPillText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },

  // Clock Actions Card
  actionCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#334155', gap: 14 },
  statusIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc' },
  statusSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: '#334155' },

  clockInBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#16a34a', height: 52, borderRadius: 14, shadowColor: '#16a34a', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  clockOutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#dc2626', height: 52, borderRadius: 14, shadowColor: '#dc2626', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.6 },
  clockBtnText: { fontSize: 15, fontWeight: 'bold', color: '#ffffff', letterSpacing: 0.5 },

  completedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(74, 222, 128, 0.1)', borderRadius: 12 },
  completedText: { flex: 1, fontSize: 12, color: '#4ade80', fontWeight: '500' },

  shiftMetricsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  metricsTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', gap: 10 },
  metricItem: { flex: 1, backgroundColor: '#0f172a', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  metricLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  metricVal: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc', marginTop: 2 },

  // Admin Location Config Banner
  locationConfigBanner: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  configBannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  configBannerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  configCampusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  configCampusText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold' },

  coordDisplayBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },

  // Admin Today Summary
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  summaryNum: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  summaryLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' },

  filterPillsRow: { flexDirection: 'row', gap: 6 },
  filterPill: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  filterPillTextActive: { color: '#38bdf8', fontWeight: 'bold' },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },

  rosterCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 10 },
  rosterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
  staffNameText: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  staffRoleText: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  rosterTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeCol: { gap: 2 },
  timeLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  timeVal: { fontSize: 13, color: '#f8fafc', fontWeight: 'bold' },
  editOverrideBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.12)' },
  editOverrideText: { fontSize: 12, color: '#38bdf8', fontWeight: '600' },

  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  distanceText: { fontSize: 11, color: '#94a3b8' },

  // History Log Cards
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  dateGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 2 },
  dateGroupHeaderTitle: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
  nonAdminHistoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyHeaderUserTitle: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
  historyCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDateText: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  historyBody: { flexDirection: 'row', justifyContent: 'space-between' },
  historyMetaCol: { flex: 1, gap: 2 },
  historyMetaLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  historyMetaVal: { fontSize: 13, color: '#f8fafc', fontWeight: '500' },

  emptyCard: { backgroundColor: '#1e293b', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  statusOptBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statusOptBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  statusOptText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  statusOptTextActive: { color: '#38bdf8', fontWeight: 'bold' },
  modalInput: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, height: 46 },
  inputLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#0284c7', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
