
import type { LLMConfig, ChunkingConfig } from '../types';

export interface ProcessingRequest {
  prompts: Record<string, string>;
  normalize_text: boolean;
  order_mode: "chunk" | "prompt";
  llm_config: LLMConfig;
  chunking_config: ChunkingConfig;
}

export const startProcessingJob = async (files: File[], config: ProcessingRequest): Promise<string> => {
  const formData = new FormData();
  formData.append('request_str', JSON.stringify(config));
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // Try to parse JSON, otherwise fall back to raw text (e.g., HTML error pages like 413/502)
    let message = 'Failed to start processing job.';
    try {
      const asJson = await response.json();
      message = asJson.detail || message;
    } catch {
      try {
        const asText = await response.text();
        message = asText || message;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }

  const result = await response.json();
  return result.job_id;
};

export interface JobStatusResponse {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    detail?: string;
    data?: Blob;
}

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
    const response = await fetch(`/api/results/${jobId}`);

    if (response.headers.get('content-disposition')) {
        return { status: 'completed', data: await response.blob() };
    }
    
    if (!response.ok) {
        let message = 'Failed to get job status.';
        try {
            const asJson = await response.json();
            message = asJson.detail || message;
        } catch {
            try {
                const asText = await response.text();
                message = asText || message;
            } catch {
                // ignore
            }
        }
        throw new Error(message);
    }

    return response.json();
};
