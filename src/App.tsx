
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useGenerationStore } from "./store/generationStore";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Loader2, Save } from "lucide-react";

function App() {
  const {
    apiKey, setApiKey,
    prompt, setPrompt,
    isGenerating, setIsGenerating,
    generatedAssetBase64, setGeneratedAsset,
    error, setError
  } = useGenerationStore();

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Please provide a Gemini API Key.");
      return;
    }
    if (!prompt) {
      setError("Please enter a prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAsset(null);

    try {
      const base64Data: string = await invoke("generate_asset", { prompt, apiKey });
      setGeneratedAsset(base64Data);
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAssetBase64) return;

    try {
      const filePath = await save({
        filters: [{
          name: 'Image',
          extensions: ['png', 'jpg']
        }]
      });

      if (filePath) {
        await invoke("save_asset", { base64Data: generatedAssetBase64, path: filePath });
        // Optional alert or toast on success here
      }
    } catch (err: any) {
      setError(`Fehler beim Speichern: ${err}`);
    }
  };

  const formattedImageSrc = generatedAssetBase64
    ? (generatedAssetBase64.startsWith('data:')
      ? generatedAssetBase64
      : `data:image/png;base64,${generatedAssetBase64}`)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 flex flex-col items-center font-sans">
      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-8 mt-4 tracking-tight drop-shadow-md">
        Nano Banana Asset Generator
      </h1>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-slate-900/50 backdrop-blur-md border-slate-800 shadow-xl text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
              <CardDescription className="text-slate-400">Settings & API Key for Gemini 3.1 Flash</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300">Google Gemini API Key</label>
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1.5 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-md border-slate-800 shadow-xl text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Generate Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300">Asset Prompt</label>
                  <Input
                    placeholder="A glowing health potion in isometric pixel art style..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-1.5 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-950/40 border border-red-800/50 text-red-300 rounded-md text-sm backdrop-blur-sm">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-slate-950 font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating in Nano-Time...
                  </>
                ) : (
                  "Generate Asset"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="bg-slate-900/50 backdrop-blur-md border-slate-800 shadow-xl text-slate-100 flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center p-6 relative overflow-hidden bg-slate-950/30 rounded-md mx-6 mb-6 mt-2 border border-slate-800/50">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center text-slate-400 animate-pulse">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-orange-400" />
                <p className="text-sm font-medium tracking-wide">Synthesizing pixels...</p>
              </div>
            ) : formattedImageSrc ? (
              <img
                src={formattedImageSrc}
                alt="Generated Asset"
                className="max-w-full max-h-full object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.15)] rounded-sm"
              />
            ) : (
              <div className="text-slate-600 text-center flex flex-col items-center">
                <div className="w-16 h-16 mb-4 rounded-xl border border-dashed border-slate-700 flex items-center justify-center bg-slate-900/50">
                  <span className="text-slate-700 text-xs font-mono">IMG</span>
                </div>
                <p className="text-sm font-medium text-slate-400">No asset generated yet.</p>
                <p className="text-xs mt-1">Enter a prompt and hit generate to see magic.</p>
              </div>
            )}
          </CardContent>
          {formattedImageSrc && (
            <CardFooter className="pt-0 pb-6 px-6">
              <Button
                onClick={handleSave}
                variant="secondary"
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 shadow-md transition-colors"
              >
                <Save className="h-4 w-4 mr-2 text-slate-400" />
                Save Asset to Disk
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default App;
