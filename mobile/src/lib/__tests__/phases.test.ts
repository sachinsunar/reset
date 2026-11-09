import { describe, expect, it } from 'vitest';
import { DEFAULT_BLOCKS, DEFAULT_PHASES } from '@/db/seed';
import type { RoutinePhase, ScheduleBlock } from '@/types';
import { generateGoalSeeds, resolveActivePhase } from '../phases';

const phases: RoutinePhase[] = DEFAULT_PHASES.map((p) => ({
  id: p.id,
  name: p.name,
  objective: p.objective,
  startDate: p.startDate,
  endDate: p.endDate,
  auto: p.auto === 1,
  sortOrder: p.sortOrder,
  color: p.color,
}));

const blocks: ScheduleBlock[] = DEFAULT_BLOCKS.map((block) => ({
  id: block.id,
  phaseId: block.phaseId,
  title: block.title,
  description: block.description ?? '',
  category: block.category as ScheduleBlock['category'],
  startTime: block.startTime,
  endTime: block.endTime,
  days: block.days ?? [0, 1, 2, 3, 4, 5, 6],
  trackable: block.trackable !== false,
  fixed: Boolean(block.fixed),
  kind: block.kind ?? 'core',
  estMinutes: block.estMinutes ?? 0,
  sortOrder: 0,
  active: true,
}));

describe('resolveActivePhase', () => {
  it('follows the date-based phases automatically', () => {
    expect(resolveActivePhase(phases, '2026-11-01', null)?.id).toBe('vacation');
    expect(resolveActivePhase(phases, '2026-11-16', null)?.id).toBe('vacation');
    expect(resolveActivePhase(phases, '2026-11-17', null)?.id).toBe('college');
    expect(resolveActivePhase(phases, '2026-11-24', null)?.id).toBe('college');
    expect(resolveActivePhase(phases, '2026-11-25', null)?.id).toBe('exam');
    expect(resolveActivePhase(phases, '2026-12-10', null)?.id).toBe('exam');
  });

  it('respects an explicit phase override', () => {
    expect(resolveActivePhase(phases, '2026-11-05', 'post-exam')?.id).toBe('post-exam');
    expect(resolveActivePhase(phases, '2026-11-05', 'auto')?.id).toBe('vacation');
  });
});

describe('generateGoalSeeds', () => {
  const vacation = phases.find((p) => p.id === 'vacation')!;

  it('creates the vacation plan and uses the weekly workout', () => {
    const seeds = generateGoalSeeds('2026-11-02', vacation, blocks);
    const titles = seeds.map((s) => s.title);
    expect(titles).toContain('Numerical Method');
    expect(titles).toContain('Operating System');
    expect(titles).toContain('Software Engineering');
    expect(titles).toContain('Easy run or walk');
    expect(titles).toContain('NestJS Project Time');
    expect(seeds.every((s) => s.blockId !== 'v1-lunch')).toBe(true);
  });

  it('only schedules NestJS on the selected days', () => {
    expect(generateGoalSeeds('2026-11-02', vacation, blocks).some((s) => s.title === 'NestJS Project Time')).toBe(true);
    expect(generateGoalSeeds('2026-11-03', vacation, blocks).some((s) => s.title === 'NestJS Project Time')).toBe(false);
    expect(generateGoalSeeds('2026-11-04', vacation, blocks).some((s) => s.title === 'NestJS Project Time')).toBe(true);
  });

  it('treats the Sunday movement as optional rest', () => {
    const seeds = generateGoalSeeds('2026-11-01', vacation, blocks);
    const movement = seeds.find((s) => s.blockId === 'v1-movement');
    expect(movement?.title).toBe('Rest and reset');
    expect(movement?.kind).toBe('optional');
  });

  it('rotates exam subjects and hides career work during exams', () => {
    const exam = phases.find((p) => p.id === 'exam')!;
    const seeds = generateGoalSeeds('2026-11-26', exam, blocks, {
      examSubjects: ['Numerical Method', 'Operating System', 'Software Engineering'],
    });
    expect(seeds.some((s) => s.title.startsWith('Revise '))).toBe(true);
    expect(seeds.some((s) => s.title.startsWith('Practice '))).toBe(true);
    expect(seeds.some((s) => s.category === 'career')).toBe(false);
  });

  it('creates college blocks during the college phase', () => {
    const college = phases.find((p) => p.id === 'college')!;
    const seeds = generateGoalSeeds('2026-11-18', college, blocks);
    expect(seeds.some((s) => s.title === 'College')).toBe(true);
    expect(seeds.some((s) => s.title === 'BCA deep study')).toBe(true);
    expect(seeds.some((s) => s.title === 'NestJS Project Time')).toBe(false);
  });
});
