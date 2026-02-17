use super::to_error_response;
use super::types::{
    CreateNoteParams, DeleteNoteParams, GetNoteByIdParams, NotesListParams, NotesMarkSyncedParams,
    ToggleFavoriteParams, UpdateNoteParams,
};
use axum::{Json, http::StatusCode};

use crate::db;
use crate::db::notes::Note;
use crate::web_server::types::ErrorResponse;

pub(crate) async fn api_create_note(
    Json(params): Json<CreateNoteParams>,
) -> Result<Json<Note>, ErrorResponse> {
    let note = db::create_note(
        params.id,
        params.user_id,
        params.title,
        params.content,
        params.tags,
    )
    .map_err(to_error_response)?;
    Ok(Json(note))
}

pub(crate) async fn api_get_notes(
    Json(params): Json<NotesListParams>,
) -> Result<Json<Vec<Note>>, ErrorResponse> {
    let notes = db::get_notes(params.user_id).map_err(to_error_response)?;
    Ok(Json(notes))
}

pub(crate) async fn api_get_note_by_id(
    Json(params): Json<GetNoteByIdParams>,
) -> Result<Json<Option<Note>>, ErrorResponse> {
    let note = db::get_note_by_id(params.id).map_err(to_error_response)?;
    Ok(Json(note))
}

pub(crate) async fn api_update_note(
    Json(params): Json<UpdateNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db::update_note(params.id, params.title, params.content, params.tags)
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_delete_note(
    Json(params): Json<DeleteNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db::delete_note(params.id).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_toggle_favorite(
    Json(params): Json<ToggleFavoriteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db::toggle_favorite(params.id).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_mark_notes_synced(
    Json(params): Json<NotesMarkSyncedParams>,
) -> Result<StatusCode, ErrorResponse> {
    db::mark_notes_synced(params.ids).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_get_unsynced_notes(
    Json(params): Json<NotesListParams>,
) -> Result<Json<Vec<Note>>, ErrorResponse> {
    let notes = db::get_unsynced_notes(params.user_id).map_err(to_error_response)?;
    Ok(Json(notes))
}
