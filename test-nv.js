const key = "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";

const tests = [
    {
        url: "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium",
        body: { prompt: "a tiny cat", cfg_scale: 5, aspect_ratio: "1:1", seed: 0, steps: 40, negative_prompt: "" }
    }
];

async function run() {
    for (const t of tests) {
        try {
            console.log(`Testing ${t.url}...`);
            const res = await fetch(t.url, {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(t.body)
            });
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                console.log("SUCCESS!");
            }
        } catch (e) { console.error(e); }
    }
}
run();
