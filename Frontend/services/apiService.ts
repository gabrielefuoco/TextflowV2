import type { LLMConfig, ChunkingConfig } from '../types';
import type { ChunkFile } from '../store/useAppStore';

export const getChunks = async (
    files: File[],
    config: ChunkingConfig,
    normalize: boolean
): Promise<ChunkFile[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('max_words', String(config.max_words));
    formData.append('min_words', String(config.min_words));
    formData.append('normalize_text_flag', String(normalize));

    const response = await fetch('/api/chunk', { method: 'POST', body: formData });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to get chunks from server.' }));
        throw new Error(error.detail);
    }
    const data = await response.json();
    return data.map((item: any) => ({ fileName: item.file_name, chunks: item.chunks }));
};

export const processMultipleFiles = async (
    filesToProcess: ChunkFile[],
    prompts: Record<string, string>,
    llmConfig: LLMConfig,
    orderMode: "chunk" | "prompt"
): Promise<string> => {
    const payload = {
        files_to_process: filesToProcess.map(file => ({
            chunks: file.chunks.filter(c => c.trim().length > 0),
            file_name: file.fileName,
            prompts,
            llm_config: llmConfig,
            order_mode: orderMode,
        }))
    };

    if (payload.files_to_process.every(f => f.chunks.length === 0)) {
        throw new Error("Cannot start processing: all files have empty chunks.");
    }

    const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to start processing job.' }));
        throw new Error(error.detail);
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
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/zip') || contentType.includes('text/markdown')) {
        return { status: 'completed', data: await response.blob() };
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to poll job status.' }));
        throw new Error(error.detail);
    }
    return response.json();
};
