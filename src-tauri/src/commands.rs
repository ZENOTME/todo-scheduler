use crate::database::Database;
use crate::models::{TodoEvent, CreateEventRequest, UpdateEventRequest, EventFilter};
use std::sync::Mutex;
use tauri::State;

pub type DbState = Mutex<Database>;

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