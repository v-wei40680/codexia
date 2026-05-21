mod execution;
mod model;
mod runtime;
mod schedule;
mod service;

pub use crate::db::automation_runs::AutomationRunRecord;
pub use model::{AutomationSchedule, AutomationTask};
pub use runtime::initialize_automation_runtime;
pub use service::{
    create_automation, delete_automation, list_automation_runs, list_automations, run_automation_now,
    set_automation_paused, update_automation,
};

pub(crate) use execution::sync_automation_run_status;
