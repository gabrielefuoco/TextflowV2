
export interface LLMConfig {
  model_name: string;
  temperature: number;
}

export interface ChunkingConfig {
  max_words: number;
  min_words: number;
}

export type JobStatus = "idle" | "processing" | "completed" | "failed";
