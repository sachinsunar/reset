import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  CalendarRange,
  ChevronRight,
  Cloud,
  Dumbbell,
  Flame,
  GraduationCap,
  ListChecks,
  Palette,
  Route,
  Settings2,
  Timer,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import { getNotificationPreferences } from '@/db/repositories/settings';
import { formatDateKey } from '@/lib/date';
import { PHASE_LABELS } from '@/lib/phases';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  description: string;
  route: Href;
  badge?: string;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const activePhase = useAppStore((state) => state.activePhase);
  const progress = useAppStore((state) => state.progress);
  const streak = useAppStore((state) => state.streak);
  const achievements = useAppStore((state) => state.achievements);
  const notifications = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: getNotificationPreferences,
    staleTime: 30_000,
  });

  const name = profile?.name || 'Your profile';
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const unlocked = achievements.filter((item) => item.unlockedAt).length;
  const notificationOn = notifications.data?.enabled;

  const groups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Your systems',
      items: [
        {
          icon: GraduationCap,
          label: 'Academic',
          description: 'Subjects, syllabus and study sessions',
          route: '/academic',
        },
        {
          icon: Dumbbell,
          label: 'Fitness',
          description: 'Weekly movement and workout history',
          route: '/fitness',
        },
        {
          icon: Route,
          label: 'NestJS Project Time',
          description: 'Build the project one small step at a time',
          route: '/learning',
        },
        {
          icon: Timer,
          label: 'Focus timer',
          description: 'Quiet, session-based focus',
          route: '/focus',
        },
      ],
    },
    {
      title: 'Routine & insight',
      items: [
        {
          icon: CalendarRange,
          label: 'Streak calendar',
          description: 'Your consistency over time',
          route: '/streak',
        },
        {
          icon: ListChecks,
          label: 'Routine editor',
          description: 'Drag, reorder and pin fixed-time blocks',
          route: '/routine-edit',
        },
        {
          icon: Settings2,
          label: 'Routine & schedule',
          description: 'Phases, times and active blocks',
          route: '/routine',
        },
        {
          icon: Trophy,
          label: 'Milestones',
          description: `${unlocked} of ${achievements.length} unlocked`,
          route: '/(tabs)/progress',
        },
      ],
    },
    {
      title: 'Reminders & data',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Gentle reminders and quiet hours',
          route: '/notifications',
          badge: notificationOn ? 'On' : 'Off',
        },
        {
          icon: Palette,
          label: 'Preferences',
          description: 'Theme, name and streak settings',
          route: '/preferences',
        },
        {
          icon: Cloud,
          label: 'Backup & sync',
          description: 'Keep your data safe across devices',
          route: '/sync',
        },
      ],
    },
  ];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Your space
          </AppText>
          <AppText variant="display">Profile</AppText>
        </View>
        <View style={[styles.icon, { backgroundColor: theme.colors.surfaceMuted }]}>
          <UserRound size={20} color={theme.colors.primary} />
        </View>
      </View>

      <Card tone="hero" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
            <AppText variant="title" color={theme.colors.primary}>
              {initials || 'R'}
            </AppText>
          </View>
          <View style={styles.heroText}>
            <AppText variant="heading" color={theme.colors.heroText} numberOfLines={1}>
              {name}
            </AppText>
            <AppText variant="caption" color={theme.colors.heroMuted} numberOfLines={1}>
              {profile?.email || 'Local account · no account needed'}
            </AppText>
            <View style={styles.phaseRow}>
              <View style={[styles.phaseDot, { backgroundColor: activePhase?.color ?? theme.colors.sage }]} />
              <AppText variant="caption" color={theme.colors.heroMuted}>
                {activePhase ? PHASE_LABELS[activePhase.id] ?? activePhase.name : 'Plan paused'}
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.heroStats}>
          <ProfileStat icon={<Flame size={14} color={theme.colors.amber} />} value={`${streak.current}`} label="day streak" />
          <View style={styles.divider} />
          <ProfileStat icon={<BookOpen size={14} color={theme.colors.sage} />} value={`${Math.round(progress.corePercent * 100)}%`} label="today" />
          <View style={styles.divider} />
          <ProfileStat icon={<Trophy size={14} color={theme.colors.amber} />} value={`${unlocked}`} label="milestones" />
        </View>
        {profile ? (
          <AppText variant="caption" color={theme.colors.heroMuted}>
            Tracking since {formatDateKey(profile.trackingSince, { month: 'long', day: 'numeric', year: 'numeric' })}
          </AppText>
        ) : null}
      </Card>

      {groups.map((group) => (
        <View key={group.title} style={styles.section}>
          <SectionHeader title={group.title} />
          <Card padded={false} style={styles.menuCard}>
            {group.items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.menuRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  { opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <View style={[styles.menuIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <item.icon size={18} color={theme.colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.menuText}>
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                    {item.description}
                  </AppText>
                </View>
                {item.badge ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          item.badge === 'On' ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={item.badge === 'On' ? theme.colors.primary : theme.colors.textMuted}
                    >
                      {item.badge}
                    </AppText>
                  </View>
                ) : null}
                <ChevronRight size={17} color={theme.colors.textFaint} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <View style={styles.footer}>
        <AppText variant="caption" color={theme.colors.textFaint} align="center">
          Reset · local-first and private by default
        </AppText>
        <AppText variant="caption" color={theme.colors.textFaint} align="center">
          Your data stays on this device unless you enable sync.
        </AppText>
      </View>
    </Screen>
  );
}

function ProfileStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        {icon}
        <AppText variant="heading" color={theme.colors.heroText}>
          {value}
        </AppText>
      </View>
      <AppText variant="caption" color={theme.colors.heroMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 3 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 1 },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(23,23,23,0.16)' },
  section: { gap: 10 },
  menuCard: { overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, gap: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  footer: { gap: 3, paddingVertical: 10 },
});
