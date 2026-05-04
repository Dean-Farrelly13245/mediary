import { spacing, radius, iconSize, colors, DEBOUNCE_MS } from '@/lib/theme';

describe('spacing', () => {
  it('has expected scale values', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(24);
    expect(spacing.xxl).toBe(32);
  });
});

describe('radius', () => {
  it('has a full pill value', () => {
    expect(radius.full).toBe(9999);
  });

  it('values increase with scale', () => {
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.lg);
    expect(radius.lg).toBeLessThan(radius.xl);
  });
});

describe('iconSize', () => {
  it('has sm, md, lg sizes', () => {
    expect(iconSize.sm).toBe(16);
    expect(iconSize.md).toBe(20);
    expect(iconSize.lg).toBe(24);
  });
});

describe('colors', () => {
  it('primary is the brand purple', () => {
    expect(colors.primary).toBe('#7B3FF2');
  });

  it('background is dark', () => {
    expect(colors.background).toBe('#0E0E1C');
  });
});

describe('DEBOUNCE_MS', () => {
  it('is a positive number', () => {
    expect(DEBOUNCE_MS).toBeGreaterThan(0);
  });
});
