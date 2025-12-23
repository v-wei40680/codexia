//! Skills data access object
//!
//! Provides CRUD operations for Skills and Skill Repos.

use crate::database::{lock_conn, Database};
use crate::error::AppError;
use crate::services::skill::{SkillRepo, SkillState};
use indexmap::IndexMap;
use rusqlite::params;

impl Database {
    /// Get all Skills states
    pub fn get_skills(&self) -> Result<IndexMap<String, SkillState>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare("SELECT directory, app_type, installed, installed_at FROM skills ORDER BY directory ASC, app_type ASC")
            .map_err(|e| AppError::Database(e.to_string()))?;

        let skill_iter = stmt
            .query_map([], |row| {
                let directory: String = row.get(0)?;
                let app_type: String = row.get(1)?;
                let installed: bool = row.get(2)?;
                let installed_at_ts: i64 = row.get(3)?;

                let installed_at =
                    chrono::DateTime::from_timestamp(installed_at_ts, 0).unwrap_or_default();

                // Build composite key: "app_type:directory"
                let key = format!("{app_type}:{directory}");

                Ok((
                    key,
                    SkillState {
                        installed,
                        installed_at,
                    },
                ))
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut skills = IndexMap::new();
        for skill_res in skill_iter {
            let (key, skill) = skill_res.map_err(|e| AppError::Database(e.to_string()))?;
            skills.insert(key, skill);
        }
        Ok(skills)
    }

    /// Update Skill state
    /// key format: "app_type:directory"
    pub fn update_skill_state(&self, key: &str, state: &SkillState) -> Result<(), AppError> {
        // Parse key
        let (app_type, directory) = if let Some(idx) = key.find(':') {
            let (app, dir) = key.split_at(idx);
            (app, &dir[1..]) // Skip colon
        } else {
            // Backward compatibility: if no prefix, default to claude
            ("claude", key)
        };

        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO skills (directory, app_type, installed, installed_at) VALUES (?1, ?2, ?3, ?4)",
            params![directory, app_type, state.installed, state.installed_at.timestamp()],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// Get all Skill repositories
    pub fn get_skill_repos(&self) -> Result<Vec<SkillRepo>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn
            .prepare(
                "SELECT owner, name, branch, enabled FROM skill_repos ORDER BY owner ASC, name ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let repo_iter = stmt
            .query_map([], |row| {
                Ok(SkillRepo {
                    owner: row.get(0)?,
                    name: row.get(1)?,
                    branch: row.get(2)?,
                    enabled: row.get(3)?,
                })
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut repos = Vec::new();
        for repo_res in repo_iter {
            repos.push(repo_res.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(repos)
    }

    /// Save Skill repository
    pub fn save_skill_repo(&self, repo: &SkillRepo) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO skill_repos (owner, name, branch, enabled) VALUES (?1, ?2, ?3, ?4)",
            params![repo.owner, repo.name, repo.branch, repo.enabled],
        ).map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// Delete Skill repository
    pub fn delete_skill_repo(&self, owner: &str, name: &str) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "DELETE FROM skill_repos WHERE owner = ?1 AND name = ?2",
            params![owner, name],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// Initialize default Skill repositories (called on first launch)
    pub fn init_default_skill_repos(&self) -> Result<usize, AppError> {
        // Check if repositories already exist
        let existing = self.get_skill_repos()?;
        if !existing.is_empty() {
            return Ok(0);
        }

        // Get default repository list
        let default_store = crate::services::skill::SkillStore::default();
        let mut count = 0;

        for repo in &default_store.repos {
            self.save_skill_repo(repo)?;
            count += 1;
        }

        log::info!("Initialized default Skill repositories, total {count}");
        Ok(count)
    }
}
