use std::path::PathBuf;

use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse, InterruptConversationParams,
    InterruptConversationResponse, NewConversationParams, NewConversationResponse,
    ResumeConversationParams, ResumeConversationResponse, SendUserMessageParams,
    SendUserMessageResponse, RemoveConversationListenerParams
};
use codex_protocol::protocol::ReviewDecision;
use log::{error, info, warn};
use tauri::{AppHandle, State};

use crate::state::{AppState, get_client};

#[tauri::command]
pub async fn new_conversation(
    params: NewConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<NewConversationResponse, String> {
    info!("Creating new conversation; params {:?} ", params);
    let client = get_client(&state, &app_handle).await?;
    match client.new_conversation(params, overrides).await {
        Ok(conversation) => {
            info!(
                "New conversation created: {}",
                conversation.conversation_id
            );
            Ok(conversation)
        }
        Err(err) => {
            error!("Failed to create conversation: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn add_conversation_listener(
    params: AddConversationListenerParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<AddConversationSubscriptionResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client.add_conversation_listener(params).await
}

#[tauri::command]
pub async fn remove_conversation_listener(
    params: RemoveConversationListenerParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    client.remove_conversation_listener(params).await.map(|_| ())
}


#[tauri::command]
pub async fn send_user_message(
    params: SendUserMessageParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<SendUserMessageResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    let conversation_id = params.conversation_id.clone();
    let item_count = params.items.len();

    if item_count == 0 {
        warn!(
            "Attempted to send empty item list to conversation {}",
            conversation_id
        );
        return Err("Message items cannot be empty.".to_string());
    }

    info!(
        "Forwarding send_user_message to conversation {} (items={})",
        conversation_id, item_count
    );

    match client.send_user_message(params).await {
        Ok(response) => {
            info!("Message accepted for {}", conversation_id);
            Ok(response)
        }
        Err(err) => {
            error!("Failed to send message to {conversation_id}: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn interrupt_conversation(
    params: InterruptConversationParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<InterruptConversationResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    let conversation_id = params.conversation_id.clone();

    info!("Forwarding interrupt to conversation {}", conversation_id);

    match client.interrupt_conversation(params).await {
        Ok(response) => {
            info!(
                "Conversation {} interrupted ({:?})",
                conversation_id, response.abort_reason
            );
            Ok(response)
        }
        Err(err) => {
            error!("Failed to interrupt {conversation_id}: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn respond_exec_command_request(
    request_token: String,
    decision: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    let parsed = parse_review_decision(&decision)?;
    client
        .respond_exec_command_request(&request_token, parsed)
        .await
}

#[tauri::command]
pub async fn respond_apply_patch_request(
    request_token: String,
    decision: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    let parsed = parse_review_decision(&decision)?;
    client
        .respond_apply_patch_request(&request_token, parsed)
        .await
}

#[tauri::command]
pub async fn resume_conversation(
    params: ResumeConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<ResumeConversationResponse, String> {
    let path = params.path.clone();
    info!("Resuming conversation from {:?} ", path);
    let client = get_client(&state, &app_handle).await?;
    match client.resume_conversation(params, overrides).await {
        Ok(conversation) => {
            Ok(conversation)
        }
        Err(err) => {
            error!("Failed to resume conversation from {:?}: {err}", path);
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        warn!("delete_file invoked with empty path");
        return Err("Path is empty.".to_string());
    }

    info!("Deleting conversation file {}", trimmed);
    let path_buf = PathBuf::from(trimmed);
    tokio::fs::remove_file(path_buf)
        .await
        .map_err(|err| {
            error!("Failed to delete file {trimmed}: {err}");
            format!("Failed to delete file: {err}")
        })
}

#[tauri::command]
pub async fn update_conversation_preview(
    session_path: String,
    new_text: String,
) -> Result<(), String> {
    use tokio::io::{AsyncWriteExt};
    use tokio::fs::File;
    use serde_json::Value;

    info!(
        "Updating conversation message text in {}. New: \"{}\"",
        &session_path, &new_text
    );

    let path_buf = PathBuf::from(&session_path);
    let content = tokio::fs::read_to_string(&path_buf)
        .await
        .map_err(|e| format!("Failed to read file {}: {}", session_path, e))?;

    let mut modified_lines: Vec<String> = Vec::new();
    let mut updated_third_line = false;
    let mut updated_fourth_line = false;

    for (index, line) in content.lines().enumerate() {
        let mut json: Value = serde_json::from_str(line)
            .map_err(|e| format!("Failed to parse JSON from line: {}. Error: {}", line, e))?;

        if index == 2 && !updated_third_line { // Target the third line (0-indexed)
            if let Some(item_type) = json.get("type").and_then(|v| v.as_str()) {
                if item_type == "response_item" {
                    if let Some(payload) = json.get_mut("payload") {
                        if let Some(payload_type) = payload.get("type").and_then(|v| v.as_str()) {
                            if payload_type == "message" {
                                if let Some(role) = payload.get("role").and_then(|v| v.as_str()) {
                                    if role == "user" {
                                        if let Some(content_array) = payload.get_mut("content").and_then(|v| v.as_array_mut()) {
                                            if let Some(first_content_item) = content_array.get_mut(0) {
                                                if let Some(text_type) = first_content_item.get("type").and_then(|v| v.as_str()) {
                                                    if text_type == "input_text" {
                                                        first_content_item["text"] = Value::String(new_text.clone());
                                                        updated_third_line = true;
                                                        info!("Updated message text in session file on line 3.");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if index == 3 && !updated_fourth_line { // Target the fourth line (0-indexed)
            if let Some(item_type) = json.get("type").and_then(|v| v.as_str()) {
                if item_type == "event_msg" {
                    if let Some(payload) = json.get_mut("payload") {
                        if let Some(message_field) = payload.get_mut("message") {
                            if message_field.is_string() {
                                *message_field = Value::String(new_text.clone());
                                updated_fourth_line = true;
                                info!("Updated message text in session file on line 4.");
                            }
                        }
                    }
                }
            }
        }
        modified_lines.push(serde_json::to_string(&json).map_err(|e| format!("Failed to serialize JSON to string: {}", e))?);
    }

    let mut file = File::create(&path_buf)
        .await
        .map_err(|e| format!("Failed to create file {}: {}", session_path, e))?;

    for line in modified_lines {
        file.write_all(line.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to file {}: {}", session_path, e))?;
        file.write_all(b"\n")
            .await
            .map_err(|e| format!("Failed to write newline to file {}: {}", session_path, e))?;
    }

    Ok(())
}

fn parse_review_decision(decision: &str) -> Result<ReviewDecision, String> {
    let normalized = decision.trim().to_lowercase().replace('-', "_");
    match normalized.as_str() {
        "approved" => Ok(ReviewDecision::Approved),
        "approved_for_session" => Ok(ReviewDecision::ApprovedForSession),
        "denied" => Ok(ReviewDecision::Denied),
        "abort" => Ok(ReviewDecision::Abort),
        other => Err(format!("Unsupported review decision: {other}")),
    }
}
