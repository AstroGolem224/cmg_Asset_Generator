import { create } from 'zustand';

export type AIModel = 'gemini' | 'sd35';

export interface GenerationState {
    isGenerating: boolean;
    isRefining: boolean;
    prompt: string;
    generatedAssetBase64: string | null;
    error: string | null;
    apiKey: string; // Gemini
    nvidiaApiKey: string; // Nvidia
    aiModel: AIModel;

    setApiKey: (key: string) => void;
    setNvidiaApiKey: (key: string) => void;
    setPrompt: (prompt: string) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    setIsRefining: (isRefining: boolean) => void;
    setGeneratedAsset: (base64: string | null) => void;
    setError: (error: string | null) => void;
    setAiModel: (model: AIModel) => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
    isGenerating: false,
    isRefining: false,
    prompt: '',
    generatedAssetBase64: null,
    error: null,
    apiKey: '',
    nvidiaApiKey: '',
    aiModel: 'gemini',

    setApiKey: (apiKey) => set({ apiKey }),
    setNvidiaApiKey: (nvidiaApiKey) => set({ nvidiaApiKey }),
    setPrompt: (prompt) => set({ prompt }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setIsRefining: (isRefining) => set({ isRefining }),
    setGeneratedAsset: (generatedAssetBase64) => set({ generatedAssetBase64 }),
    setError: (error) => set({ error }),
    setAiModel: (aiModel) => set({ aiModel }),
}));
