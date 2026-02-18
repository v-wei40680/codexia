use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, OnceCell};
use tokio_cron_scheduler::{Job, JobScheduler};
use uuid::Uuid;

use crate::codex::CodexAppServer;

static AUTOMATION_RUNTIME: OnceCell<Mutex<AutomationRuntime>> = OnceCell::const_new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AutomationScheduleMode {
    Daily,
    Interval,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationSchedule {
    pub mode: AutomationScheduleMode,
    #[serde(default)]
    pub hour: Option<u8>,
    #[serde(default)]
    pub interval_hours: Option<u8>,
    #[serde(default)]
    pub weekdays: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationTask {
    pub id: String,
    pub name: String,
    pub projects: Vec<String>,
    pub prompt: String,
    pub access_mode: String,
    pub schedule: AutomationSchedule,
    pub cron_expression: String,
    pub created_at: String,
    #[serde(default)]
    pub paused: bool,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct AutomationStore {
    tasks: Vec<AutomationTask>,
}

struct AutomationRuntime {
    scheduler: JobScheduler,
    storage_path: PathBuf,
    tasks: HashMap<String, AutomationTask>,
    job_ids: HashMap<String, Uuid>,
    codex: Arc<Mutex<Option<Arc<CodexAppServer>>>>,
}

async fn get_runtime(
    codex_client: Option<Arc<CodexAppServer>>,
) -> Result<&'static Mutex<AutomationRuntime>, String> {
    let runtime = AUTOMATION_RUNTIME
        .get_or_try_init(|| async {
            let storage_path = resolve_storage_path()?;
            let codex = Arc::new(Mutex::new(codex_client.clone()));
            let mut runtime = AutomationRuntime {
                scheduler: JobScheduler::new().await.map_err(|err| err.to_string())?,
                storage_path,
                tasks: HashMap::new(),
                job_ids: HashMap::new(),
                codex: Arc::clone(&codex),
            };

            runtime.scheduler.start().await.map_err(|err| err.to_string())?;

            let store = load_store(&runtime.storage_path).await?;
            for task in store.tasks {
                if !task.paused {
                    if let Ok(job_id) =
                        schedule_task(&runtime.scheduler, Arc::clone(&runtime.codex), &task).await
                    {
                        runtime.job_ids.insert(task.id.clone(), job_id);
                    } else {
                        log::warn!("failed to schedule automation '{}'", task.id);
                    }
                }
                runtime.tasks.insert(task.id.clone(), task);
            }

            Ok::<Mutex<AutomationRuntime>, String>(Mutex::new(runtime))
        })
        .await?;

    if let Some(codex_client) = codex_client {
        let codex_ref = {
            let runtime_guard = runtime.lock().await;
            Arc::clone(&runtime_guard.codex)
        };
        let mut codex_slot = codex_ref.lock().await;
        *codex_slot = Some(codex_client);
    }

    Ok(runtime)
}

fn resolve_storage_path() -> Result<PathBuf, String> {
    let mut base = dirs::home_dir().ok_or_else(|| "failed to resolve home directory".to_string())?;
    base.push(".codexia");
    std::fs::create_dir_all(&base).map_err(|err| err.to_string())?;
    Ok(base.join("automations.json"))
}

async fn load_store(path: &PathBuf) -> Result<AutomationStore, String> {
    if !path.exists() {
        return Ok(AutomationStore::default());
    }
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| err.to_string())?;
    serde_json::from_str::<AutomationStore>(&content).map_err(|err| err.to_string())
}

async fn save_store(path: &PathBuf, tasks: impl Iterator<Item = AutomationTask>) -> Result<(), String> {
    let store = AutomationStore {
        tasks: tasks.collect(),
    };
    let content = serde_json::to_string_pretty(&store).map_err(|err| err.to_string())?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| err.to_string())
}

fn sandbox_policy_workspace_write() -> Value {
    json!({
        "type": "workspaceWrite",
        "writableRoots": [],
        "readOnlyAccess": {
            "type": "fullAccess"
        },
        "networkAccess": false,
        "excludeTmpdirEnvVar": false,
        "excludeSlashTmp": false
    })
}

fn normalize_weekdays(weekdays: &[String]) -> Result<Vec<String>, String> {
    if weekdays.is_empty() {
        return Ok(vec![
            "SUN".to_string(),
            "MON".to_string(),
            "TUE".to_string(),
            "WED".to_string(),
            "THU".to_string(),
            "FRI".to_string(),
            "SAT".to_string(),
        ]);
    }

    weekdays
        .iter()
        .map(|weekday| {
            let normalized = weekday.trim().to_ascii_lowercase();
            let mapped = match normalized.as_str() {
                "sun" | "sunday" => "SUN",
                "mon" | "monday" => "MON",
                "tue" | "tuesday" => "TUE",
                "wed" | "wednesday" => "WED",
                "thu" | "thursday" => "THU",
                "fri" | "friday" => "FRI",
                "sat" | "saturday" => "SAT",
                _ => return Err(format!("invalid weekday '{}'", weekday)),
            };
            Ok(mapped.to_string())
        })
        .collect::<Result<Vec<String>, String>>()
}

fn schedule_to_cron(schedule: &AutomationSchedule) -> Result<String, String> {
    let weekdays = normalize_weekdays(&schedule.weekdays)?.join(",");

    match schedule.mode {
        AutomationScheduleMode::Daily => {
            let hour = schedule.hour.unwrap_or(9);
            if hour > 23 {
                return Err("daily hour must be between 0 and 23".to_string());
            }
            Ok(format!("0 0 {hour} * * {weekdays}"))
        }
        AutomationScheduleMode::Interval => {
            let interval_hours = schedule.interval_hours.unwrap_or(6);
            if interval_hours == 0 || interval_hours > 24 {
                return Err("interval hours must be between 1 and 24".to_string());
            }
            Ok(format!("0 0 0/{interval_hours} * * {weekdays}"))
        }
    }
}

