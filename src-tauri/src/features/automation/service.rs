use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

use crate::cc::CCState;
use crate::codex::CodexAppServer;
use crate::db::automation_runs;

use super::execution::execute_task;
use super::model::{
    AutomationSchedule, AutomationTask, default_model, normalize_agent, normalize_model_provider,
};
use super::runtime::{get_runtime, save_store, schedule_task};
use super::schedule::schedule_to_cron;
use super::AutomationRunRecord;

/// Trigger an automation task immediately, bypassing its cron schedule.
pub async fn run_automation_now(
    task_id: String,
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<(), String> {
    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let (task, codex_ref, cc_state, event_sink) = {
        let guard = runtime.lock().await;
        let task = guard
            .tasks
            .get(&task_id)
            .cloned()
            .ok_or_else(|| format!("automation '{}' not found", task_id))?;
        (
            task,
            Arc::clone(&guard.codex),
            guard.cc_state.clone(),
            Arc::clone(&guard.event_sink),
        )
    };
    tokio::spawn(async move {
        execute_task(task, codex_ref, cc_state, event_sink).await;
    });
    Ok(())
}

pub async fn list_automation_runs(
    task_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AutomationRunRecord>, String> {
    automation_runs::list_runs(task_id.as_deref(), limit.unwrap_or(100) as usize)
}

pub async fn list_automations(
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<Vec<AutomationTask>, String> {
    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let runtime = runtime.lock().await;
    let mut tasks = runtime.tasks.values().cloned().collect::<Vec<AutomationTask>>();
    tasks.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(tasks)
}

pub async fn create_automation(
    name: String,
    projects: Vec<String>,
    prompt: String,
    schedule: AutomationSchedule,
    agent: Option<String>,
    model_provider: Option<String>,
    model: Option<String>,
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<AutomationTask, String> {
    let normalized_name = name.trim().to_string();
    if normalized_name.is_empty() {
        return Err("name is required".to_string());
    }

    let normalized_prompt = prompt.trim().to_string();
    if normalized_prompt.is_empty() {
        return Err("prompt is required".to_string());
    }

    let normalized_agent = normalize_agent(agent)?;
    let normalized_model_provider = normalize_model_provider(model_provider)?;
    let normalized_model = model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(default_model);

    let cron_expression = schedule_to_cron(&schedule)?;
    let task = AutomationTask {
        id: format!("automation-{}", Uuid::new_v4()),
        name: normalized_name,
        projects: projects
            .into_iter()
            .map(|project| project.trim().to_string())
            .filter(|project| !project.is_empty())
            .collect(),
        prompt: normalized_prompt,
        agent: normalized_agent,
        model: normalized_model,
        model_provider: normalized_model_provider,
        schedule,
        cron_expression,
        created_at: Utc::now().to_rfc3339(),
        paused: false,
    };

    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let mut runtime = runtime.lock().await;
    let job_id = schedule_task(
        &runtime.scheduler,
        Arc::clone(&runtime.codex),
        runtime.cc_state.clone(),
        Arc::clone(&runtime.event_sink),
        &task,
    )
    .await?;
    runtime.job_ids.insert(task.id.clone(), job_id);
    runtime.tasks.insert(task.id.clone(), task.clone());

    save_store(&runtime.storage_path, runtime.tasks.values().cloned()).await?;
    Ok(task)
}

pub async fn update_automation(
    task_id: String,
    name: String,
    projects: Vec<String>,
    prompt: String,
    schedule: AutomationSchedule,
    agent: Option<String>,
    model_provider: Option<String>,
    model: Option<String>,
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<AutomationTask, String> {
    let normalized_name = name.trim().to_string();
    if normalized_name.is_empty() {
        return Err("name is required".to_string());
    }

    let normalized_prompt = prompt.trim().to_string();
    if normalized_prompt.is_empty() {
        return Err("prompt is required".to_string());
    }

    let cron_expression = schedule_to_cron(&schedule)?;
    let normalized_agent = normalize_agent(agent)?;
    let normalized_model_provider = normalize_model_provider(model_provider)?;
    let normalized_model = model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(default_model);

    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let mut runtime = runtime.lock().await;

    let existing = runtime
        .tasks
        .get(&task_id)
        .cloned()
        .ok_or_else(|| format!("automation '{}' not found", task_id))?;

    if let Some(job_id) = runtime.job_ids.remove(&task_id) {
        runtime
            .scheduler
            .remove(&job_id)
            .await
            .map_err(|err| err.to_string())?;
    }

    let updated = AutomationTask {
        id: existing.id,
        name: normalized_name,
        projects: projects
            .into_iter()
            .map(|project| project.trim().to_string())
            .filter(|project| !project.is_empty())
            .collect(),
        prompt: normalized_prompt,
        agent: normalized_agent,
        model: normalized_model,
        model_provider: normalized_model_provider,
        schedule,
        cron_expression,
        created_at: existing.created_at,
        paused: existing.paused,
    };

    if !updated.paused {
        let job_id = schedule_task(
            &runtime.scheduler,
            Arc::clone(&runtime.codex),
            runtime.cc_state.clone(),
            Arc::clone(&runtime.event_sink),
            &updated,
        )
        .await?;
        runtime.job_ids.insert(task_id.clone(), job_id);
    }

    runtime.tasks.insert(task_id, updated.clone());
    save_store(&runtime.storage_path, runtime.tasks.values().cloned()).await?;
    Ok(updated)
}

pub async fn set_automation_paused(
    task_id: String,
    paused: bool,
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<AutomationTask, String> {
    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let mut runtime = runtime.lock().await;

    if !runtime.tasks.contains_key(&task_id) {
        return Err(format!("automation '{}' not found", task_id));
    }

    if paused {
        let job_id = runtime.job_ids.remove(&task_id);
        if let Some(job_id) = job_id {
            runtime
                .scheduler
                .remove(&job_id)
                .await
                .map_err(|err| err.to_string())?;
        }
    } else if !runtime.job_ids.contains_key(&task_id) {
        let task = runtime
            .tasks
            .get(&task_id)
            .cloned()
            .ok_or_else(|| format!("automation '{}' not found", task_id))?;
        let job_id = schedule_task(
            &runtime.scheduler,
            Arc::clone(&runtime.codex),
            runtime.cc_state.clone(),
            Arc::clone(&runtime.event_sink),
            &task,
        )
        .await?;
        runtime.job_ids.insert(task_id.clone(), job_id);
    }

    {
        let task = runtime
            .tasks
            .get_mut(&task_id)
            .ok_or_else(|| format!("automation '{}' not found", task_id))?;
        task.paused = paused;
    }
    let updated = runtime
        .tasks
        .get(&task_id)
        .cloned()
        .ok_or_else(|| format!("automation '{}' not found", task_id))?;

    save_store(&runtime.storage_path, runtime.tasks.values().cloned()).await?;
    Ok(updated)
}

pub async fn delete_automation(
    task_id: String,
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
) -> Result<(), String> {
    let runtime = get_runtime(codex_client, cc_state, None).await?;
    let mut runtime = runtime.lock().await;

    if !runtime.tasks.contains_key(&task_id) {
        return Err(format!("automation '{}' not found", task_id));
    }

    let job_id = runtime.job_ids.remove(&task_id);
    if let Some(job_id) = job_id {
        runtime
            .scheduler
            .remove(&job_id)
            .await
            .map_err(|err| err.to_string())?;
    }
    runtime.tasks.remove(&task_id);
    save_store(&runtime.storage_path, runtime.tasks.values().cloned()).await
}
