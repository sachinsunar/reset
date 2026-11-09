import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/providers/ThemeProvider';
import { addStudySession } from '@/db/repositories/academic';
import type { StudySession, Subject } from '@/types';
import { showToast } from '@/lib/toastBus';
import { successFeedback } from '@/lib/haptics';
import { SheetModal } from '@/components/ui/SheetModal';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';

const KINDS: { value: StudySession['kind']; label: string }[] = [
  { value: 'study', label: 'Study' },
  { value: 'practice', label: 'Practice' },
  { value: 'revision', label: 'Revision' },
  { value: 'mock', label: 'Mock test' },
];

interface StudySessionSheetProps {
  visible: boolean;
  subjects: Subject[];
  defaultSubjectId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function StudySessionSheet({
  visible,
  subjects,
  defaultSubjectId,
  onClose,
  onSaved,
}: StudySessionSheetProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? subjects[0]?.id ?? '');
  const [kind, setKind] = useState<StudySession['kind']>('study');
  const [minutes, setMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSubjectId(defaultSubjectId ?? subjects[0]?.id ?? '');
      setKind('study');
      setMinutes('30');
      setNotes('');
    }
  }, [visible, defaultSubjectId, subjects]);

  const save = async () => {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 1 || value > 600) {
      showToast('Use 1 to 600 minutes.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await addStudySession({
        subjectId: subjectId || null,
        kind,
        minutes: value,
        notes: notes.trim(),
      });
      await queryClient.invalidateQueries();
      successFeedback();
      showToast('Study session logged.', 'success');
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      title="Log study time"
      subtitle="Count the time you actually studied. Partial sessions are still real."
      onClose={onClose}
    >
      <View style={styles.group}>
        <AppText variant="smallStrong">Subject</AppText>
        <View style={styles.wrap}>
          {subjects.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              size="sm"
              selected={subjectId === subject.id}
              onPress={() => setSubjectId(subject.id)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <AppText variant="smallStrong">Kind</AppText>
        <View style={styles.wrap}>
          {KINDS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              size="sm"
              selected={kind === item.value}
              onPress={() => setKind(item.value)}
            />
          ))}
        </View>
      </View>
      <TextField
        label="Minutes"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        placeholder="30"
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="What did you cover? What felt unclear?"
        multiline
      />
      <Button label="Save session" onPress={save} loading={saving} fullWidth />
      <AppText variant="caption" color={theme.colors.textFaint}>
        Logging a session does not automatically complete your routine goal. You choose what
        counts.
      </AppText>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
