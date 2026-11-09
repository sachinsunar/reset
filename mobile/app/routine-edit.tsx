import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  GripVertical,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import {
  getBlocks,
  getPhases,
  restoreDefaultPhaseBlocks,
  saveRoutineChanges,
} from '@/db/repositories/settings';
import { regenerateRoutineGoals } from '@/db/repositories/goals';
import { formatTime12h, minutesToTime, timeToMinutes, todayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import {
  blockDuration,
  findConflicts,
  recomputeRoutineTimes,
  reorderBlocks,
  type RoutineConflict,
} from '@/lib/routineSchedule';
import { PHASE_LABELS } from '@/lib/phases';
import { selectionFeedback, successFeedback } from '@/lib/haptics';
import { showToast } from '@/lib/toastBus';
import type { Category, ScheduleBlock } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { SheetModal } from '@/components/ui/SheetModal';
import { LoadingState } from '@/components/ui/States';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const DAYS = [
  { label: 'M', long: 'Monday', value: 1 },
  { label: 'T', long: 'Tuesday', value: 2 },
  { label: 'W', long: 'Wednesday', value: 3 },
  { label: 'T', long: 'Thursday', value: 4 },
  { label: 'F', long: 'Friday', value: 5 },
  { label: 'S', long: 'Saturday', value: 6 },
  { label: 'S', long: 'Sunday', value: 0 },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'career', label: 'Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'sleep', label: 'Sleep' },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];
const ROW_STRIDE = 82;

type FormState = {
  title: string;
  description: string;
  category: Category;
  days: number[];
  trackable: boolean;
  active: boolean;
  fixed: boolean;
  startTime: string;
  duration: string;
};

const blankForm = (): FormState => ({
  title: '',
  description: '',
  category: 'personal',
  days: [0, 1, 2, 3, 4, 5, 6],
  trackable: true,
  active: true,
  fixed: false,
  startTime: '09:00',
  duration: '30',
});

const timeValid = (value: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
const findBlockConflicts = (blocks: ScheduleBlock[]) => findConflicts(blocks);

export default function RoutineEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phaseId?: string; date?: string }>();
  const queryClient = useQueryClient();
  const activePhase = useAppStore((state) => state.activePhase);
  const refreshStore = useAppStore((state) => state.refresh);
  const phaseId = params.phaseId || activePhase?.id || '';
  const date = params.date || todayKey();

  const phasesQuery = useQuery({ queryKey: ['routine-phases'], queryFn: getPhases });
  const blocksQuery = useQuery({
    queryKey: ['routine-blocks', phaseId],
    queryFn: () => getBlocks(phaseId),
    enabled: Boolean(phaseId),
  });
  const phase =
    phasesQuery.data?.find((item) => item.id === phaseId) ??
    activePhase ??
    null;

  const [draft, setDraft] = useState<ScheduleBlock[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [initialIds, setInitialIds] = useState<string[]>([]);
  const [history, setHistory] = useState<ScheduleBlock[][]>([]);
  const [conflicts, setConflicts] = useState<RoutineConflict[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState('');

  const dragY = useRef(new Animated.Value(0)).current;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const dragTargetRef = useRef<number | null>(null);

  useEffect(() => {
    if (loaded || !blocksQuery.data) return;
    const next = blocksQuery.data;
    setDraft(next);
    setInitialIds(next.map((block) => block.id));
    setSavedSnapshot(JSON.stringify(next));
    setConflicts(recomputeRoutineTimes(next).conflicts);
    setLoaded(true);
  }, [blocksQuery.data, loaded]);

  const isDirty = loaded && JSON.stringify(draft) !== savedSnapshot;
  const anchorMinutes = useMemo(
    () =>
      draft.length
        ? Math.min(...draft.map((block) => timeToMinutes(block.startTime)))
        : timeToMinutes('06:00'),
    [draft],
  );

  const rebuild = (next: ScheduleBlock[], remember = true) => {
    if (remember) setHistory((items) => [...items.slice(-19), draft]);
    const result = recomputeRoutineTimes(next, anchorMinutes);
    setDraft(result.blocks);
    setConflicts(result.conflicts);
  };

  const commitDraft = (next: ScheduleBlock[], remember = true) => {
    if (remember) setHistory((items) => [...items.slice(-19), draft]);
    setDraft(next);
    setConflicts(findBlockConflicts(next));
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    selectionFeedback();
    rebuild(reorderBlocks(draft, from, to));
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistory((items) => items.slice(0, -1));
    setDraft(previous);
    setConflicts(findBlockConflicts(previous));
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingId(block.id);
    setForm({
      title: block.title,
      description: block.description,
      category: block.category,
      days: block.days,
      trackable: block.trackable,
      active: block.active,
      fixed: block.fixed,
      startTime: block.startTime,
      duration: String(blockDuration(block)),
    });
    setFormError('');
    setEditorOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(blankForm());
    setFormError('');
    setEditorOpen(true);
  };

  const applyForm = () => {
    if (form.title.trim().length < 2) {
      setFormError('Give this block a short, clear title.');
      return;
    }
    if (!form.days.length) {
      setFormError('Choose at least one day.');
      return;
    }
    const minutes = Number(form.duration);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 24 * 60) {
      setFormError('Use a duration between 5 and 1440 minutes.');
      return;
    }
    if (form.fixed && !timeValid(form.startTime)) {
      setFormError('Use a start time like 06:30.');
      return;
    }
    const normalizedStart = form.startTime.replace(/^(\d):/, '0$1:');
    const existing = editingId ? draft.find((block) => block.id === editingId) : null;
    const start = form.fixed ? normalizedStart : existing?.startTime ?? '09:00';
    const nextBlock: ScheduleBlock = {
      id: existing?.id ?? newId('block'),
      phaseId,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      startTime: start,
      endTime: minutesToTime(timeToMinutes(start) + Math.round(minutes)),
      days: form.days,
      trackable: form.trackable,
      fixed: form.fixed,
      kind: existing?.kind ?? 'optional',
      estMinutes: Math.round(minutes),
      sortOrder: existing?.sortOrder ?? draft.length,
      active: form.active,
    };
    const next = existing
      ? draft.map((block) => (block.id === existing.id ? nextBlock : block))
      : [...draft, nextBlock];
    const timeChanged =
      !existing ||
      existing.fixed !== nextBlock.fixed ||
      existing.startTime !== nextBlock.startTime ||
      blockDuration(existing) !== Math.round(minutes);
    if (timeChanged) rebuild(next);
    else commitDraft(next);
    setEditorOpen(false);
    showToast(existing ? 'Block updated in the draft.' : 'Block added to the draft.', 'success');
  };

  const confirmDelete = () => {
    if (!editingId) {
      setEditorOpen(false);
      return;
    }
    const block = draft.find((item) => item.id === editingId);
    Alert.alert(
      `Delete ${block?.title ?? 'this block'}?`,
      'This removes it from the routine. Completed history is kept.',
      [
        { text: 'Keep block', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            rebuild(draft.filter((item) => item.id !== editingId));
            setEditorOpen(false);
            showToast('Block removed from the draft.', 'info');
          },
        },
      ],
    );
  };

  const save = async () => {
    if (!loaded || !phaseId) return;
    const result = recomputeRoutineTimes(draft, anchorMinutes);
    if (result.conflicts.length) {
      setConflicts(result.conflicts);
      showToast('Resolve the highlighted overlaps before saving.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const deleted = initialIds.filter((id) => !draft.some((block) => block.id === id));
      await saveRoutineChanges(result.blocks, deleted);
      await regenerateRoutineGoals(date);
      const today = todayKey();
      if (date !== today) await regenerateRoutineGoals(today);
      await queryClient.invalidateQueries({ queryKey: ['day-plan'] });
      await queryClient.invalidateQueries({ queryKey: ['routine-blocks'] });
      await refreshStore();
      successFeedback();
      showToast('Routine saved. Home is up to date.', 'success');
      router.back();
    } catch {
      showToast('The routine could not be saved. Please try again.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const restore = () => {
    if (!phaseId) return;
    Alert.alert(
      'Restore the original routine?',
      'This replaces your custom blocks and times for this phase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            await restoreDefaultPhaseBlocks(phaseId);
            await regenerateRoutineGoals(date);
            const today = todayKey();
            if (date !== today) await regenerateRoutineGoals(today);
            await queryClient.invalidateQueries({ queryKey: ['day-plan'] });
            await blocksQuery.refetch();
            await queryClient.invalidateQueries({ queryKey: ['routine-blocks'] });
            await refreshStore();
            setLoaded(false);
            setHistory([]);
            showToast('Original routine restored. Today is up to date.', 'info');
          },
        },
      ],
    );
  };

  const beginDrag = (index: number) => {
    dragFromRef.current = index;
    dragTargetRef.current = index;
    setDragFrom(index);
    setDragTarget(index);
    dragY.setValue(0);
    selectionFeedback();
  };

  const updateDrag = (dy: number) => {
    const from = dragFromRef.current;
    if (from == null) return;
    dragY.setValue(dy);
    const target = Math.max(0, Math.min(draft.length - 1, from + Math.round(dy / ROW_STRIDE)));
    if (target !== dragTargetRef.current) {
      dragTargetRef.current = target;
      setDragTarget(target);
    }
  };

  const endDrag = () => {
    const from = dragFromRef.current;
    const target = dragTargetRef.current;
    dragFromRef.current = null;
    dragTargetRef.current = null;
    setDragFrom(null);
    setDragTarget(null);
    dragY.setValue(0);
    if (from != null && target != null && from !== target) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      reorder(from, target);
    }
  };

  if (!phaseId) {
    return (
      <Screen edges={['top']}>
        <View style={styles.centered}>
          <AppText variant="heading">No active routine</AppText>
          <AppText variant="small" color={theme.colors.textMuted} align="center">
            Choose a phase before editing the routine.
          </AppText>
          <Button label="Go back" variant="soft" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top']} contentContainerStyle={styles.content} bottomPadding={140}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel routine editing"
          onPress={() => {
            if (!isDirty) {
              router.back();
              return;
            }
            Alert.alert('Discard changes?', 'Your draft changes will be lost.', [
              { text: 'Keep editing', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: () => router.back() },
            ]);
          }}
          style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <X size={19} color={theme.colors.text} />
        </Pressable>
        <View style={styles.toolbarText}>
          <View style={styles.titleRow}>
            <AppText variant="heading">Edit routine</AppText>
            {isDirty ? <View style={[styles.dirtyDot, { backgroundColor: theme.colors.primary }]} /> : null}
          </View>
          <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
            {phase ? PHASE_LABELS[phase.id] ?? phase.name : 'Active phase'} · drag to reorder
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo last change"
          disabled={!history.length}
          onPress={undo}
          style={[
            styles.iconButton,
            {
              backgroundColor: history.length ? theme.colors.primarySoft : theme.colors.surfaceMuted,
              borderColor: 'transparent',
              opacity: history.length ? 1 : 0.45,
            },
          ]}
        >
          <Undo2 size={18} color={theme.colors.primary} />
        </Pressable>
      </View>

      {conflicts.length ? (
        <View style={[styles.conflictCard, { backgroundColor: theme.colors.errorSoft }]}>
          <View style={styles.conflictTitle}>
            <AlertTriangle size={17} color={theme.colors.error} />
            <AppText variant="smallStrong" color={theme.colors.error}>
              Resolve before saving
            </AppText>
          </View>
          {conflicts.map((conflict) => (
            <AppText key={`${conflict.blockId}-${conflict.otherBlockId}`} variant="caption" color={theme.colors.error}>
              {conflict.message}
            </AppText>
          ))}
          <AppText variant="caption" color={theme.colors.textMuted}>
            Drag the flexible block below the fixed event, or choose a shorter duration.
          </AppText>
        </View>
      ) : null}

      {blocksQuery.isLoading || !loaded ? (
        <LoadingState label="Opening your routine…" />
      ) : draft.length ? (
        <View style={styles.list}>
          {draft.map((block, index) => {
            const isDragging = dragFrom === index;
            const showLineBelow = dragTarget === index && dragFrom != null && dragFrom < index;
            const showLineAbove = dragTarget === index && dragFrom != null && dragFrom > index;
            return (
              <React.Fragment key={block.id}>
                <SortableRow
                  block={block}
                  index={index}
                  isDragging={isDragging}
                  dragY={dragY}
                  showLineAbove={showLineAbove}
                  showLineBelow={showLineBelow}
                  onBegin={beginDrag}
                  onMove={updateDrag}
                  onEnd={endDrag}
                  onEdit={() => openEdit(block)}
                  onMoveUp={() => reorder(index, index - 1)}
                  onMoveDown={() => reorder(index, index + 1)}
                  canMoveUp={index > 0}
                  canMoveDown={index < draft.length - 1}
                />
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Clock3 size={25} color={theme.colors.primary} />
          <AppText variant="bodyStrong">This routine is empty.</AppText>
          <AppText variant="small" color={theme.colors.textMuted} align="center">
            Add a block to start shaping the day.
          </AppText>
        </View>
      )}

      <Button
        label="Add a block"
        variant="secondary"
        icon={<Plus size={17} color={theme.colors.text} />}
        onPress={openNew}
        fullWidth
      />

      <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.saveText}>
          <AppText variant="smallStrong">{isDirty ? 'Unsaved changes' : 'Everything is saved'}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            Times recalculate automatically after each move.
          </AppText>
        </View>
        <Button
          label="Save routine"
          icon={<Check size={16} color={theme.colors.primaryText} />}
          onPress={save}
          loading={saving}
          disabled={!isDirty || Boolean(conflicts.length)}
        />
      </View>

      <Button
        label="Restore phase defaults"
        variant="ghost"
        size="sm"
        icon={<RotateCcw size={14} color={theme.colors.textMuted} />}
        onPress={restore}
        fullWidth
      />

      <SheetModal
        visible={editorOpen}
        title={editingId ? 'Edit block' : 'Add block'}
        subtitle={form.fixed ? 'Fixed time stays pinned while other blocks move around it.' : 'Time is scheduled from the order above.'}
        onClose={() => setEditorOpen(false)}
      >
        <TextField
          label="Title"
          placeholder="e.g. NestJS Project Time"
          value={form.title}
          onChangeText={(title) => setForm((current) => ({ ...current, title }))}
          autoFocus={!editingId}
        />
        <TextField
          label="Description"
          placeholder="What does this block mean?"
          value={form.description}
          onChangeText={(description) => setForm((current) => ({ ...current, description }))}
          multiline
        />
        <View style={styles.formRow}>
          <View style={styles.flex}>
            <TextField
              label="Duration (minutes)"
              keyboardType="number-pad"
              value={form.duration}
              onChangeText={(duration) => setForm((current) => ({ ...current, duration }))}
            />
          </View>
          {form.fixed ? (
            <View style={styles.flex}>
              <TextField
                label="Fixed start"
                placeholder="06:30"
                value={form.startTime}
                onChangeText={(startTime) => setForm((current) => ({ ...current, startTime }))}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.chips}>
          {DURATIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes}m`}
              size="sm"
              selected={Number(form.duration) === minutes}
              onPress={() => setForm((current) => ({ ...current, duration: String(minutes) }))}
            />
          ))}
        </View>

        <View style={styles.group}>
          <AppText variant="smallStrong">Days</AppText>
          <View style={styles.chips}>
            {DAYS.map((day, dayIndex) => {
              const selected = form.days.includes(day.value);
              return (
                <Chip
                  key={`${day.label}-${dayIndex}`}
                  label={day.label}
                  size="sm"
                  selected={selected}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      days: selected
                        ? current.days.filter((value) => value !== day.value)
                        : [...current.days, day.value],
                    }))
                  }
                />
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="smallStrong">Category</AppText>
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="sm"
                selected={form.category === item.value}
                onPress={() => setForm((current) => ({ ...current, category: item.value }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="smallStrong">Behaviour</AppText>
          <View style={styles.chips}>
            <Chip
              label="Fixed time"
              size="sm"
              selected={form.fixed}
              icon={<Lock size={11} color={form.fixed ? theme.colors.primary : theme.colors.textMuted} />}
              onPress={() => setForm((current) => ({ ...current, fixed: !current.fixed }))}
            />
            <Chip
              label="Counts as a goal"
              size="sm"
              selected={form.trackable}
              onPress={() => setForm((current) => ({ ...current, trackable: !current.trackable }))}
            />
            <Chip
              label="Visible"
              size="sm"
              selected={form.active}
              onPress={() => setForm((current) => ({ ...current, active: !current.active }))}
            />
          </View>
          <AppText variant="caption" color={theme.colors.textFaint}>
            Fixed events like college or appointments keep their exact start time.
          </AppText>
        </View>

        {formError ? (
          <AppText variant="caption" color={theme.colors.error}>
            {formError}
          </AppText>
        ) : null}

        <Button label={editingId ? 'Apply changes' : 'Add to routine'} onPress={applyForm} fullWidth />
        {editingId ? (
          <Button
            label="Delete block"
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} color={theme.colors.error} />}
            onPress={confirmDelete}
            fullWidth
          />
        ) : null}
      </SheetModal>
    </Screen>
  );
}

function SortableRow({
  block,
  index,
  isDragging,
  dragY,
  showLineAbove,
  showLineBelow,
  onBegin,
  onMove,
  onEnd,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: ScheduleBlock;
  index: number;
  isDragging: boolean;
  dragY: Animated.Value;
  showLineAbove: boolean;
  showLineBelow: boolean;
  onBegin: (index: number) => void;
  onMove: (dy: number) => void;
  onEnd: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const theme = useTheme();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => onBegin(index),
        onPanResponderMove: (_, gesture) => onMove(gesture.dy),
        onPanResponderRelease: onEnd,
        onPanResponderTerminate: onEnd,
        onPanResponderTerminationRequest: () => false,
      }),
    [index, onBegin, onMove, onEnd],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          backgroundColor: isDragging ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: isDragging ? theme.colors.primary : theme.colors.border,
          borderTopWidth: showLineAbove ? 3 : StyleSheet.hairlineWidth,
          borderBottomWidth: showLineBelow ? 3 : StyleSheet.hairlineWidth,
          borderTopColor: showLineAbove ? theme.colors.primary : theme.colors.border,
          borderBottomColor: showLineBelow ? theme.colors.primary : theme.colors.border,
          opacity: block.active ? 1 : 0.55,
          transform: isDragging ? [{ translateY: dragY }] : [{ translateY: 0 }],
          zIndex: isDragging ? 20 : 1,
          elevation: isDragging ? 8 : 1,
          shadowOpacity: isDragging ? 0.18 : 0.05,
        },
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.handle} accessibilityLabel={`Drag ${block.title}`}>
        <GripVertical size={21} color={isDragging ? theme.colors.primary : theme.colors.textFaint} />
      </View>

      <Pressable onPress={onEdit} style={styles.rowBody} accessibilityRole="button" accessibilityLabel={`Edit ${block.title}`}>
        <View style={styles.rowTitle}>
          <AppText variant="smallStrong" numberOfLines={1} style={styles.flex}>
            {block.title}
          </AppText>
          {block.fixed ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.purpleSoft }]}>
              <Lock size={9} color={theme.colors.primary} />
              <AppText variant="caption" color={theme.colors.primary}>
                FIXED
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {formatTime12h(block.startTime)}–{formatTime12h(block.endTime)}
          </AppText>
          <View style={[styles.dot, { backgroundColor: theme.colors.textFaint }]} />
          <AppText variant="caption" color={theme.colors.textMuted}>
            {blockDuration(block)}m
          </AppText>
          <View style={[styles.dot, { backgroundColor: theme.colors.textFaint }]} />
          <AppText variant="caption" color={theme.colors.textMuted}>
            {block.trackable ? 'goal' : 'display only'}
          </AppText>
        </View>
      </Pressable>

      <View style={styles.moveButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Move ${block.title} up`}
          accessibilityState={{ disabled: !canMoveUp }}
          disabled={!canMoveUp}
          hitSlop={5}
          onPress={onMoveUp}
          style={[styles.moveButton, { opacity: canMoveUp ? 1 : 0.22 }]}
        >
          <ArrowUp size={15} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Move ${block.title} down`}
          accessibilityState={{ disabled: !canMoveDown }}
          disabled={!canMoveDown}
          hitSlop={5}
          onPress={onMoveDown}
          style={[styles.moveButton, { opacity: canMoveDown ? 1 : 0.22 }]}
        >
          <ArrowDown size={15} color={theme.colors.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  toolbarText: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dirtyDot: { width: 7, height: 7, borderRadius: 99 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictCard: { borderRadius: 18, padding: 14, gap: 5 },
  conflictTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { gap: 8 },
  row: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#171717',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  handle: { width: 38, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 4, paddingVertical: 12 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  moveButtons: { width: 28, alignItems: 'center', gap: 2, paddingRight: 4 },
  moveButton: { width: 26, height: 27, alignItems: 'center', justifyContent: 'center' },
  empty: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center', gap: 8 },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  saveText: { flex: 1, gap: 2 },
  formRow: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  group: { gap: 7 },
});
