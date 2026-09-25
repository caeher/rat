import { describe, it, expect } from 'vitest';
import { prepareTemplate, firstPlaceholderSelection } from '@/lib/editor/insertTemplate';

describe('insertTemplate', () => {
  it('expands placeholders and records editable spans', () => {
    const prepared = prepareTemplate('π ${attr1}, ${attr2} ( ${relation} )');
    expect(prepared.text).toBe('π attr1, attr2 ( relation )');
    expect(prepared.placeholders).toHaveLength(3);
    expect(prepared.placeholders[0]).toMatchObject({ name: 'attr1', from: 2, to: 7 });
  });

  it('selects the first placeholder after insertion offset', () => {
    const prepared = prepareTemplate('σ ${predicate} ( R )');
    const selection = firstPlaceholderSelection(10, prepared);
    expect(selection).toEqual({ anchor: 12, head: 21 });
  });
});
