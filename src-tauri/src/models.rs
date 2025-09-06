use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodoEvent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tags: HashMap<String, String>,
    pub status: EventStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub dependencies: Vec<String>, // IDs of dependent events
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum EventStatus {
    Pending,
    InProgress,
    Completed,
    Blocked,
}

impl Default for EventStatus {
    fn default() -> Self {
        EventStatus::Pending
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventRequest {
    pub name: String,
    pub description: String,
    pub tags: HashMap<String, String>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEventRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<HashMap<String, String>>,
    pub status: Option<EventStatus>,
    pub dependencies: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventFilter {
    pub status: Option<EventStatus>,
    pub tags: Option<HashMap<String, String>>,
    pub search: Option<String>,
}

impl TodoEvent {
    pub fn new(name: String, description: String, tags: HashMap<String, String>, dependencies: Vec<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            tags,
            status: EventStatus::default(),
            created_at: now,
            updated_at: now,
            dependencies,
        }
    }

    pub fn update(&mut self, request: UpdateEventRequest) {
        if let Some(name) = request.name {
            self.name = name;
        }
        if let Some(description) = request.description {
            self.description = description;
        }
        if let Some(tags) = request.tags {
            self.tags = tags;
        }
        if let Some(status) = request.status {
            self.status = status;
        }
        if let Some(dependencies) = request.dependencies {
            self.dependencies = dependencies;
        }
        self.updated_at = Utc::now();
    }
}