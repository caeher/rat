import { describe, it, expect } from 'vitest';
import { OPERATOR_PALETTE_ITEMS } from '@/lib/editor/operatorPalette';

describe('operatorPalette', () => {
  it('includes every join variant and core unary operators', () => {
    const ids = OPERATOR_PALETTE_ITEMS.map((item) => item.id);
    expect(ids).toContain('selection');
    expect(ids).toContain('natural_join');
    expect(ids).toContain('theta_join');
    expect(ids).toContain('left_join');
    expect(ids).toContain('right_join');
    expect(ids).toContain('full_join');
    expect(ids).toHaveLength(14);
  });

  it('provides templates with placeholders for each operator', () => {
    for (const item of OPERATOR_PALETTE_ITEMS) {
      expect(item.template.length).toBeGreaterThan(0);
      expect(item.syntaxExample.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});
