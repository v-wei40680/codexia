use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse, AuthMode, ClientInfo,
    ConversationSummary, ExecCommandApprovalParams, InitializeParams, InitializeResponse,
    InputItem, InterruptConversationParams, InterruptConversationResponse, ListConversationsResponse,
    NewConversationParams, NewConversationResponse, SendUserMessageParams, SendUserMessageResponse,
    ResumeConversationParams, ResumeConversationResponse, RemoveConversationListenerParams
};
use codex_protocol::protocol::EventMsg;
use std::path::Path;
use ts_rs::TS;

pub fn export_ts_types() {
    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("src")
        .join("bindings");
    std::fs::create_dir_all(&out_dir).unwrap();

    AuthMode::export_all_to(&out_dir).unwrap();
    NewConversationParams::export_all_to(&out_dir).unwrap();
    NewConversationResponse::export_all_to(&out_dir).unwrap();
    ResumeConversationParams::export_all_to(&out_dir).unwrap();
    ResumeConversationResponse::export_all_to(&out_dir).unwrap();
    ConversationSummary::export_all_to(&out_dir).unwrap();
    EventMsg::export_all_to(&out_dir).unwrap();
    InitializeParams::export_all_to(&out_dir).unwrap();
    ClientInfo::export_all_to(&out_dir).unwrap();
    InitializeResponse::export_all_to(&out_dir).unwrap();
    SendUserMessageParams::export_all_to(&out_dir).unwrap();
    SendUserMessageResponse::export_all_to(&out_dir).unwrap();
    ExecCommandApprovalParams::export_all_to(&out_dir).unwrap();
    ListConversationsResponse::export_all_to(&out_dir).unwrap();
    AddConversationListenerParams::export_all_to(&out_dir).unwrap();
    RemoveConversationListenerParams::export_all_to(&out_dir).unwrap();
    AddConversationSubscriptionResponse::export_all_to(&out_dir).unwrap();
    InputItem::export_all_to(&out_dir).unwrap();
    InterruptConversationParams::export_all_to(&out_dir).unwrap();
    InterruptConversationResponse::export_all_to(&out_dir).unwrap();
}
