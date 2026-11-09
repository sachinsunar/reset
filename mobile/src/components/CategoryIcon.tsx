import React from 'react';
import { View } from 'react-native';
import {
  Activity,
  BookOpen,
  Code2,
  Dumbbell,
  Moon,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { catColor } from '@/theme';
import type { Category } from '@/types';

export const CATEGORY_META: Record<Category, { label: string; Icon: LucideIcon }> = {
  study: { label: 'Study', Icon: BookOpen },
  fitness: { label: 'Fitness', Icon: Dumbbell },
  career: { label: 'Project', Icon: Code2 },
  sleep: { label: 'Sleep', Icon: Moon },
  personal: { label: 'Personal', Icon: Sparkles },
};

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  footprints: Sparkles,
  sprout: Sparkles,
  'calendar-check': Activity,
  layers: Sparkles,
  'book-open': BookOpen,
  activity: Activity,
  'graduation-cap': Sparkles,
};

interface CategoryIconProps {
  category: Category;
  size?: number;
  boxSize?: number;
}

export function CategoryIcon({ category, size = 16, boxSize = 34 }: CategoryIconProps) {
  const theme = useTheme();
  const meta = CATEGORY_META[category] ?? CATEGORY_META.personal;
  const colors = catColor(category, theme.dark);
  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: boxSize / 2.8,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <meta.Icon size={size} color={colors.fg} strokeWidth={1.9} />
    </View>
  );
}
