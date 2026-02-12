use crate::codex::EventSink;
use codex_app_server_protocol::ServerRequest;
use std::sync::Arc;

// Handle server requests (approval requests)
pub async fn handle_server_request(event_sink: &Arc<dyn EventSink>, server_request: ServerRequest) {
    match server_request {
        ServerRequest::CommandExecutionRequestApproval { request_id, params } => {
            if let Ok(mut payload) = serde_json::to_value(params) {
                if let serde_json::Value::Object(ref mut map) = payload {
                    map.insert(
                        "requestId".to_string(),
                        serde_json::to_value(request_id).unwrap_or(serde_json::Value::Null),
                    );
                    map.insert(
                        "type".to_string(),
                        serde_json::Value::String("commandExecution".to_string()),
                    );
                }
                event_sink.emit("codex/approval-request", payload);
            }
        }
        ServerRequest::FileChangeRequestApproval { request_id, params } => {
            if let Ok(mut payload) = serde_json::to_value(params) {
                if let serde_json::Value::Object(ref mut map) = payload {
                    map.insert(
                        "requestId".to_string(),
                        serde_json::to_value(request_id).unwrap_or(serde_json::Value::Null),
                    );
                    map.insert(
                        "type".to_string(),
                        serde_json::Value::String("fileChange".to_string()),
                    );
                }
                event_sink.emit("codex/approval-request", payload);
            }
        }
        ServerRequest::ToolRequestUserInput { request_id, params } => {
            if let Ok(mut payload) = serde_json::to_value(params) {
                if let serde_json::Value::Object(ref mut map) = payload {
                    map.insert(
                        "requestId".to_string(),
                        serde_json::to_value(request_id).unwrap_or(serde_json::Value::Null),
                    );
                    map.insert(
                        "type".to_string(),
                        serde_json::Value::String("requestUserInput".to_string()),
                    );
                }
                event_sink.emit("codex/request-user-input", payload);
            }
        }
        _ => {
            // Ignore unsupported server requests
        }
    }
}
