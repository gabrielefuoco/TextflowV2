import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './Card';
import { ConfigIcon } from './icons';

export const ConfigPanel = () => {
    const { 
        llmConfig, 
        chunkingConfig, 
        normalizeText,
        orderMode,
        setLlmConfig, 
        setChunkingConfig,
        setNormalizeText,
        setOrderMode
    } = useAppStore();

    return (
        <Card title="Configuration" icon={<ConfigIcon />}>
            <div className="flex flex-col lg:flex-row gap-6">
                {/* LLM Settings Panel */}
                <div className="flex-1 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">LLM Settings</h3>
                    <div>
                        <label htmlFor="model_name" className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
                        <input
                            type="text"
                            id="model_name"
                            value={llmConfig.model_name}
                            onChange={(e) => setLlmConfig({ model_name: e.target.value })}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                        />
                    </div>
                </div>

                {/* Processing Settings Panel */}
                <fieldset className="flex-1 bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <legend className="text-lg font-semibold text-slate-800 mb-6">Processing Settings</legend>
                    <div className="space-y-6">
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
                                <input
                                    type="number"
                                    id="max_words"
                                    value={chunkingConfig.max_words}
                                    onChange={(e) => setChunkingConfig({ max_words: parseInt(e.target.value, 10) })}
                                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label htmlFor="min_words" className="block text-sm font-medium text-slate-700 mb-1">Min Words</label>
                                <input
                                    type="number"
                                    id="min_words"
                                    value={chunkingConfig.min_words}
                                    onChange={(e) => setChunkingConfig({ min_words: parseInt(e.target.value, 10) })}
                                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="order_mode" className="block text-sm font-medium text-slate-700 mb-1">Output Order</label>
                            <select
                                id="order_mode"
                                value={orderMode}
                                onChange={(e) => setOrderMode(e.target.value as "chunk" | "prompt")}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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