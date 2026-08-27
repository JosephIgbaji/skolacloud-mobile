import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Briefcase,
  Bus,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Home as HomeIcon,
  Inbox,
  Layers,
  LogOut,
  Menu,
  MonitorPlay,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';

const { width } = Dimensions.get('window');

interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  route: string;
  badge?: string;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rawRole = (user?.role || 'admin').toLowerCase();
  const isTeacher = rawRole === 'teacher';
  const isParent = rawRole === 'parent';

  const parentCategories: NavCategory[] = [
    {
      title: 'MY WARDS & ACADEMICS',
      items: [
        {
          id: 'parent-children',
          title: 'My Children',
          subtitle: 'View linked wards & class teacher contact',
          icon: Users,
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.12)',
          route: '/parent-children',
        },
        {
          id: 'parent-attendance',
          title: 'Attendance Log',
          subtitle: 'View daily roll call presence log',
          icon: UserCheck,
          color: '#4ade80',
          bgColor: 'rgba(74, 222, 128, 0.12)',
          route: '/parent-attendance',
        },
        {
          id: 'parent-results',
          title: 'Report Cards & Results',
          subtitle: 'View term grades & Form Master remarks',
          icon: FileText,
          color: '#facc15',
          bgColor: 'rgba(250, 204, 21, 0.12)',
          route: '/parent-results',
        },
      ],
    },
    {
      title: 'FINANCE & FEES',
      items: [
        {
          id: 'parent-fees',
          title: 'School Fees & Invoices',
          subtitle: 'Fee statements & pay online',
          icon: DollarSign,
          color: '#c084fc',
          bgColor: 'rgba(192, 132, 252, 0.12)',
          route: '/parent-fees',
        },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          id: 'notifications',
          title: 'School Announcements',
          subtitle: 'App notices & broadcast SMS',
          icon: Bell,
          color: '#f472b6',
          bgColor: 'rgba(244, 114, 182, 0.12)',
          route: '/notifications',
        },
      ],
    },
  ];

  const categories: NavCategory[] = isParent
    ? parentCategories
    : isTeacher
    ? [
        {
          title: 'TEACHING & CLASSROOM',
          items: [
            {
              id: 'teacher-students',
              title: 'My Class Roster',
              subtitle: 'View assigned class roster & contact parents',
              icon: Users,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/teacher-students',
            },
            {
              id: 'teacher-student-attendance',
              title: 'Student Attendance',
              subtitle: 'Mark & view daily class attendance',
              icon: UserCheck,
              color: '#4ade80',
              bgColor: 'rgba(74, 222, 128, 0.12)',
              route: '/teacher-student-attendance',
            },
            {
              id: 'teacher-classes',
              title: 'My Classes & Arms',
              subtitle: 'View assigned subject arms & class schedule',
              icon: MonitorPlay,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/teacher-classes',
            },
            {
              id: 'teacher-subjects',
              title: 'My Subjects',
              subtitle: 'View assigned curriculum & subject allocations',
              icon: BookOpen,
              color: '#a78bfa',
              bgColor: 'rgba(167, 139, 250, 0.12)',
              route: '/teacher-subjects',
            },
            {
              id: 'teacher-timetable',
              title: 'My Timetable',
              subtitle: 'Weekly teaching period schedule',
              icon: Calendar,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/teacher-timetable',
            },
            {
              id: 'teacher-results',
              title: 'Gradebook & Exam Results',
              subtitle: 'Enter grades, continuous assessments & comments',
              icon: FileText,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/teacher-results',
            },
            {
              id: 'cbt',
              title: 'CBT Online Testing',
              subtitle: 'Question bank & automated exams',
              icon: Layers,
              color: '#c084fc',
              bgColor: 'rgba(192, 132, 252, 0.12)',
              route: '/cbt',
            },
          ],
        },
        {
          title: 'STAFF & PERSONAL TOOLS',
          items: [
            {
              id: 'staff-attendance',
              title: 'Staff Attendance & Clock-In',
              subtitle: 'Clock in/out, log hours & track work shift',
              icon: Clock,
              color: '#4ade80',
              bgColor: 'rgba(74, 222, 128, 0.12)',
              route: '/staff-attendance',
              badge: 'HRM',
            },
            {
              id: 'teacher-leave',
              title: 'Staff Leave Portal',
              subtitle: 'Apply for leave & check remaining balances',
              icon: Briefcase,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/teacher-leave',
              badge: 'LEAVE',
            },
            {
              id: 'notifications',
              title: 'Broadcast Announcements',
              subtitle: 'Push SMS, Email & App notices',
              icon: Bell,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/notifications',
            },
          ],
        },
        {
          title: 'CAMPUS RESOURCES',
          items: [
            {
              id: 'library',
              title: 'Library Catalog',
              subtitle: 'Book catalog & resource search',
              icon: BookOpen,
              color: '#fbbf24',
              bgColor: 'rgba(251, 191, 36, 0.12)',
              route: '/library',
            },
            {
              id: 'transport',
              title: 'School Transport',
              subtitle: 'Bus routes & driver rosters',
              icon: Bus,
              color: '#a78bfa',
              bgColor: 'rgba(167, 139, 250, 0.12)',
              route: '/transport',
            },
          ],
        },
      ]
    : [
        {
          title: 'PEOPLES & STAFF',
          items: [
            {
              id: 'students',
              title: 'Student Registry',
              subtitle: 'School-wide student directory & management',
              icon: Users,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/admin-students',
            },
            {
              id: 'teachers',
              title: 'Teachers & Staff',
              subtitle: 'Staff directory & role permissions',
              icon: Users,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/teachers',
            },
            {
              id: 'applications',
              title: 'Admissions & Applications',
              subtitle: 'Review student online applications',
              icon: Inbox,
              color: '#fbbf24',
              bgColor: 'rgba(251, 191, 36, 0.12)',
              route: '/applications',
              badge: 'NEW',
            },
            {
              id: 'staff-attendance',
              title: 'Staff Attendance & HRM',
              subtitle: 'Clock in/out, work hours & late tracking',
              icon: Clock,
              color: '#4ade80',
              bgColor: 'rgba(74, 222, 128, 0.12)',
              route: '/staff-attendance',
              badge: 'HRM',
            },
            {
              id: 'admin-leave-management',
              title: 'Leave Approvals & Setup',
              subtitle: 'Approve staff leave & configure policies',
              icon: Briefcase,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/admin-leave-management',
              badge: 'LEAVE',
            },
          ],
        },
        {
          title: 'ACADEMIC MANAGEMENT',
          items: [
            {
              id: 'academic-setup',
              title: 'Academic Sessions & Terms',
              subtitle: 'Sessions, terms & class structure',
              icon: Calendar,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/academic-setup',
              badge: 'SETUP',
            },
            {
              id: 'classes',
              title: 'Classes & Sections',
              subtitle: 'Class teacher & arms assignment',
              icon: MonitorPlay,
              color: '#4ade80',
              bgColor: 'rgba(74, 222, 128, 0.12)',
              route: '/admin-classes',
            },
            {
              id: 'subjects',
              title: 'Subjects & Curriculum',
              subtitle: 'Grade subject allocations',
              icon: BookOpen,
              color: '#a78bfa',
              bgColor: 'rgba(167, 139, 250, 0.12)',
              route: '/admin-subjects',
            },
            {
              id: 'timetable',
              title: 'Timetables & Schedules',
              subtitle: 'Class & teacher period schedules',
              icon: Calendar,
              color: '#f472b6',
              bgColor: 'rgba(244, 114, 182, 0.12)',
              route: '/admin-timetable',
            },
            {
              id: 'results',
              title: 'Examinations & Results',
              subtitle: 'Grade entry, approval & report cards',
              icon: FileText,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/admin-results',
            },
            {
              id: 'cbt',
              title: 'CBT Online Testing',
              subtitle: 'Question bank & automated exams',
              icon: Layers,
              color: '#c084fc',
              bgColor: 'rgba(192, 132, 252, 0.12)',
              route: '/cbt',
            },
          ],
        },
        {
          title: 'FINANCE & HRM',
          items: [
            {
              id: 'fees',
              title: 'Fee Management & Invoices',
              subtitle: 'Track student fee balances, invoices & receipts',
              icon: DollarSign,
              color: '#34d399',
              bgColor: 'rgba(52, 211, 153, 0.12)',
              route: '/(tabs)/fees',
            },
            {
              id: 'expenses',
              title: 'Expenses & Expenditure',
              subtitle: 'Operational financial outflow logs',
              icon: DollarSign,
              color: '#f87171',
              bgColor: 'rgba(248, 113, 113, 0.12)',
              route: '/expenses',
            },
            {
              id: 'departments',
              title: 'Departments',
              subtitle: 'Academic & administrative arms',
              icon: Briefcase,
              color: '#fb7185',
              bgColor: 'rgba(251, 113, 133, 0.12)',
              route: '/departments',
            },
            {
              id: 'notifications',
              title: 'Broadcast Announcements',
              subtitle: 'Push SMS, Email & App notices',
              icon: Bell,
              color: '#38bdf8',
              bgColor: 'rgba(56, 189, 248, 0.12)',
              route: '/notifications',
            },
          ],
        },
        {
          title: 'CAMPUS FACILITIES',
          items: [
            {
              id: 'library',
              title: 'Library Management',
              subtitle: 'Book catalog, issues & returns',
              icon: BookOpen,
              color: '#fbbf24',
              bgColor: 'rgba(251, 191, 36, 0.12)',
              route: '/library',
            },
            {
              id: 'hostels',
              title: 'Hostels & Accommodation',
              subtitle: 'Room allocations & bed spaces',
              icon: HomeIcon,
              color: '#4ade80',
              bgColor: 'rgba(74, 222, 128, 0.12)',
              route: '/hostels',
            },
            {
              id: 'transport',
              title: 'School Transport',
              subtitle: 'Bus routes & driver rosters',
              icon: Bus,
              color: '#a78bfa',
              bgColor: 'rgba(167, 139, 250, 0.12)',
              route: '/transport',
            },
          ],
        },
      ];

  const handleNavigate = (route: string) => {
    setDrawerOpen(false);
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.headerTitle}>
            {isTeacher ? 'Teacher Hub' : 'SkolaCloud Hub'}
          </ThemedText>
          <ThemedText style={styles.headerSub}>
            {isTeacher ? 'Classroom & Teaching Management Tools' : 'All Administrative Modules & Tools'}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.openDrawerBtn}
          onPress={() => setDrawerOpen(true)}
        >
          <Menu size={20} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      {/* Main Grid View */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {categories.map((cat, catIdx) => (
          <View key={catIdx} style={styles.categorySection}>
            <ThemedText style={styles.categoryTitle}>{cat.title}</ThemedText>

            <View style={styles.gridContainer}>
              {cat.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridCard}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
                      <IconComponent size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
                        {item.badge && (
                          <View style={styles.badgePill}>
                            <ThemedText style={styles.badgeText}>{item.badge}</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.itemSub}>{item.subtitle}</ThemedText>
                    </View>
                    <ChevronRight size={18} color="#64748b" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Profile & Logout Section */}
        <View style={styles.accountSection}>
          <TouchableOpacity
            style={styles.accountCard}
            onPress={() => handleNavigate('/(tabs)/profile')}
          >
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarText}>
                {(user?.firstName || user?.email || (isTeacher ? 'T' : 'A')).charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.userName}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (isTeacher ? 'Teacher Account' : 'Admin Account')}
              </ThemedText>
              <ThemedText style={styles.userRole}>
                {(user?.role || (isTeacher ? 'Teacher' : 'Administrator')).toUpperCase()}
              </ThemedText>
            </View>
            <Settings size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Side Slide Modal Drawer */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
          <View style={styles.drawerContainer}>
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.drawerBadgeIcon}>
                  <ShieldCheck size={20} color="#38bdf8" />
                </View>
                <View>
                  <ThemedText style={styles.drawerTitle}>
                    {isTeacher ? 'Teacher Navigation' : 'Admin Navigation'}
                  </ThemedText>
                  <ThemedText style={styles.drawerSub}>
                    {isTeacher ? 'My Teaching Suite' : 'School Management Suite'}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Drawer Items */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              {categories.map((cat, idx) => (
                <View key={idx} style={{ marginBottom: 18 }}>
                  <ThemedText style={styles.drawerCatHeader}>{cat.title}</ThemedText>
                  {cat.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.drawerItemRow}
                        onPress={() => handleNavigate(item.route)}
                      >
                        <View style={[styles.drawerIconBox, { backgroundColor: item.bgColor }]}>
                          <IconComponent size={18} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.drawerItemTitle}>{item.title}</ThemedText>
                        </View>
                        <ChevronRight size={16} color="#475569" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={styles.drawerItemRow}
                onPress={() => handleNavigate('/(tabs)/profile')}
              >
                <View style={[styles.drawerIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
                  <Settings size={18} color="#eab308" />
                </View>
                <ThemedText style={styles.drawerItemTitle}>Account Settings</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItemRow, { marginTop: 4 }]}
                onPress={async () => {
                  setDrawerOpen(false);
                  await logout();
                }}
              >
                <View style={[styles.drawerIconBox, { backgroundColor: 'rgba(248, 113, 113, 0.12)' }]}>
                  <LogOut size={18} color="#f87171" />
                </View>
                <ThemedText style={[styles.drawerItemTitle, { color: '#f87171' }]}>Sign Out</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  openDrawerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  gridContainer: {
    gap: 8,
  },
  gridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  itemSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  accountSection: {
    marginTop: 10,
    marginBottom: 30,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  userRole: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginTop: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: width * 0.82,
    backgroundColor: '#0f172a',
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  drawerBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  drawerSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  drawerCatHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
  },
  drawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
});
