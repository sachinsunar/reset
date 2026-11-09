import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Pencil, Plus, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import {
  getBlocks,
  getPhases,
  restoreDefaultPhaseBlocks,
  upsertBlock,
} from '@/db/repositories/settings';
import { formatDateKey, timeToMinutes, todayKey } from '@/lib/date';
import { regenerateRoutineGoals } from '@/db/repositories/goals';
import { newId } from '@/lib/id';
import { PHASE_LABELS } from '@/lib/phases';
import type { Category, ScheduleBlock } from '@/types';
import { showToast } from '@/lib/toastBus';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { SheetModal } from '@/components/ui/SheetModal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState } from '@/components/ui/States';

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'career', label: 'Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'sleep', label: 'Sleep' },
];

export default function RoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAppStore((state) => state.profile);
  const activePhase = useAppStore((state) => state.activePhase);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const refreshStore = useAppStore((state) => state.refresh);
  const [phaseId, setPhaseId] = useState<string | null>(profile?.activePhaseId === 'auto' ? null : profile?.activePhaseId ?? null);
  const [editing, setEditing] = useState<ScheduleBlock | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [active, setActive] = useState(true);
  const [trackable, setTrackable] = useState(true);
  const [fixed, setFixed] = useState(false);
  const [category, setCategory] = useState<Category>('personal');
  const [saving, setSaving] = useState(false);

  const phasesQuery = useQuery({ queryKey: ['routine-phases'], queryFn: getPhases });
  const phases = phasesQuery.data ?? [];
  const selectedPhase =
    phases.find((phase) => phase.id === phaseId) ?? activePhase ?? phases[0] ?? null;

  const blocksQuery = useQuery({
    queryKey: ['routine-blocks', selectedPhase?.id ?? 'none'],
    queryFn: () => getBlocks(selectedPhase?.id),
    enabled: Boolean(selectedPhase?.id),
  });
  const blocks = blocksQuery.data ?? [];

  const selectPhase = async (id: string) => {
    setPhaseId(id);
    await updateProfile({ activePhaseId: id });
    await refreshStore();
  };

  const selectAuto = async () => {
    setPhaseId(null);
    await updateProfile({ activePhaseId: 'auto' });
    await refreshStore();
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditing(block);
    setEditorOpen(true);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setTitle(block.title);
    setDays(block.days);
    setActive(block.active);
    setTrackable(block.trackable);
    setFixed(block.fixed);
    setCategory(block.category);
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
    setStartTime('09:00');
    setEndTime('09:30');
    setTitle('');
    setDays([1, 2, 3, 4, 5]);
    setActive(true);
    setTrackable(true);
    setFixed(false);
    setCategory('personal');
  };

  const save = async () => {
    if (!selectedPhase) return;
    if (title.trim().length < 2) {
      showToast('Give the block a short title.', 'warning');
      return;
    }
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      showToast('Use times like 09:00 and 09:30.', 'warning');
      return;
    }
    if (!days.length) {
      showToast('Choose at least one day.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const block: ScheduleBlock = {
        id: editing?.id ?? newId('block'),
        phaseId: selectedPhase.id,
        title: title.trim(),
        description: editing?.description ?? '',
        category,
        startTime: startTime.replace(/^(\d):/, '0$1:'),
        endTime: endTime.replace(/^(\d):/, '0$1:'),
        days,
        trackable,
        fixed,
        kind: editing?.kind ?? 'optional',
        estMinutes: editing?.estMinutes ?? Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime)),
        sortOrder: editing?.sortOrder ?? blocks.length,
        active,
      };
      await upsertBlock(block);
      await regenerateRoutineGoals(todayKey());
      await queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      await blocksQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['routine-blocks'] });
      await refreshStore();
      setEditing(null);
      setEditorOpen(false);
      setTitle('');
      showToast(editing ? 'Block updated.' : 'Block added.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    if (!selectedPhase) return;
    Alert.alert(
      'Restore default routine?',
      'Custom times and blocks for this phase will be replaced by the original Reset routine.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            await restoreDefaultPhaseBlocks(selectedPhase.id);
            await regenerateRoutineGoals(todayKey());
            await queryClient.invalidateQueries({ queryKey: ['day-plan'] });
            await blocksQuery.refetch();
            await queryClient.invalidateQueries({ queryKey: ['routine-blocks'] });
            await refreshStore();
            showToast('Default routine restored. Today is up to date.', 'info');
          },
        },
      ],
    );
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content}>
      <Header title="Routine & schedule" subtitle="Edit phases, days and times" />

      <View style={styles.section}>
        <SectionHeader title="Active phase" caption="Automatic by date, unless you override it" />
        <View style={styles.wrap}>
          <Chip label="Auto by date" selected={!phaseId} onPress={selectAuto} />
          {phases.map((phase) => (
            <Chip
              key={phase.id}
              label={PHASE_LABELS[phase.id] ?? phase.name}
              selected={selectedPhase?.id === phase.id}
              onPress={() => selectPhase(phase.id)}
            />
          ))}
        </View>
        {selectedPhase ? (
          <Card tone="sage" style={styles.phaseCard}>
            <AppText variant="bodyStrong">{selectedPhase.objective}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>
              {selectedPhase.startDate
                ? `${formatDateKey(selectedPhase.startDate, { month: 'short', day: 'numeric' })}`
                : 'No start date'}
              {selectedPhase.endDate
                ? ` → ${formatDateKey(selectedPhase.endDate, { month: 'short', day: 'numeric' })}`
                : ' → ongoing'}
              {selectedPhase.auto ? ' · automatic' : ' · manual phase'}
            </AppText>
            <Button
              label="Open drag-and-drop editor"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/routine-edit',
                  params: { phaseId: selectedPhase.id },
                })
              }
            />
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Schedule blocks"
          caption="Changes affect routines generated from now on."
          actionLabel="Add block"
          onAction={openNew}
        />
        {blocksQuery.isLoading ? (
          <LoadingState label="Loading blocks…" />
        ) : blocks.length ? (
          <Card padded={false} style={styles.list}>
            {blocks.map((block, index) => (
              <Pressable
                key={block.id}
                onPress={() => openEdit(block)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${block.title}`}
                style={[
                  styles.blockRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                  { opacity: block.active ? 1 : 0.55 },
                ]}
              >
                <View style={styles.timeCol}>
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {block.startTime}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textFaint}>
                    {block.endTime}
                  </AppText>
                </View>
                <View style={[styles.dot, { backgroundColor: block.trackable ? theme.colors.sage : theme.colors.borderStrong }]} />
                <View style={styles.blockText}>
                  <AppText variant="smallStrong" numberOfLines={1}>
                    {block.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                    {DAYS.filter((day) => block.days.includes(day.value))
                      .map((day) => day.label)
                      .join(', ')}
                    {block.trackable ? ' · counts toward plan' : ' · display only'}
                    {block.active ? '' : ' · hidden'}
                  </AppText>
                </View>
                <Pencil size={14} color={theme.colors.textFaint} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <AppText variant="small" color={theme.colors.textMuted} align="center">
              No blocks in this phase yet.
            </AppText>
            <Button label="Add the first block" variant="soft" size="sm" onPress={openNew} />
          </Card>
        )}
        {selectedPhase ? (
          <Button
            label="Restore default routine"
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} color={theme.colors.textMuted} />}
            onPress={restoreDefaults}
            fullWidth
          />
        ) : null}
      </View>

      <Card tone="amber" style={styles.note}>
        <Clock size={16} color={theme.colors.amber} />
        <AppText variant="caption" color={theme.colors.textMuted} style={styles.noteText}>
          If you change a block time, today’s already-generated goals keep their original time.
          Edits shape future days; open a goal to move it individually.
        </AppText>
      </Card>

      <SheetModal
        visible={editorOpen}
        title={editing ? 'Edit block' : 'Add block'}
        subtitle={selectedPhase ? PHASE_LABELS[selectedPhase.id] ?? selectedPhase.name : undefined}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
          setTitle('');
        }}
      >
        <TextField
          label="Title"
          placeholder="e.g. Morning walk"
          value={title}
          onChangeText={setTitle}
          autoFocus={!editing}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Start" placeholder="09:00" value={startTime} onChangeText={setStartTime} />
          </View>
          <View style={styles.flex}>
            <TextField label="End" placeholder="09:30" value={endTime} onChangeText={setEndTime} />
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Days</AppText>
          <View style={styles.wrap}>
            {DAYS.map((day) => {
              const selected = days.includes(day.value);
              return (
                <Chip
                  key={day.value}
                  label={day.label}
                  size="sm"
                  selected={selected}
                  onPress={() =>
                    setDays(
                      selected ? days.filter((value) => value !== day.value) : [...days, day.value],
                    )
                  }
                />
              );
            })}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Category</AppText>
          <View style={styles.wrap}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="sm"
                selected={category === item.value}
                onPress={() => setCategory(item.value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="smallStrong">Behaviour</AppText>
          <View style={styles.wrap}>
            <Chip
              label="Visible"
              size="sm"
              selected={active}
              onPress={() => setActive(!active)}
            />
            <Chip
              label="Creates a goal"
              size="sm"
              selected={trackable}
              onPress={() => setTrackable(!trackable)}
            />
            <Chip
              label="Fixed time"
              size="sm"
              selected={fixed}
              onPress={() => setFixed(!fixed)}
            />
          </View>
          <AppText variant="caption" color={theme.colors.textFaint}>
            Display-only blocks appear on the timeline but do not need completion.
          </AppText>
        </View>
        <Button label={editing ? 'Save block' : 'Add block'} onPress={save} loading={saving} fullWidth />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  section: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  phaseCard: { gap: 4 },
  list: { overflow: 'hidden' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  timeCol: { width: 42, alignItems: 'flex-end' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  blockText: { flex: 1, gap: 1 },
  note: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  noteText: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  group: { gap: 7 },
});
