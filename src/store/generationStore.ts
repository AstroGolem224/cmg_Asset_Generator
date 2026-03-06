import { create } from 'zustand';

export interface GenerationState {
    isGenerating: boolean;
    prompt: string;
    generatedAssetBase64: string | null;
    error: string | null;
    apiKey: string;
    setApiKey: (key: string) => void;
    setPrompt: (prompt: string) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    setGeneratedAsset: (base64: string | null) => void;
    setError: (error: string | null) => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
    isGenerating: false,
    prompt: '',
    generatedAssetBase64: null,
    error: null,
    apiKey: '',
    setApiKey: (apiKey) => set({ apiKey }),
    setPrompt: (prompt) => set({ prompt }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setGeneratedAsset: (generatedAssetBase64) => set({ generatedAssetBase64 }),
    setError: (error) => set({ error }),
}));
