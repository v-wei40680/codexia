mod diff;
mod helpers;
mod staging;
mod stats;
mod status;
mod types;
mod worktree;

#[cfg(test)]
mod tests;

pub use self::diff::{git_diff_stats, git_file_diff, git_file_diff_meta};
pub use self::staging::{git_stage_files, git_unstage_files};
pub use self::status::git_status;
pub use self::types::{
    GitDiffStatsResponse, GitFileDiffMetaResponse, GitFileDiffResponse,
    GitPrepareThreadWorktreeResponse, GitStatusResponse,
};
pub use self::worktree::{clone, git_prepare_thread_worktree};
