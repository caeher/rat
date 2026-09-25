import type { Exercise } from '@/lib/exercises/types';
import { MiniRelationTable } from '@/components/reference/MiniRelationTable';
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import type { TupleValue } from '@/lib/engine/types';

export interface ExerciseDatasetPreviewProps {
  exercise: Exercise;
}

export function ExerciseDatasetPreview({ exercise }: ExerciseDatasetPreviewProps) {
  const snapshot = buildSnapshotForExercise(exercise);
  const names = Object.keys(snapshot.relations).sort();

  return (
    <div className="space-y-4">
      {names.map((name) => {
        const data = snapshot.relations[name];
        const rows = data.tuples.slice(0, 6).map((tuple) => {
          const row: Record<string, TupleValue> = {};
          for (const attr of data.schema.attributes) {
            row[attr.name] = tuple[attr.name] ?? null;
          }
          return row;
        });
        return (
          <MiniRelationTable
            key={name}
            table={{
              title: name,
              columns: data.schema.attributes.map((a) => a.name),
              rows,
            }}
          />
        );
      })}
      {names.length === 0 && (
        <p className="text-[13px] text-[var(--color-ash)]">No relations in this dataset.</p>
      )}
    </div>
  );
}
