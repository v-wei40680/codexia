use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse, AuthMode, ClientInfo,
    ConversationSummary, ExecCommandApprovalParams, InitializeParams, InitializeResponse,
    InputItem, InterruptConversationParams, InterruptConversationResponse, ListConversationsResponse,
    NewConversationParams, NewConversationResponse, ResumeConversationParams, ResumeConversationResponse,
    RemoveConversationListenerParams, SendUserMessageParams, SendUserMessageResponse, TurnStartParams,
    TurnStartResponse, GetAccountParams, GetAccountResponse,
    GetAccountRateLimitsResponse, Thread, ThreadListParams, ThreadListResponse,
};
use codex_protocol::protocol::EventMsg;
use std::path::Path;
use ts_rs::TS;

pub fn export_ts_types(out: Option<impl AsRef<Path>>) {
    let out_dir = out
        .as_ref()
        .map(|p| p.as_ref().to_path_buf())
        .unwrap_or_else(|| Path::new(".").join("src").join("bindings"));

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
    TurnStartParams::export_all_to(&out_dir).unwrap();
    TurnStartResponse::export_all_to(&out_dir).unwrap();
    Thread::export_all_to(&out_dir).unwrap();
    ThreadListParams::export_all_to(&out_dir).unwrap();
    ThreadListResponse::export_all_to(&out_dir).unwrap();
    GetAccountParams::export_all_to(&out_dir).unwrap();
    GetAccountResponse::export_all_to(&out_dir).unwrap();
    GetAccountRateLimitsResponse::export_all_to(&out_dir).unwrap();
}
