import type { ExerciseSessionState } from '@/lib/exercises/session';
import { QUIZ_RESULT_FORMAT_VERSION, type QuizProgressRecord } from '@/lib/quiz/types';
import { LEGACY_EXERCISE_PREFIX, LEGACY_QUIZ_PREFIX } from './constants';
import type { MemoryPersistenceBackend } from './memory-backend';
import type { IndexedDbPersistenceBackend } from './idb-backend';

type Backend = MemoryPersistenceBackend | IndexedDbPersistenceBackend;

function readLegacyQuiz(): QuizProgressRecord[] {
  if (typeof window === 'undefined') return [];
  const records: QuizProgressRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LEGACY_QUIZ_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as QuizProgressRecord;
      if (parsed.formatVersion !== QUIZ_RESULT_FORMAT_VERSION) continue;
      records.push(parsed);
    }
  } catch {
    // ignore corrupt legacy data
  }
  return records;
}

function readLegacyExercise(): Record<string, ExerciseSessionState> {
  if (typeof window === 'undefined') return {};
  const map: Record<string, ExerciseSessionState> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(LEGACY_EXERCISE_PREFIX)) continue;
      const exerciseId = key.slice(LEGACY_EXERCISE_PREFIX.length);
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      map[exerciseId] = JSON.parse(raw) as ExerciseSessionState;
    }
  } catch {
    // ignore
  }
  return map;
}

function clearLegacyStores(): void {
  if (typeof window === 'undefined') return;
  try {
    const quizKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_QUIZ_PREFIX)) quizKeys.push(key);
    }
    for (const key of quizKeys) localStorage.removeItem(key);

    const exerciseKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(LEGACY_EXERCISE_PREFIX)) exerciseKeys.push(key);
    }
    for (const key of exerciseKeys) sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** One-time import from pre-#19 localStorage / sessionStorage keys. */
export async function migrateLegacyBrowserStores(backend: Backend): Promise<void> {
  const quiz = readLegacyQuiz();
  const exercise = readLegacyExercise();
  if (quiz.length === 0 && Object.keys(exercise).length === 0) return;

  for (const record of quiz) {
    const existing = await backend.getQuizProgress(record.exerciseId, record.direction);
    if (!existing) {
      await backend.putQuizProgress(record);
    }
  }
  for (const [exerciseId, state] of Object.entries(exercise)) {
    const existing = await backend.getExerciseProgress(exerciseId);
    if (!existing) {
      await backend.putExerciseProgress(exerciseId, state);
    }
  }
  clearLegacyStores();
}
