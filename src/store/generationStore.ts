import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    aspectRatio: string;

    setApiKey: (key: string) => void;
    setNvidiaApiKey: (key: string) => void;
    setPrompt: (prompt: string) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    setIsRefining: (isRefining: boolean) => void;
    setGeneratedAsset: (base64: string | null) => void;
    setError: (error: string | null) => void;
    setAiModel: (model: AIModel) => void;
    setAspectRatio: (ratio: string) => void;
}

export const useGenerationStore = create<GenerationState>()(
    persist(
        (set) => ({
            isGenerating: false,
            isRefining: false,
            prompt: '',
            generatedAssetBase64: null,
            error: null,
            apiKey: '',
            nvidiaApiKey: '',
            aiModel: 'gemini',
            aspectRatio: '1:1',

            setApiKey: (apiKey) => set({ apiKey }),
            setNvidiaApiKey: (nvidiaApiKey) => set({ nvidiaApiKey }),
            setPrompt: (prompt) => set({ prompt }),
            setIsGenerating: (isGenerating) => set({ isGenerating }),
            setIsRefining: (isRefining) => set({ isRefining }),
            setGeneratedAsset: (generatedAssetBase64) => set({ generatedAssetBase64 }),
            setError: (error) => set({ error }),
            setAiModel: (aiModel) => set({ aiModel }),
            setAspectRatio: (aspectRatio) => set({ aspectRatio }),
        }),
        {
            name: 'nanobanana-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({
                apiKey: state.apiKey,
                nvidiaApiKey: state.nvidiaApiKey,
                aiModel: state.aiModel,
                aspectRatio: state.aspectRatio
            }), // only save these fields
        }
    )
);
