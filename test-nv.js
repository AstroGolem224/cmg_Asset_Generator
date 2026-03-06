const key = "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";

const ratios = ["16:9", "21:9", "32:9", "9:16", "1:1"];

async function run() {
    for (const ratio of ratios) {
        try {
            console.log(`Testing aspect ratio: ${ratio}...`);
            const res = await fetch("https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium", {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: "a tiny cat", aspect_ratio: ratio })
            });
            console.log(`Status for ${ratio}: ${res.status}`);
            if (!res.ok) {
                const text = await res.text();
                console.log(`Error: ${text}`);
            }
        } catch (e) { console.error(e); }
    }
}
run();
