pub mod cache;
pub mod file;
pub mod scanner;
pub mod utils;

// Re-export commonly used functions
pub use cache::load_project_sessions;
pub use scanner::scan_projects;

// Re-export database functions
pub use crate::db::{
    // Session functions
    remove_project_session, update_project_favorites, update_session_preview,
    // Usage functions
    read_token_usage,
    // Note functions
    create_note, get_notes, get_note_by_id, update_note, delete_note,
    toggle_favorite, mark_notes_synced, get_unsynced_notes, Note,
};
