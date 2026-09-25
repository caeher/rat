export interface TemplatePlaceholder {
  /** Inclusive start in the final document text */
  from: number;
  /** Exclusive end in the final document text */
  to: number;
  name: string;
}

export interface PreparedTemplate {
  text: string;
  placeholders: TemplatePlaceholder[];
}

const PLACEHOLDER_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Replaces `${name}` markers with the placeholder name text and records editable spans.
 */
export function prepareTemplate(template: string): PreparedTemplate {
  const placeholders: TemplatePlaceholder[] = [];
  let text = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  PLACEHOLDER_PATTERN.lastIndex = 0;
  while ((match = PLACEHOLDER_PATTERN.exec(template)) !== null) {
    const before = template.slice(lastIndex, match.index);
    text += before;
    const name = match[1]?.trim() ?? 'placeholder';
    const from = text.length;
    text += name;
    placeholders.push({ from, to: text.length, name });
    lastIndex = match.index + match[0].length;
  }
  text += template.slice(lastIndex);

  return { text, placeholders };
}

export function firstPlaceholderSelection(
  insertFrom: number,
  prepared: PreparedTemplate
): { anchor: number; head: number } | null {
  const first = prepared.placeholders[0];
  if (!first) return null;
  return {
    anchor: insertFrom + first.from,
    head: insertFrom + first.to,
  };
}
