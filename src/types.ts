export interface Exercise {
  name: string;
  imageSlug: string;
  duration: number;
  description: string;
}

export interface ExerciseSet {
  name: string;
  slug: string;
  description: string;
  exercises: Exercise[];
}

export interface CompletionRow {
  id: number;
  set_slug: string;
  username: string | null;
  completed_at: string;
}

export interface CompletionData {
  set_slug: string;
  completions: number;
  last_completed_at: string;
}

export interface SetWithCompletions extends ExerciseSet {
  completions: number;
  last_completed_at: string | null;
}

export interface CompletionRequestBody {
  set_slug: string;
  username?: string;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
