import { describe, expect, test } from 'vitest';

import { categoryIcon, formatDate, ownerName, toIso } from './utils';

describe('forum utils (migration React CCTP 51C)', () => {
  test('toIso extrait la date de `{$date}` ou d’une chaîne', () => {
    expect(toIso({ $date: '2026-07-03T10:00:00Z' })).toBe('2026-07-03T10:00:00Z');
    expect(toIso('2026-07-03')).toBe('2026-07-03');
    expect(toIso(undefined)).toBeUndefined();
  });

  test('formatDate → jj/mm/aaaa (fr), vide si invalide', () => {
    expect(formatDate({ $date: '2026-07-03T10:00:00Z' })).toMatch(/^\d{2}\/\d{2}\/2026$/);
    expect(formatDate('2026-07-03')).toMatch(/^\d{2}\/\d{2}\/2026$/);
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('pas une date')).toBe('');
  });

  test('ownerName avec repli', () => {
    expect(ownerName({ displayName: 'A. Dupont' })).toBe('A. Dupont');
    expect(ownerName(undefined)).toBe('');
  });

  test('categoryIcon repli neutre', () => {
    expect(categoryIcon('star')).toBe('star');
    expect(categoryIcon('')).toBe('forum');
    expect(categoryIcon(undefined)).toBe('forum');
  });
});