async fn run_task_with_codex(codex: Arc<CodexAppServer>, task: AutomationTask) -> Result<(), String> {
    let targets = if task.projects.is_empty() {
        vec![None]
    } else {
        task.projects
            .iter()
            .map(|project| Some(project.clone()))
            .collect::<Vec<Option<String>>>()
    };

    for target_cwd in targets {
        let start_params = json!({
            "model": Value::Null,
            "modelProvider": "openai",
            "cwd": target_cwd,
            "approvalPolicy": "on-request",
            "sandbox": "workspace-write",
            "config": {
                "model_reasoning_effort": "medium",
                "show_raw_agent_reasoning": true,
                "model_reasoning_summary": "auto",
                "web_search_request": false,
                "view_image_tool": true,
                "features.collaboration_modes": true,
                "features.collab": true
            },
            "personality": "friendly",
            "ephemeral": Value::Null,
            "experimentalRawEvents": true
        });
        let thread_result = codex.send_request("thread/start", start_params).await?;
        let thread_id = thread_result
            .get("thread")
            .and_then(|thread| thread.get("id"))
            .and_then(Value::as_str)
            .ok_or_else(|| "thread/start response missing thread.id".to_string())?;

        let turn_params = json!({
            "threadId": thread_id,
            "input": [
                {
                    "type": "text",
                    "text": task.prompt,
                    "text_elements": []
                }
            ],
            "cwd": target_cwd,
            "approvalPolicy": "on-request",
            "sandboxPolicy": sandbox_policy_workspace_write(),
            "model": Value::Null,
            "effort": "medium",
            "summary": Value::Null,
            "personality": "friendly",
            "outputSchema": Value::Null,
            "collaborationMode": {
                "mode": "default",
                "settings": {
                    "model": Value::Null,
                    "reasoning_effort": "medium",
                    "developer_instructions": Value::Null
                }
            }
        });
        codex.send_request("turn/start", turn_params).await?;
    }

    Ok(())
}

async fn execute_task(task: AutomationTask, codex_ref: Arc<Mutex<Option<Arc<CodexAppServer>>>>) {
    let codex = {
        let guard = codex_ref.lock().await;
        guard.clone()
    };

    let Some(codex) = codex else {
        log::warn!(
            "automation '{}' skipped because codex app-server is not available",
            task.id
        );
        return;
    };

    if let Err(err) = run_task_with_codex(codex, task.clone()).await {
        log::error!("automation '{}' execution failed: {}", task.id, err);
    } else {
        log::info!("automation '{}' executed", task.id);
    }
}

async fn schedule_task(
    scheduler: &JobScheduler,
    codex_ref: Arc<Mutex<Option<Arc<CodexAppServer>>>>,
    task: &AutomationTask,
) -> Result<Uuid, String> {
    let task_for_run = task.clone();
    let job = Job::new_async(task.cron_expression.as_str(), move |_job_id, _scheduler| {
        let codex_ref = Arc::clone(&codex_ref);
        let task = task_for_run.clone();
        Box::pin(async move {
            execute_task(task, codex_ref).await;
        })
    })
    .map_err(|err| err.to_string())?;

    let job_id = job.guid();
    scheduler.add(job).await.map_err(|err| err.to_string())?;
    Ok(job_id)
}

pub async fn initialize_automation_runtime(
    codex_client: Option<Arc<CodexAppServer>>,
) -> Result<(), String> {
    let _ = get_runtime(codex_client).await?;
    Ok(())
}

pub async fn list_automations(
    codex_client: Option<Arc<CodexAppServer>>,
) -> Result<Vec<AutomationTask>, String> {
    let runtime = get_runtime(codex_client).await?;
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
    access_mode: Option<String>,
    codex_client: Option<Arc<CodexAppServer>>,
) -> Result<AutomationTask, String> {
    let normalized_name = name.trim().to_string();
    if normalized_name.is_empty() {
        return Err("name is required".to_string());
    }

    let normalized_prompt = prompt.trim().to_string();
    if normalized_prompt.is_empty() {
        return Err("prompt is required".to_string());
    }

    let normalized_access_mode = access_mode.unwrap_or_else(|| "agent".to_string());
    if normalized_access_mode != "agent" {
        return Err("access mode must be 'agent'".to_string());
    }

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
        access_mode: normalized_access_mode,
        schedule,
        cron_expression,
        created_at: Utc::now().to_rfc3339(),
        paused: false,
    };

    let runtime = get_runtime(codex_client).await?;
    let mut runtime = runtime.lock().await;
    let job_id = schedule_task(&runtime.scheduler, Arc::clone(&runtime.codex), &task).await?;
    runtime.job_ids.insert(task.id.clone(), job_id);
    runtime.tasks.insert(task.id.clone(), task.clone());

    save_store(&runtime.storage_path, runtime.tasks.values().cloned()).await?;
    Ok(task)
}

pub async fn set_automation_paused(
    task_id: String,
    paused: bool,
    codex_client: Option<Arc<CodexAppServer>>,
) -> Result<AutomationTask, String> {
    let runtime = get_runtime(codex_client).await?;
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
        let job_id = schedule_task(&runtime.scheduler, Arc::clone(&runtime.codex), &task).await?;
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
) -> Result<(), String> {
    let runtime = get_runtime(codex_client).await?;
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
