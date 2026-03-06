import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useGenerationStore } from "./store/generationStore";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Loader2, Save, Terminal, Image as ImageIcon, Zap, Sparkles } from "lucide-react";

const isTauri = '__TAURI_INTERNALS__' in window;

function App() {
  const {
    apiKey, setApiKey,
    nvidiaApiKey, setNvidiaApiKey,
    aiModel, setAiModel,
    prompt, setPrompt,
    isGenerating, setIsGenerating,
    isRefining, setIsRefining,
    generatedAssetBase64, setGeneratedAsset,
    error, setError
  } = useGenerationStore();

  const handleRefinePrompt = async () => {
    if (!nvidiaApiKey) {
      setError("SYSTEM: NV_API KEY REQUIRED FOR PROMPT REFINEMENT");
      return;
    }
    if (!prompt) {
      setError("SYSTEM: NO PROMPT DETECTED IN QUEUE");
      return;
    }

    setIsRefining(true);
    setError(null);
    try {
      if (isTauri) {
        const refinedPrompt: string = await invoke("refine_prompt", { prompt, apiKey: nvidiaApiKey });
        setPrompt(refinedPrompt);
      } else {
        const url = "/api/nvidia-chat/v1/chat/completions";
        const requestBody = {
          model: "mistralai/mistral-7b-instruct-v0.3",
          messages: [
            { role: "system", content: "You are an expert prompt engineer for AI image generation. Enhance the user's short idea into a highly detailed, descriptive image prompt in English. Keep it under 50 words." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: false
        };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Authorization": `Bearer ${nvidiaApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        if (!res.ok) throw new Error(`Mistral API request failed: ${res.status}`);
        const data = await res.json();
        const refinedPrompt = data.choices?.[0]?.message?.content || "";
        setPrompt(refinedPrompt);
      }
    } catch (err: any) {
      setError(`CRITICAL ERROR (MISTRAL): ${err.message || err}`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (aiModel === 'gemini' && !apiKey) {
      setError("SYSTEM: INVALID OR MISSING GEMINI API KEY");
      return;
    }
    if (aiModel === 'sd35' && !nvidiaApiKey) {
      setError("SYSTEM: INVALID OR MISSING NVIDIA API KEY");
      return;
    }
    if (!prompt) {
      setError("SYSTEM: NO PROMPT DETECTED IN QUEUE");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAsset(null);

    try {
      let base64Data: string = "";
      if (isTauri) {
        if (aiModel === 'gemini') {
          base64Data = await invoke("generate_asset", { prompt, apiKey });
        } else {
          base64Data = await invoke("generate_asset_sd", { prompt, apiKey: nvidiaApiKey });
        }
      } else {
        if (aiModel === 'gemini') {
          const url = `/api/gemini/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const requestBody = {
            contents: [{ role: "user", parts: [{ text: `Generate a high quality pro-level video game asset based on this description. Output only a base64 encoded image string if possible, or describe it detailed: ${prompt}` }] }],
            generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, candidateCount: 1 }
          };
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
          if (!res.ok) throw new Error(`Gemini API failed: ${res.status}`);
          const data = await res.json();
          base64Data = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          const url = "/api/nvidia-sd/v1/images/generations";
          const requestBody = {
            model: "stabilityai/stable-diffusion-3.5-large",
            prompt,
            cfg_scale: 5,
            aspect_ratio: "1:1",
            seed: 0,
            steps: 40,
            negative_prompt: ""
          };
          const res = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${nvidiaApiKey}`, "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          });
          if (!res.ok) throw new Error(`SD3.5 API failed: ${res.status}`);
          const data = await res.json();
          base64Data = data.image || data.data?.[0]?.b64_json || "";
        }
      }
      setGeneratedAsset(base64Data);
    } catch (err: any) {
      setError(`CRITICAL ERROR: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAssetBase64) return;

    try {
      if (isTauri) {
        const filePath = await save({
          filters: [{
            name: 'Image',
            extensions: ['png', 'jpg']
          }]
        });

        if (filePath) {
          await invoke("save_asset", { base64Data: generatedAssetBase64, path: filePath });
        }
      } else {
        const link = document.createElement("a");
        const dataUri = generatedAssetBase64.startsWith("data:") ? generatedAssetBase64 : `data:image/png;base64,${generatedAssetBase64}`;
        link.href = dataUri;
        link.download = `nanobanana-asset-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setError(`SYS_ERROR: FILESYSTEM WRITE FAILED - ${err.message || err}`);
    }
  };

  const formattedImageSrc = generatedAssetBase64
    ? (generatedAssetBase64.startsWith('data:')
      ? generatedAssetBase64
      : `data:image/png;base64,${generatedAssetBase64}`)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center relative overflow-hidden selection:bg-primary/30 font-sans">

      {/* Background Decorators */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Warning if running in browser */}
      {!isTauri && (
        <div className="absolute top-0 left-0 w-full bg-secondary/80 text-secondary-foreground font-display text-xs font-bold tracking-widest uppercase py-3 px-4 text-center flex items-center justify-center gap-2 z-50 border-b border-primary/20 backdrop-blur-sm">
          <Terminal className="h-4 w-4 text-primary" />
          SYSTEM INFO: RUNNING IN WEB BROWSER FALLBACK MODE. NATIVE LOCAL FILE SYSTEM DISABLED.
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-6xl mb-12 flex items-center justify-between border-b-2 border-primary/20 pb-4 relative z-10 mt-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary flex items-center justify-center transform -skew-x-12 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <Terminal className="text-primary-foreground h-6 w-6 transform skew-x-12" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl uppercase tracking-[0.15em] text-primary">
              Nano Banana
            </h1>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Asset Generator Module v0.2
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="w-full max-w-6xl grid lg:grid-cols-12 gap-8 relative z-10">

        {/* Left Column (Controls) */}
        <div className="lg:col-span-5 flex flex-col gap-8">

          <Card className="bg-card border-l-4 border-l-primary shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Zap className="w-24 h-24" />
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="font-display uppercase tracking-[0.1em] text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                System Config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiModel === 'gemini' ? 'bg-primary' : 'bg-muted'}`}></div>
                  Gemini API Key
                </label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`font-mono bg-background focus-[&_input]:ring-primary/50 !border-muted rounded-none ${aiModel === 'gemini' ? 'opacity-100' : 'opacity-50'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiModel === 'sd35' ? 'bg-primary' : 'bg-muted'}`}></div>
                  NVIDIA API Key (Mistral & SD3.5)
                </label>
                <Input
                  type="password"
                  placeholder="nvapi-..."
                  value={nvidiaApiKey}
                  onChange={(e) => setNvidiaApiKey(e.target.value)}
                  className={`font-mono bg-background focus-[&_input]:ring-primary/50 !border-muted rounded-none ${aiModel === 'sd35' ? 'opacity-100' : 'opacity-50'}`}
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">Synthesizer Core</label>
                <div className="flex gap-2">
                  <Button
                    variant={aiModel === 'gemini' ? "default" : "outline"}
                    className={`flex-1 font-display text-xs uppercase tracking-widest rounded-none ${aiModel === 'gemini' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-muted'}`}
                    onClick={() => setAiModel('gemini')}
                  >
                    Nano Banana
                  </Button>
                  <Button
                    variant={aiModel === 'sd35' ? "default" : "outline"}
                    className={`flex-1 font-display text-xs uppercase tracking-widest rounded-none ${aiModel === 'sd35' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border-muted'}`}
                    onClick={() => setAiModel('sd35')}
                  >
                    SD 3.5 Large
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-2xl flex-1 flex flex-col border border-border/50">
            <CardHeader className="pb-4 bg-secondary/30 border-b border-border/50">
              <CardTitle className="font-display uppercase tracking-[0.1em] text-white">
                Synthesis Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-6 space-y-6">

              <div className="space-y-2 relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-display uppercase tracking-wider text-muted-foreground">Asset Specifications</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefinePrompt}
                    disabled={isRefining || !prompt}
                    className="h-6 text-[10px] font-display uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 px-2"
                  >
                    {isRefining ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Refiner (Mistral)
                  </Button>
                </div>

                <textarea
                  placeholder="Describe the asset. e.g. An isometric clay golem figurine, highly detailed, dramatic studio lighting..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-32 p-3 font-mono text-sm bg-background border border-muted focus:outline-none focus:ring-1 focus:ring-primary rounded-sm resize-none custom-scrollbar"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono uppercase tracking-wide flex items-start gap-2">
                  <span className="mt-0.5">!</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isRefining}
                className="w-full h-14 font-display font-bold uppercase tracking-[0.15em] bg-primary hover:bg-primary/90 text-primary-foreground rounded-none relative group overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-full transition-transform duration-700 ease-out" />

                {isGenerating ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Synthesizing...
                  </span>
                ) : (
                  "Initiate Synthesis"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Preview) */}
        <div className="lg:col-span-7 flex flex-col min-h-[500px]">
          <Card className="bg-card w-full h-full flex flex-col border border-border/50 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4 bg-secondary/30 border-b border-border/50">
              <CardTitle className="font-display uppercase tracking-[0.1em] text-white">
                Visual Output
              </CardTitle>
              {formattedImageSrc && (
                <Button
                  onClick={handleSave}
                  variant="outline"
                  size="sm"
                  className="font-display text-xs uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10 hover:text-primary h-8"
                >
                  <Save className="h-3 w-3 mr-2" />
                  Save to Disk
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-0 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]">

              {isGenerating ? (
                <div className="flex flex-col items-center gap-4 text-primary">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="font-display uppercase tracking-widest text-sm animate-pulse">Processing Data...</p>
                </div>
              ) : formattedImageSrc ? (
                <div className="p-8 w-full h-full flex items-center justify-center">
                  <img
                    src={formattedImageSrc}
                    alt="Generated Asset"
                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_20px_rgba(234,179,8,0.15)] border border-primary/20 pointer-events-none"
                  />
                </div>
              ) : (
                <div className="text-center flex flex-col items-center opacity-50">
                  <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground" />
                  <p className="font-display uppercase tracking-widest text-muted-foreground text-sm">System Idle</p>
                  <p className="font-mono text-xs text-muted-foreground mt-2">Awaiting synthesis parameters.</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default App;
