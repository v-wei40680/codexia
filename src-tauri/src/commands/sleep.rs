use crate::features::sleep::SleepState;

#[tauri::command]
pub async fn prevent_sleep(
    state: tauri::State<'_, SleepState>,
    conversation_id: Option<String>,
) -> Result<(), String> {
    state.prevent_sleep(conversation_id).await
}

#[tauri::command]
pub async fn allow_sleep(
    state: tauri::State<'_, SleepState>,
    conversation_id: Option<String>,
) -> Result<(), String> {
    state.allow_sleep(conversation_id).await
}
