use serde::Serialize;
use std::str::FromStr;
use toml_edit::{Document, Table};

pub fn serialize_to_table<T: Serialize>(value: &T) -> Result<Table, String> {
    let serialized = toml::to_string(value)
        .map_err(|e| format!("Failed to serialize value: {}", e))?;
    let doc =
        Document::from_str(&serialized).map_err(|e| format!("Failed to parse serialized value: {}", e))?;
    Ok(doc.as_table().clone())
}
