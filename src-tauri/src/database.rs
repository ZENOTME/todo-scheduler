use crate::models::{TodoEvent, EventStatus, CreateEventRequest, UpdateEventRequest, EventFilter};
use rusqlite::{Connection, Result, params};
use std::collections::HashMap;
use std::path::Path;
use chrono::{DateTime, Utc};
use serde_json;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                tags TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                dependencies TEXT NOT NULL
            )",
            [],
        )?;
        Ok(())
    }

    pub fn create_event(&self, request: CreateEventRequest) -> Result<TodoEvent> {
        let mut event = TodoEvent::new(
            request.name,
            request.description,
            request.tags,
            request.dependencies,
        );

        // 根据依赖关系自动计算状态
        event.status = self.calculate_event_status(&event)?;

        let tags_json = serde_json::to_string(&event.tags).unwrap();
        let dependencies_json = serde_json::to_string(&event.dependencies).unwrap();
        let status_str = match event.status {
            EventStatus::Pending => "pending",
            EventStatus::InProgress => "in_progress",
            EventStatus::Completed => "completed",
            EventStatus::Blocked => "blocked",
        };

        self.conn.execute(
            "INSERT INTO events (id, name, description, tags, status, created_at, updated_at, dependencies)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                event.id,
                event.name,
                event.description,
                tags_json,
                status_str,
                event.created_at.to_rfc3339(),
                event.updated_at.to_rfc3339(),
                dependencies_json
            ],
        )?;

        Ok(event)
    }

    pub fn get_event(&self, id: &str) -> Result<Option<TodoEvent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, tags, status, created_at, updated_at, dependencies
             FROM events WHERE id = ?1"
        )?;

        let event_iter = stmt.query_map([id], |row| {
            let tags_json: String = row.get(3)?;
            let dependencies_json: String = row.get(7)?;
            let status_str: String = row.get(4)?;
            let created_at_str: String = row.get(5)?;
            let updated_at_str: String = row.get(6)?;

            let tags: HashMap<String, String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let dependencies: Vec<String> = serde_json::from_str(&dependencies_json).unwrap_or_default();
            let status = match status_str.as_str() {
                "pending" => EventStatus::Pending,
                "in_progress" => EventStatus::InProgress,
                "completed" => EventStatus::Completed,
                "blocked" => EventStatus::Blocked,
                _ => EventStatus::Pending,
            };

            Ok(TodoEvent {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                tags,
                status,
                created_at: DateTime::parse_from_rfc3339(&created_at_str).unwrap().with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str).unwrap().with_timezone(&Utc),
                dependencies,
            })
        })?;

        for event in event_iter {
            return Ok(Some(event?));
        }
        Ok(None)
    }

    pub fn get_all_events(&self) -> Result<Vec<TodoEvent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, tags, status, created_at, updated_at, dependencies
             FROM events ORDER BY created_at DESC"
        )?;

        let event_iter = stmt.query_map([], |row| {
            let tags_json: String = row.get(3)?;
            let dependencies_json: String = row.get(7)?;
            let status_str: String = row.get(4)?;
            let created_at_str: String = row.get(5)?;
            let updated_at_str: String = row.get(6)?;

            let tags: HashMap<String, String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let dependencies: Vec<String> = serde_json::from_str(&dependencies_json).unwrap_or_default();
            let status = match status_str.as_str() {
                "pending" => EventStatus::Pending,
                "in_progress" => EventStatus::InProgress,
                "completed" => EventStatus::Completed,
                "blocked" => EventStatus::Blocked,
                _ => EventStatus::Pending,
            };

            Ok(TodoEvent {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                tags,
                status,
                created_at: DateTime::parse_from_rfc3339(&created_at_str).unwrap().with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str).unwrap().with_timezone(&Utc),
                dependencies,
            })
        })?;

        let mut events = Vec::new();
        for event in event_iter {
            events.push(event?);
        }
        Ok(events)
    }

    pub fn update_event(&self, request: UpdateEventRequest) -> Result<Option<TodoEvent>> {
        if let Some(mut event) = self.get_event(&request.id)? {
            let old_status = event.status;
            println!("update event: {:?}", event);
            event.update(request);

            let tags_json = serde_json::to_string(&event.tags).unwrap();
            let dependencies_json = serde_json::to_string(&event.dependencies).unwrap();
            let status_str = match event.status {
                EventStatus::Pending => "pending",
                EventStatus::InProgress => "in_progress",
                EventStatus::Completed => "completed",
                EventStatus::Blocked => "blocked",
            };

            self.conn.execute(
                "UPDATE events SET name = ?1, description = ?2, tags = ?3, status = ?4, updated_at = ?5, dependencies = ?6
                 WHERE id = ?7",
                params![
                    event.name,
                    event.description,
                    tags_json,
                    status_str,
                    event.updated_at.to_rfc3339(),
                    dependencies_json,
                    event.id
                ],
            )?;

            // 如果状态发生变化，触发级联更新
            if old_status != event.status {
                self.update_event_status_cascade(&event.id, event.status)?;
            }

            Ok(Some(event))
        } else {
            Ok(None)
        }
    }

    pub fn delete_event(&self, id: &str) -> Result<bool> {
        println!("🗄️ Database delete_event called with ID: {}", id);
        let rows_affected = self.conn.execute("DELETE FROM events WHERE id = ?1", [id])?;
        println!("🗄️ Rows affected: {}", rows_affected);
        let success = rows_affected > 0;
        println!("🗄️ Delete success: {}", success);
        Ok(success)
    }

    // 计算事件的正确状态
    pub fn calculate_event_status(&self, event: &TodoEvent) -> Result<EventStatus> {
        println!("🧮 Calculating status for event: {} ({})", event.name, event.id);
        
        // 如果没有依赖，状态为待办
        if event.dependencies.is_empty() {
            println!("🧮 No dependencies, status: Pending");
            return Ok(EventStatus::Pending);
        }

        println!("🧮 Checking {} dependencies", event.dependencies.len());
        
        // 检查所有依赖事件的状态
        for dep_id in &event.dependencies {
            if let Some(dep_event) = self.get_event(dep_id)? {
                println!("🧮 Dependency {} status: {:?}", dep_event.name, dep_event.status);
                if dep_event.status != EventStatus::Completed {
                    // 如果有任何依赖未完成，状态为阻塞
                    println!("🧮 Dependency not completed, status: Blocked");
                    return Ok(EventStatus::Blocked);
                }
            } else {
                // 如果依赖事件不存在，也认为是阻塞状态
                println!("🧮 Dependency not found, status: Blocked");
                return Ok(EventStatus::Blocked);
            }
        }

        // 所有依赖都已完成，状态为待办
        println!("🧮 All dependencies completed, status: Pending");
        Ok(EventStatus::Pending)
    }

    // 更新事件状态并级联更新依赖它的事件
    pub fn update_event_status_cascade(&self, event_id: &str, new_status: EventStatus) -> Result<Vec<TodoEvent>> {
        println!("🔄 Starting cascade update for event: {} -> {:?}", event_id, new_status);
        let mut updated_events = Vec::new();

        // 更新当前事件状态
        if let Some(mut event) = self.get_event(event_id)? {
            let old_status = event.status;
            println!("🔄 Current event status: {:?} -> {:?}", old_status, new_status);
            event.status = new_status;
            event.updated_at = Utc::now();

            // 保存当前事件
            let tags_json = serde_json::to_string(&event.tags).unwrap();
            let dependencies_json = serde_json::to_string(&event.dependencies).unwrap();
            let status_str = match event.status {
                EventStatus::Pending => "pending",
                EventStatus::InProgress => "in_progress",
                EventStatus::Completed => "completed",
                EventStatus::Blocked => "blocked",
            };

            self.conn.execute(
                "UPDATE events SET status = ?1, updated_at = ?2 WHERE id = ?3",
                [status_str, &event.updated_at.to_rfc3339(), &event.id],
            )?;

            updated_events.push(event.clone());

            // 如果事件从非完成状态变为完成状态，检查依赖它的事件
                println!("🔄 Event completed, checking dependent events for: {}", event_id);
                let all_events = self.get_all_events()?;
                for dependent_event in all_events {
                    // 检查这个事件是否依赖于刚完成的事件
                    if dependent_event.dependencies.contains(&event_id.to_string()) && dependent_event.status == EventStatus::Blocked {
                        println!("🔄 Found blocked dependent event: {} -> {}", dependent_event.name, dependent_event.id);
                        // 重新计算依赖事件的状态
                        let calculated_status = self.calculate_event_status(&dependent_event)?;
                        println!("🔄 Calculated new status: {:?} (was: {:?})", calculated_status, dependent_event.status);
                        if calculated_status != dependent_event.status {
                            // 递归更新依赖事件的状态
                            println!("🔄 Updating dependent event status");
                            let cascade_updated = self.update_event_status_cascade(&dependent_event.id, calculated_status)?;
                            updated_events.extend(cascade_updated);
                        }
                    }
            }
        }

        Ok(updated_events)
    }

    pub fn filter_events(&self, filter: EventFilter) -> Result<Vec<TodoEvent>> {
        let mut query = "SELECT id, name, description, tags, status, created_at, updated_at, dependencies FROM events WHERE 1=1".to_string();
        let mut params: Vec<String> = Vec::new();

        if let Some(status) = filter.status {
            let status_str = match status {
                EventStatus::Pending => "pending",
                EventStatus::InProgress => "in_progress",
                EventStatus::Completed => "completed",
                EventStatus::Blocked => "blocked",
            };
            query.push_str(" AND status = ?");
            params.push(status_str.to_string());
        }

        if let Some(search) = filter.search {
            if !search.is_empty() {
                query.push_str(" AND (name LIKE ? OR description LIKE ?)");
                let search_pattern = format!("%{}%", search);
                params.push(search_pattern.clone());
                params.push(search_pattern);
            }
        }

        query.push_str(" ORDER BY created_at DESC");

        let mut stmt = self.conn.prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

        let event_iter = stmt.query_map(&param_refs[..], |row| {
            let tags_json: String = row.get(3)?;
            let dependencies_json: String = row.get(7)?;
            let status_str: String = row.get(4)?;
            let created_at_str: String = row.get(5)?;
            let updated_at_str: String = row.get(6)?;

            let tags: HashMap<String, String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let dependencies: Vec<String> = serde_json::from_str(&dependencies_json).unwrap_or_default();
            let status = match status_str.as_str() {
                "pending" => EventStatus::Pending,
                "in_progress" => EventStatus::InProgress,
                "completed" => EventStatus::Completed,
                "blocked" => EventStatus::Blocked,
                _ => EventStatus::Pending,
            };

            Ok(TodoEvent {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                tags,
                status,
                created_at: DateTime::parse_from_rfc3339(&created_at_str).unwrap().with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str).unwrap().with_timezone(&Utc),
                dependencies,
            })
        })?;

        let mut events = Vec::new();
        for event in event_iter {
            let event = event?;
            
            // Filter by tags if specified
            if let Some(ref filter_tags) = filter.tags {
                let mut matches = true;
                for (key, value) in filter_tags {
                    if let Some(event_value) = event.tags.get(key) {
                        if event_value != value {
                            matches = false;
                            break;
                        }
                    } else {
                        matches = false;
                        break;
                    }
                }
                if matches {
                    events.push(event);
                }
            } else {
                events.push(event);
            }
        }
        Ok(events)
    }
}