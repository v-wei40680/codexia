use chrono::Local;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, OnceCell};
use tokio_cron_scheduler::{Job, JobScheduler};
use uuid::Uuid;

use crate::cc::CCState;
use crate::codex::CodexAppServer;
use crate::features::event_sink::EventSink;

use super::execution::execute_task;
use super::model::{AutomationStore, AutomationTask};

static AUTOMATION_RUNTIME: OnceCell<Mutex<AutomationRuntime>> = OnceCell::const_new();

pub(super) struct AutomationRuntime {
    pub(super) scheduler: JobScheduler,
    pub(super) storage_path: PathBuf,
    pub(super) tasks: HashMap<String, AutomationTask>,
    pub(super) job_ids: HashMap<String, Uuid>,
    pub(super) codex: Arc<Mutex<Option<Arc<CodexAppServer>>>>,
    pub(super) cc_state: CCState,
    pub(super) event_sink: Arc<dyn EventSink>,
}

pub(super) async fn get_runtime(
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: Option<CCState>,
    event_sink: Option<Arc<dyn EventSink>>,
) -> Result<&'static Mutex<AutomationRuntime>, String> {
    let runtime = AUTOMATION_RUNTIME
        .get_or_try_init(|| async {
            let storage_path = resolve_storage_path()?;
            let codex = Arc::new(Mutex::new(codex_client.clone()));
            let cc_state = cc_state
                .clone()
                .ok_or_else(|| "cc_state required for first init".to_string())?;
            let sink = event_sink
                .clone()
                .ok_or_else(|| "event_sink required for first init".to_string())?;
            let mut runtime = AutomationRuntime {
                scheduler: JobScheduler::new().await.map_err(|err| err.to_string())?,
                storage_path,
                tasks: HashMap::new(),
                job_ids: HashMap::new(),
                codex: Arc::clone(&codex),
                cc_state: cc_state.clone(),
                event_sink: sink,
            };

            runtime.scheduler.start().await.map_err(|err| err.to_string())?;

            let store = load_store(&runtime.storage_path).await?;
            for task in store.tasks {
                if !task.paused {
                    if let Ok(job_id) = schedule_task(
                        &runtime.scheduler,
                        Arc::clone(&runtime.codex),
                        runtime.cc_state.clone(),
                        Arc::clone(&runtime.event_sink),
                        &task,
                    )
                    .await
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

pub async fn initialize_automation_runtime(
    codex_client: Option<Arc<CodexAppServer>>,
    cc_state: CCState,
    event_sink: Arc<dyn EventSink>,
) -> Result<(), String> {
    let _ = get_runtime(codex_client, Some(cc_state), Some(event_sink)).await?;
    Ok(())
}

pub(super) fn resolve_storage_path() -> Result<PathBuf, String> {
    let mut base = dirs::home_dir().ok_or_else(|| "failed to resolve home directory".to_string())?;
    base.push(".codexia");
    std::fs::create_dir_all(&base).map_err(|err| err.to_string())?;
    Ok(base.join("automations.json"))
}

pub(super) async fn load_store(path: &PathBuf) -> Result<AutomationStore, String> {
    if !path.exists() {
        return Ok(AutomationStore::default());
    }
    let content = tokio::fs::read_to_string(path)
        .await
        .map_err(|err| err.to_string())?;
    serde_json::from_str::<AutomationStore>(&content).map_err(|err| err.to_string())
}

pub(super) async fn save_store(
    path: &PathBuf,
    tasks: impl Iterator<Item = AutomationTask>,
) -> Result<(), String> {
    let store = AutomationStore {
        tasks: tasks.collect(),
    };
    let content = serde_json::to_string_pretty(&store).map_err(|err| err.to_string())?;
    tokio::fs::write(path, content)
        .await
        .map_err(|err| err.to_string())
}

pub(super) async fn schedule_task(
    scheduler: &JobScheduler,
    codex_ref: Arc<Mutex<Option<Arc<CodexAppServer>>>>,
    cc_state: CCState,
    event_sink: Arc<dyn EventSink>,
    task: &AutomationTask,
) -> Result<Uuid, String> {
    let task_for_run = task.clone();
    let job = Job::new_async_tz(task.cron_expression.as_str(), Local, move |_job_id, _scheduler| {
        let codex_ref = Arc::clone(&codex_ref);
        let cc_state = cc_state.clone();
        let event_sink = Arc::clone(&event_sink);
        let task = task_for_run.clone();
        Box::pin(async move {
            execute_task(task, codex_ref, cc_state, event_sink).await;
        })
    })
    .map_err(|err| err.to_string())?;

    let job_id = job.guid();
    scheduler.add(job).await.map_err(|err| err.to_string())?;
    Ok(job_id)
}
