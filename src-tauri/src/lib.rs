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

#[tauri::command]
async fn save_asset(base64_data: String, path: String) -> Result<(), String> {
    // Strip data URI prefix if present (e.g., "data:image/png;base64,")
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
        .invoke_handler(tauri::generate_handler![generate_asset, save_asset])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
