
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../store/useAppStore';

export const ResultDisplay = () => {
    const { results, jobStatus } = useAppStore();
    const [content, setContent] = useState<string | null>(null);
    const [isMarkdown, setIsMarkdown] = useState(false);
    const [isZip, setIsZip] = useState(false);

    useEffect(() => {
        if (results) {
            if (results.type.includes('zip')) {
                setIsZip(true);
                setIsMarkdown(false);
                setContent(null);
            } else if (results.type.includes('markdown') || results.type === 'text/plain') {
                results.text().then(text => {
                    setContent(text);
                    setIsMarkdown(true);
                    setIsZip(false);
                });
            } else {
                // Unsupported type
                setContent(`Unsupported result format: ${results.type}`);
                setIsMarkdown(false);
                setIsZip(false);
            }
        } else {
            setContent(null);
            setIsMarkdown(false);
            setIsZip(false);
        }
    }, [results]);

    if (jobStatus !== 'completed' || !results) {
        return null;
    }

    return (
        <div className="space-y-8 mt-10">
            <h2 className="text-3xl font-bold text-center text-slate-800">Results</h2>
            <div className="bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800">Processing Complete</h3>
                    <p className="text-sm text-slate-500">
                        Your file is ready.
                    </p>
                </div>
                <div className="p-6">
                    {isZip && (
                        <div className="text-center">
                            <p className="mb-4 text-slate-600">Your documents have been processed and are available as a ZIP archive.</p>
                            <a 
                                href={URL.createObjectURL(results)} 
                                download="processed_documents.zip"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-brand-700 transition-colors transform hover:scale-105"
                            >
                                Download Results (.zip)
                            </a>
                        </div>
                    )}
                    {isMarkdown && content && (
                        <div className="prose max-w-none prose-slate">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </div>
                    )}
                    {!isZip && !isMarkdown && content && (
                        <p className="text-red-600">{content}</p>
                    )}
                </div>
            </div>
        </div>
    );
};