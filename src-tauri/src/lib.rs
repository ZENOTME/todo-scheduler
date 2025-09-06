mod models;
mod database;
mod commands;

use database::Database;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
            
            // Initialize database
            let db_path = app_data_dir.join("todo_scheduler.db");
            println!("Database path: {:?}", db_path);
            let database = Database::new(db_path).expect("Failed to initialize database");
            
            // Store database in app state
            app.manage(Mutex::new(database));
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_event,
            commands::get_event,
            commands::get_all_events,
            commands::update_event,
            commands::update_event_status,
            commands::delete_event,
            commands::filter_events,
            commands::get_event_dependencies,
            commands::get_event_dependents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
