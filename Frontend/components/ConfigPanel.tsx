import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { ConfigIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

export const ConfigPanel = () => {
    const { 
        llmConfig, 
        chunkingConfig, 
        normalizeText,
        orderMode,
        preprocessingOnly,
        setLlmConfig, 
        setChunkingConfig,
        setNormalizeText,
        setOrderMode,
        setPreprocessingOnly
    } = useAppStore();

    return (
        <Card title="Configuration" icon={<ConfigIcon />}>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* LLM Settings Panel */}
                <div className={`flex-1 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6 transition-opacity ${preprocessingOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                    <h3 className="text-lg font-semibold text-slate-800">LLM Settings</h3>
                    <div>
                        <label htmlFor="model_name" className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
                        <input
                            type="text"
                            id="model_name"
                            value={llmConfig.model_name}
                            onChange={(e) => setLlmConfig({ model_name: e.target.value })}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            disabled={preprocessingOnly}
                        />
                    </div>
                    <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-slate-700 mb-1">
                            Temperature: <span className="font-bold text-brand-600">{llmConfig.temperature.toFixed(2)}</span>
                        </label>
                         <input
                            id="temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={llmConfig.temperature}
                            onChange={(e) => setLlmConfig({ temperature: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            disabled={preprocessingOnly}
                        />
                    </div>
                </div>

                {/* Processing Settings Panel */}
                <fieldset className="flex-1 bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <legend className="text-lg font-semibold text-slate-800 mb-6">Processing Settings</legend>
                    <div className="space-y-6">
                        <div className="relative flex items-start p-3 bg-sky-50 border border-sky-200 rounded-lg">
                            <div className="flex items-center h-5">
                                <input
                                    id="preprocessing-only"
                                    name="preprocessing-only"
                                    type="checkbox"
                                    checked={preprocessingOnly}
                                    onChange={(e) => setPreprocessingOnly(e.target.checked)}
                                    className="focus:ring-brand-500 h-4 w-4 bg-white text-brand-600 border-slate-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="preprocessing-only" className="font-medium text-slate-800">
                                    Pre-processing Only Mode
                                </label>
                                <p className="text-slate-600">
                                    Converts and cleans files without using AI prompts. The final output will be the processed Markdown text.
                                </p>
                            </div>
                        </div>

                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="normalize"
                                    name="normalize"
                                    type="checkbox"
                                    checked={normalizeText}
                                    onChange={(e) => setNormalizeText(e.target.checked)}
                                    className="focus:ring-brand-500 h-4 w-4 bg-white text-brand-600 border-slate-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="normalize" className="font-medium text-slate-700">Normalize Text</label>
                                <p className="text-slate-500">Collapse multiple whitespace characters into one.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="max_words" className="block text-sm font-medium text-slate-700 mb-1">Max Words</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id="max_words"
                                        value={chunkingConfig.max_words}
                                        onChange={(e) => setChunkingConfig({ max_words: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full pl-3 pr-10 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-2 flex flex-col justify-center gap-px">
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setChunkingConfig({ max_words: chunkingConfig.max_words + 10 })}
                                            className="h-[14px] w-6 flex items-center justify-center rounded-t-sm bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                                            aria-label="Increase max words"
                                        >
                                            <ChevronUpIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setChunkingConfig({ max_words: Math.max(0, chunkingConfig.max_words - 10) })}
                                            className="h-[14px] w-6 flex items-center justify-center rounded-b-sm bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                                            aria-label="Decrease max words"
                                        >
                                            <ChevronDownIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="min_words" className="block text-sm font-medium text-slate-700 mb-1">Min Words</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id="min_words"
                                        value={chunkingConfig.min_words}
                                        onChange={(e) => setChunkingConfig({ min_words: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full pl-3 pr-10 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-2 flex flex-col justify-center gap-px">
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setChunkingConfig({ min_words: chunkingConfig.min_words + 10 })}
                                            className="h-[14px] w-6 flex items-center justify-center rounded-t-sm bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                                            aria-label="Increase min words"
                                        >
                                            <ChevronUpIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setChunkingConfig({ min_words: Math.max(0, chunkingConfig.min_words - 10) })}
                                            className="h-[14px] w-6 flex items-center justify-center rounded-b-sm bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                                            aria-label="Decrease min words"
                                        >
                                            <ChevronDownIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="order_mode" className="block text-sm font-medium text-slate-700 mb-1">Output Order</label>
                            <select
                                id="order_mode"
                                value={orderMode}
                                onChange={(e) => setOrderMode(e.target.value as "chunk" | "prompt")}
                                className={`w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${preprocessingOnly ? 'opacity-50 pointer-events-none' : ''}`}
                                disabled={preprocessingOnly}
                            >
                                <option value="chunk">By Chunk</option>
                                <option value="prompt">By Prompt</option>
                            </select>
                        </div>
                    </div>
                </fieldset>
            </div>
        </Card>
    );
}