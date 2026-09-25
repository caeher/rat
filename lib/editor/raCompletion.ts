import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { RelationSchema } from '@/lib/engine/types';
import {
  buildSchemaSuggestions,
  readIdentifierPrefix,
  shouldPreferAttributes,
} from './schemaSuggestions';

export interface RaCompletionConfig {
  getSchemas: () => Record<string, RelationSchema>;
  /** When validation marks the expression incomplete, still offer base-schema fallbacks */
  getIsIncomplete?: () => boolean;
}

function toCompletion(item: {
  label: string;
  insert: string;
  detail: string;
  kind: 'relation' | 'attribute';
}): Completion {
  return {
    label: item.label,
    detail: item.detail,
    type: item.kind === 'relation' ? 'class' : 'property',
    apply: item.insert,
  };
}

export function createRaCompletion(config: RaCompletionConfig): Extension {
  return autocompletion({
    activateOnTyping: true,
    maxRenderedOptions: 24,
    icons: false,
    override: [
      (ctx: CompletionContext): CompletionResult | null => {
        const schemas = config.getSchemas();
        const relationCount = Object.keys(schemas).length;
        if (relationCount === 0) return null;

        const { from, prefix } = readIdentifierPrefix(ctx.state.doc.toString(), ctx.pos);
        const word = ctx.matchBefore(/[\w.]+/);
        const matchFrom = word ? word.from : from;

        if (ctx.explicit === false && prefix.length === 0 && !shouldPreferAttributes(ctx.state.doc.toString(), ctx.pos)) {
          return null;
        }

        const preferAttributes = shouldPreferAttributes(ctx.state.doc.toString(), ctx.pos);
        const suggestions = buildSchemaSuggestions({
          expression: ctx.state.doc.toString(),
          cursorOffset: ctx.pos,
          prefix: prefix || ctx.state.sliceDoc(matchFrom, ctx.pos),
          schemas,
          preferAttributes,
        });

        if (suggestions.length === 0) {
          if (config.getIsIncomplete?.()) {
            return {
              from: matchFrom,
              to: ctx.pos,
              options: [
                {
                  label: 'Keep typing…',
                  detail: 'Incomplete expression',
                  type: 'text',
                },
              ],
            };
          }
          return null;
        }

        return {
          from: matchFrom,
          to: ctx.pos,
          options: suggestions.map(toCompletion),
        };
      },
    ],
  });
}

export function raCompletionKeymapExtension(): Extension {
  return keymap.of([...completionKeymap]);
}
