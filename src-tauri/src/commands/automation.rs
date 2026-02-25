use crate::features::automation::{self, AutomationRunRecord, AutomationSchedule, AutomationTask};
use crate::cc::CCState;
use crate::codex::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_automations(
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<Vec<AutomationTask>, String> {
    automation::list_automations(Some(state.codex.clone()), Some(cc_state.inner().clone())).await
}

#[tauri::command]
pub async fn list_automation_runs(
    task_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AutomationRunRecord>, String> {
    automation::list_automation_runs(task_id, limit).await
}

#[tauri::command]
pub async fn create_automation(
    name: String,
    projects: Vec<String>,
    prompt: String,
    schedule: AutomationSchedule,
    agent: Option<String>,
    model_provider: Option<String>,
    model: Option<String>,
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<AutomationTask, String> {
    automation::create_automation(
        name,
        projects,
        prompt,
        schedule,
        agent,
        model_provider,
        model,
        Some(state.codex.clone()),
        Some(cc_state.inner().clone()),
    )
        .await
}

#[tauri::command]
pub async fn update_automation(
    id: String,
    name: String,
    projects: Vec<String>,
    prompt: String,
    schedule: AutomationSchedule,
    agent: Option<String>,
    model_provider: Option<String>,
    model: Option<String>,
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<AutomationTask, String> {
    automation::update_automation(
        id,
        name,
        projects,
        prompt,
        schedule,
        agent,
        model_provider,
        model,
        Some(state.codex.clone()),
        Some(cc_state.inner().clone()),
    )
    .await
}

#[tauri::command]
pub async fn set_automation_paused(
    id: String,
    paused: bool,
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<AutomationTask, String> {
    automation::set_automation_paused(
        id,
        paused,
        Some(state.codex.clone()),
        Some(cc_state.inner().clone()),
    )
    .await
}

#[tauri::command]
pub async fn delete_automation(
    id: String,
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<(), String> {
    automation::delete_automation(id, Some(state.codex.clone()), Some(cc_state.inner().clone()))
        .await
}

#[tauri::command]
pub async fn run_automation_now(
    id: String,
    state: State<'_, AppState>,
    cc_state: State<'_, CCState>,
) -> Result<(), String> {
    automation::run_automation_now(id, Some(state.codex.clone()), Some(cc_state.inner().clone()))
        .await
}
