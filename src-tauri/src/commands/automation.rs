use crate::features::automation::{self, AutomationSchedule, AutomationTask};
use crate::codex::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_automations(state: State<'_, AppState>) -> Result<Vec<AutomationTask>, String> {
    automation::list_automations(Some(state.codex.clone())).await
}

#[tauri::command]
pub async fn create_automation(
    name: String,
    projects: Vec<String>,
    prompt: String,
    schedule: AutomationSchedule,
    access_mode: Option<String>,
    state: State<'_, AppState>,
) -> Result<AutomationTask, String> {
    automation::create_automation(name, projects, prompt, schedule, access_mode, Some(state.codex.clone()))
        .await
}

#[tauri::command]
pub async fn set_automation_paused(
    id: String,
    paused: bool,
    state: State<'_, AppState>,
) -> Result<AutomationTask, String> {
    automation::set_automation_paused(id, paused, Some(state.codex.clone())).await
}

#[tauri::command]
pub async fn delete_automation(id: String, state: State<'_, AppState>) -> Result<(), String> {
    automation::delete_automation(id, Some(state.codex.clone())).await
}
