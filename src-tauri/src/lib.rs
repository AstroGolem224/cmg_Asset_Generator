use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct GenerationConfig {
    pub temperature: f32,
    pub top_k: u32,
    pub top_p: f32,
    pub candidate_count: u32,
}

#[derive(Serialize, Deserialize)]
pub struct PromptPart {
    pub text: String,
}

#[derive(Serialize, Deserialize)]
pub struct Content {
    pub role: String,
    pub parts: Vec<PromptPart>,
}

#[derive(Serialize, Deserialize)]
pub struct GenerateContentRequest {
    pub contents: Vec<Content>,
    pub generation_config: GenerationConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiResponse {
    pub candidates: Option<Vec<Candidate>>,
    pub error: Option<GeminiError>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Candidate {
    pub content: Option<CandidateContent>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CandidateContent {
    pub parts: Vec<CandidatePart>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CandidatePart {
    pub text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiError {
    pub message: String,
}

#[tauri::command]
async fn generate_asset(prompt: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        api_key
    );

    let request_body = GenerateContentRequest {
        contents: vec![Content {
            role: "user".to_string(),
            parts: vec![PromptPart {
                text: format!("Generate a high quality pro-level video game asset based on this description. Output only a base64 encoded image string if possible, or describe it detailed: {}", prompt),
            }],
        }],
        generation_config: GenerationConfig {
            temperature: 0.7,
            top_k: 40,
            top_p: 0.95,
            candidate_count: 1,
        },
    };

    let res = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("API Request failed with status: {}", res.status()));
    }

    let result: GeminiResponse = res.json().await.map_err(|e| e.to_string())?;

    if let Some(error) = result.error {
        return Err(error.message);
    }

    if let Some(candidates) = result.candidates {
        if let Some(first) = candidates.first() {
            if let Some(content) = &first.content {
                if let Some(part) = content.parts.first() {
                    if let Some(text) = &part.text {
                        return Ok(text.clone());
                    }
                }
            }
        }
    }

    Err("Failed to parse image from response".to_string())
}
use base64::prelude::*;

// NVIDIA Mistral API Structs
#[derive(Serialize)]
pub struct MistralMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct MistralRequest {
    pub model: String,
    pub messages: Vec<MistralMessage>,
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
    pub stream: bool,
}

#[derive(Deserialize)]
pub struct MistralResponse {
    pub choices: Option<Vec<MistralChoice>>,
}

#[derive(Deserialize)]
pub struct MistralChoice {
    pub message: Option<MistralMessageParams>,
}

#[derive(Deserialize)]
pub struct MistralMessageParams {
    pub content: Option<String>,
}

#[tauri::command]
async fn refine_prompt(prompt: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = "https://integrate.api.nvidia.com/v1/chat/completions";

    let request_body = MistralRequest {
        model: "mistralai/mistral-7b-instruct-v0.3".to_string(),
        messages: vec![
            MistralMessage {
                role: "system".to_string(),
                content: "You are an expert prompt engineer for AI image generation. Enhance the user's short idea into a highly detailed, descriptive image prompt in English. Keep it under 50 words.".to_string(),
            },
            MistralMessage {
                role: "user".to_string(),
                content: prompt,
            }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false,
    };

    let res = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Mistral API request failed: {} - {}", res.status(), err_text));
    }

    let result: MistralResponse = res.json().await.map_err(|e| e.to_string())?;

    if let Some(choices) = result.choices {
        if let Some(first) = choices.first() {
            if let Some(message) = &first.message {
                if let Some(content) = &message.content {
                    return Ok(content.clone());
                }
            }
        }
    }

    Err("Failed to parse Mistral response".to_string())
}

#[tauri::command]
async fn generate_asset_sd(prompt: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3.5-large";

    let request_body = serde_json::json!({
        "prompt": prompt,
        "cfg_scale": 5,
        "aspect_ratio": "1:1",
        "seed": 0,
        "steps": 40,
        "negative_prompt": ""
    });

    let res = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("SD3.5 API API request failed: {}", err_text));
    }

    let result: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    // Attempt to extract the image
    if let Some(image_b64) = result.get("image").and_then(|v| v.as_str()) {
        return Ok(image_b64.to_string());
    }
    
    if let Some(data) = result.get("data").and_then(|v| v.as_array()) {
        if let Some(first) = data.first() {
            if let Some(b64_json) = first.get("b64_json").and_then(|v| v.as_str()) {
                return Ok(b64_json.to_string());
            }
        }
    }

    Err("Failed to parse SD3.5 response or missing image data".to_string())
}

#[tauri::command]
async fn save_asset(base64_data: String, path: String) -> Result<(), String> {
    let data = if base64_data.contains(',') {
        base64_data.split(',').last().unwrap_or("").to_string()
    } else {
        base64_data
    };

    let decoded = BASE64_STANDARD.decode(&data).map_err(|e| e.to_string())?;
    std::fs::write(&path, decoded).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            generate_asset, 
            generate_asset_sd,
            refine_prompt,
            save_asset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
