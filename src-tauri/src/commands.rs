use crate::database::Database;
use crate::models::{TodoEvent, CreateEventRequest, UpdateEventRequest, EventFilter};
use std::sync::Mutex;
use std::path::Path;
use std::fs;
use tauri::State;
use serde::{Deserialize, Serialize};

pub struct AppState {
    pub db: Mutex<Database>,
    pub current_db_path: Mutex<String>,
}

pub type DbState = Mutex<Database>;
pub type DbPathState = Mutex<String>;

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub path: String,
    pub name: String,
    pub last_modified: String,
    pub size: String,
}

#[tauri::command]
pub async fn create_event(
    db: State<'_, DbState>,
    request: CreateEventRequest,
) -> Result<TodoEvent, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.create_event(request)
        .map_err(|e| format!("Failed to create event: {}", e))
}

#[tauri::command]
pub async fn get_event(
    db: State<'_, DbState>,
    id: String,
) -> Result<Option<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.get_event(&id)
        .map_err(|e| format!("Failed to get event: {}", e))
}

#[tauri::command]
pub async fn get_all_events(
    db: State<'_, DbState>,
) -> Result<Vec<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.get_all_events()
        .map_err(|e| format!("Failed to get events: {}", e))
}

#[tauri::command]
pub async fn update_event(
    db: State<'_, DbState>,
    request: UpdateEventRequest,
) -> Result<Option<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.update_event(request)
        .map_err(|e| format!("Failed to update event: {}", e))
}

#[tauri::command]
pub async fn update_event_status(
    db: State<'_, DbState>,
    id: String,
    status: crate::models::EventStatus,
) -> Result<Vec<TodoEvent>, String> {
    println!("🦀 Rust update_event_status command called with ID: {}, status: {:?}", id, status);
    let db = db.lock().map_err(|e| {
        println!("🦀 Database lock error: {}", e);
        format!("Database lock error: {}", e)
    })?;
    
    let result = db.update_event_status_cascade(&id, status)
        .map_err(|e| {
            println!("🦀 Failed to update event status: {}", e);
            format!("Failed to update event status: {}", e)
        });
    
    match &result {
        Ok(events) => println!("🦀 Update event status result: {} events updated", events.len()),
        Err(error) => println!("🦀 Update event status error: {}", error),
    }
    
    result
}

#[tauri::command]
pub async fn delete_event(
    db: State<'_, DbState>,
    id: String,
) -> Result<bool, String> {
    println!("🦀 Rust delete_event command called with ID: {}", id);
    let db = db.lock().map_err(|e| {
        println!("🦀 Database lock error: {}", e);
        format!("Database lock error: {}", e)
    })?;
    
    let result = db.delete_event(&id)
        .map_err(|e| {
            println!("🦀 Failed to delete event: {}", e);
            format!("Failed to delete event: {}", e)
        });
    
    match &result {
        Ok(success) => println!("🦀 Delete event result: {}", success),
        Err(error) => println!("🦀 Delete event error: {}", error),
    }
    
    result
}

#[tauri::command]
pub async fn filter_events(
    db: State<'_, DbState>,
    filter: EventFilter,
) -> Result<Vec<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    db.filter_events(filter)
        .map_err(|e| format!("Failed to filter events: {}", e))
}

#[tauri::command]
pub async fn get_event_dependencies(
    db: State<'_, DbState>,
    id: String,
) -> Result<Vec<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    if let Some(event) = db.get_event(&id).map_err(|e| format!("Failed to get event: {}", e))? {
        let mut dependencies = Vec::new();
        for dep_id in event.dependencies {
            if let Some(dep_event) = db.get_event(&dep_id).map_err(|e| format!("Failed to get dependency: {}", e))? {
                dependencies.push(dep_event);
            }
        }
        Ok(dependencies)
    } else {
        Err("Event not found".to_string())
    }
}

#[tauri::command]
pub async fn get_event_dependents(
    db: State<'_, DbState>,
    id: String,
) -> Result<Vec<TodoEvent>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let all_events = db.get_all_events().map_err(|e| format!("Failed to get events: {}", e))?;
    let dependents: Vec<TodoEvent> = all_events
        .into_iter()
        .filter(|event| event.dependencies.contains(&id))
        .collect();
    
    Ok(dependents)
}

// Database management commands

#[tauri::command]
pub async fn get_current_database_path(
    db_path: State<'_, DbPathState>,
) -> Result<String, String> {
    let path = db_path.lock().map_err(|e| format!("Path lock error: {}", e))?;
    Ok(path.clone())
}

#[tauri::command]
pub async fn get_recent_databases() -> Result<Vec<DatabaseInfo>, String> {
    // For now, return an empty list. In a real implementation,
    // you'd read from a configuration file or registry
    Ok(vec![])
}

#[tauri::command]
pub async fn create_new_database(path: String) -> Result<(), String> {
    println!("Creating new database at: {}", path);
    
    // Ensure the directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Create a new database instance to initialize the file
    Database::new(&path)
        .map_err(|e| format!("Failed to create database: {}", e))?;
    
    println!("Database created successfully at: {}", path);
    Ok(())
}

#[tauri::command]
pub async fn validate_database(path: String) -> Result<(), String> {
    println!("Validating database at: {}", path);
    
    // Check if file exists
    if !Path::new(&path).exists() {
        return Err("Database file does not exist".to_string());
    }
    
    // Try to open the database to validate it
    Database::new(&path)
        .map_err(|e| format!("Invalid database file: {}", e))?;
    
    println!("Database validation successful: {}", path);
    Ok(())
}

#[tauri::command]
pub async fn switch_database(
    db: State<'_, DbState>,
    db_path: State<'_, DbPathState>,
    path: String,
) -> Result<(), String> {
    println!("Switching to database: {}", path);
    
    // Validate the new database first
    validate_database(path.clone()).await?;
    
    // Create new database connection
    let new_db = Database::new(&path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Replace the current database connection
    let mut db_guard = db.lock()
        .map_err(|e| format!("Database lock error: {}", e))?;
    *db_guard = new_db;
    
    // Update the current database path
    let mut path_guard = db_path.lock()
        .map_err(|e| format!("Path lock error: {}", e))?;
    *path_guard = path.clone();
    
    println!("Database switched successfully to: {}", path);
    Ok(())
}

// Remove the custom dialog commands since we'll use the plugin properly