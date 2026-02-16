use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionData {
    pub project: String,
    pub display: String,
    pub timestamp: i64,
    pub session_id: String,
}

pub struct SessionDB {
    conn: Connection,
}

impl SessionDB {
    pub fn new() -> Result<Self> {
        let home = dirs::home_dir().expect("Failed to get home directory");
        let db_dir = home.join(".codexia");
        std::fs::create_dir_all(&db_dir).expect("Failed to create .codexia directory");

        let db_path = db_dir.join("data.db");
        let conn = Connection::open(db_path)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                project TEXT NOT NULL,
                display TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                scanned_at INTEGER NOT NULL
            )",
            [],
        )?;

        Ok(Self { conn })
    }

    pub fn is_scanned(&self, file_path: &str) -> Result<bool> {
        let mut stmt = self
            .conn
            .prepare("SELECT COUNT(*) FROM sessions WHERE file_path = ?1")?;
        let count: i64 = stmt.query_row([file_path], |row| row.get(0))?;
        Ok(count > 0)
    }

    pub fn insert_session(&self, session: &SessionData, file_path: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO sessions (session_id, project, display, timestamp, file_path, scanned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                session.session_id,
                session.project,
                session.display,
                session.timestamp,
                file_path,
                chrono::Utc::now().timestamp(),
            ],
        )?;
        Ok(())
    }

    pub fn get_all_sessions(&self) -> Result<Vec<SessionData>> {
        let mut stmt = self.conn.prepare(
            "SELECT session_id, project, display, timestamp FROM sessions ORDER BY timestamp DESC",
        )?;

        let sessions = stmt.query_map([], |row| {
            Ok(SessionData {
                session_id: row.get(0)?,
                project: row.get(1)?,
                display: row.get(2)?,
                timestamp: row.get(3)?,
            })
        })?;

        sessions.collect()
    }
}
