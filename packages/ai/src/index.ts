import { FEATURE_FLAGS } from "@studyverse/shared";

export interface StudyPlanInput {
  subjects: string[];
  hoursPerWeek: number;
  examDate?: string;
}

export interface StudyPlan {
  schedule: { day: string; topics: string[]; durationMinutes: number }[];
  recommendations: string[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Phase 2 stub — requires OPENAI_API_KEY */
export async function generateStudyPlan(_input: StudyPlanInput): Promise<StudyPlan> {
  if (!FEATURE_FLAGS.aiStudyPlanner) {
    throw new Error("AI Study Planner is not enabled yet. Coming in Phase 2.");
  }
  return { schedule: [], recommendations: [] };
}

/** Phase 2 stub — requires OPENAI_API_KEY */
export async function summarizeNotes(_content: string): Promise<string> {
  throw new Error("AI Note Summarization is not enabled yet. Coming in Phase 2.");
}

/** Phase 2 stub — requires OPENAI_API_KEY */
export async function generateFlashcards(_content: string): Promise<Flashcard[]> {
  if (!FEATURE_FLAGS.aiFlashcards) {
    throw new Error("AI Flashcards are not enabled yet. Coming in Phase 2.");
  }
  return [];
}

/** Phase 2 stub — requires OPENAI_API_KEY */
export async function generateQuiz(_content: string): Promise<QuizQuestion[]> {
  throw new Error("AI Quiz Generation is not enabled yet. Coming in Phase 2.");
}

/** Phase 2 stub */
export async function getStudyScheduleRecommendations(_userId: string): Promise<string[]> {
  throw new Error("Study schedule recommendations are not enabled yet. Coming in Phase 2.");
}
