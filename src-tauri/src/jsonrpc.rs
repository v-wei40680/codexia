use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RequestId {
    String(String),
    Integer(i64),
}

impl RequestId {
    pub fn as_i64(&self) -> Option<i64> {
        match self {
            RequestId::Integer(value) => Some(*value),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum JsonRpcMessage {
    Request(JsonRpcRequest),
    Notification(JsonRpcNotification),
    Response(JsonRpcResponse),
    Error(JsonRpcErrorMessage),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub id: RequestId,
    pub method: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcNotification {
    pub method: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub id: RequestId,
    pub result: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcErrorMessage {
    pub id: RequestId,
    pub error: JsonRpcError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i64,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum OutgoingJsonRpcMessage {
    Request(JsonRpcRequest),
    Notification(JsonRpcNotification),
    Response(JsonRpcResponse),
}

impl From<RequestId> for serde_json::Value {
    fn from(id: RequestId) -> Self {
        match id {
            RequestId::String(value) => serde_json::Value::String(value),
            RequestId::Integer(value) => serde_json::Value::Number(value.into()),
        }
    }
}
