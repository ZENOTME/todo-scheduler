# Todo Scheduler - Architecture Design

## Overview

Todo Scheduler is a task management application built with React, TypeScript, and Tauri. It implements a dependency-aware task scheduling system with three main task states: Ready, Blocked, and Completed.

## Architecture Components

### 1. Frontend Architecture (React + TypeScript)

#### Core Technologies
- **React 18**: Modern React with hooks for component state management
- **TypeScript**: Type-safe development with strict typing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: High-quality, accessible UI components
- **Zustand**: Lightweight state management library
- **Lucide React**: Icon library for consistent iconography

#### Component Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── MainLayout.tsx         # Main application layout
│   ├── TaskList.tsx          # Task list component with dependency visualization
│   └── EventFormDialog.tsx   # Event creation/editing dialog
├── store/
│   └── eventStore.ts         # Zustand store for event management
├── types/
│   └── index.ts              # TypeScript type definitions
└── lib/
    └── utils.ts              # Utility functions
```

### 2. Backend Architecture (Rust + Tauri)

#### Core Technologies
- **Tauri**: Cross-platform desktop application framework
- **Rust**: Systems programming language for backend logic
- **SQLite**: Embedded database for data persistence
- **Serde**: Serialization/deserialization framework

#### Backend Structure

```
src-tauri/
├── src/
│   ├── main.rs               # Application entry point
│   ├── database.rs           # Database operations and schema
│   ├── commands.rs           # Tauri command handlers
│   └── lib.rs                # Library exports
└── Cargo.toml                # Rust dependencies
```

## Key Design Patterns

### 1. State Management Pattern

**Zustand Store Architecture:**
```typescript
interface EventStore {
  events: TodoEvent[];
  selectedEvent: TodoEvent | null;
  
  // Actions
  fetchEvents: () => Promise<void>;
  createEvent: (event: CreateEventRequest) => Promise<void>;
  updateEvent: (id: string, event: UpdateEventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (id: string, status: EventStatus) => Promise<void>;
}
```

**Benefits:**
- Centralized state management
- Automatic UI updates when state changes
- Type-safe actions and state access
- Minimal boilerplate compared to Redux

### 2. Component Composition Pattern

**TaskList Component Design:**
```typescript
interface TaskListProps {
  title: string;
  status: EventStatus;
  onEventSelect: (event: TodoEvent | null) => void;
  onEventEdit: (event: TodoEvent) => void;
  onEventDelete: (event: TodoEvent) => void;
  onEventComplete?: (event: TodoEvent) => void;
  selectedEvent: TodoEvent | null;
  showDependencies?: boolean;
}
```

**Benefits:**
- Reusable components for different task states
- Clear separation of concerns
- Event-driven communication between components
- Flexible prop-based configuration

### 3. Dependency Management Pattern

**Real-time Dependency Resolution:**
```rust
pub async fn update_event_status_with_cascade(
    id: String,
    status: EventStatus,
    pool: &SqlitePool,
) -> Result<i64, String> {
    // Update target event
    // Check and update dependent events
    // Cascade status changes automatically
}
```

**Benefits:**
- Automatic dependency resolution
- Real-time status updates
- Prevents circular dependencies
- Maintains data consistency

## Data Flow Architecture

### 1. Frontend to Backend Communication

```
React Component → Zustand Store → Tauri Command → Rust Handler → SQLite Database
```

**Example Flow:**
1. User clicks "Mark as Complete" button
2. TaskList component calls `onEventComplete(event)`
3. MainLayout calls `updateEventStatus(event.id, EventStatus.Completed)`
4. Zustand store invokes Tauri command `update_event_status`
5. Rust handler processes the request and updates database
6. Dependent events are automatically checked and updated
7. Frontend receives updated event list and re-renders UI

### 2. Real-time UI Updates

```
Database Change → Cascade Update → Store Refresh → Component Re-render
```

**Implementation:**
- Periodic polling (10-second intervals) for data synchronization
- Immediate local state updates for responsive UI
- Automatic dependency resolution triggers UI updates

## UI/UX Design Principles

### 1. Three-Column Layout

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────┐
│                    Header Navigation                     │
├─────────────────┬─────────────────┬─────────────────────┤
│   Ready List    │  Blocked List   │   Completed List    │
│                 │                 │                     │
│ • Task 1        │ • Task 3        │ • Task 2            │
│ • Task 4        │   └─ Deps: 1,2  │ • Task 5            │
│                 │                 │                     │
└─────────────────┴─────────────────┴─────────────────────┘
```

**Benefits:**
- Clear visual separation of task states
- Easy task status identification
- Intuitive workflow progression
- Efficient screen space utilization

### 2. Dependency Visualization

**Expandable Dependency Lists:**
- Click to expand blocked tasks
- Show dependency status with color coding
- Real-time dependency status updates
- Clear visual hierarchy

### 3. Quick Actions

**One-Click Operations:**
- Quick complete button for ready tasks
- Inline edit and delete actions
- Hover-based action visibility
- Keyboard shortcuts support

## Database Schema

### Events Table
```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON string
    status TEXT NOT NULL,
    dependencies TEXT, -- JSON array of event IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Key Features:
- UUID-based primary keys for distributed systems
- JSON fields for flexible metadata storage
- Timestamp tracking for audit trails
- Dependency relationships stored as JSON arrays

## Performance Optimizations

### 1. Frontend Optimizations

- **Component Memoization**: React.memo for expensive components
- **Virtual Scrolling**: For large task lists (future enhancement)
- **Debounced Updates**: Prevent excessive API calls
- **Local State Caching**: Reduce backend requests

### 2. Backend Optimizations

- **Connection Pooling**: SQLite connection management
- **Batch Operations**: Multiple updates in single transaction
- **Index Optimization**: Database query performance
- **Async Processing**: Non-blocking I/O operations

## Security Considerations

### 1. Data Validation

- **Input Sanitization**: Prevent SQL injection
- **Type Validation**: TypeScript + Rust type safety
- **Schema Validation**: Structured data validation
- **Error Handling**: Graceful error recovery

### 2. Application Security

- **Tauri Security**: Sandboxed execution environment
- **Local Data Storage**: No external data transmission
- **Permission Management**: Minimal system permissions
- **Code Signing**: Application integrity verification

## Testing Strategy

### 1. Frontend Testing

- **Unit Tests**: Component logic testing
- **Integration Tests**: Store and component interaction
- **E2E Tests**: User workflow validation
- **Visual Regression Tests**: UI consistency checks

### 2. Backend Testing

- **Unit Tests**: Individual function testing
- **Integration Tests**: Database operation testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability assessment

## Future Enhancements

### 1. Planned Features

- **Drag & Drop**: Visual task reordering
- **Gantt Chart View**: Timeline visualization
- **Task Templates**: Reusable task patterns
- **Export/Import**: Data portability
- **Collaboration**: Multi-user support

### 2. Technical Improvements

- **Offline Support**: Local-first architecture
- **Real-time Sync**: WebSocket-based updates
- **Plugin System**: Extensible functionality
- **Mobile App**: Cross-platform mobile support
- **Cloud Sync**: Optional cloud backup

## Conclusion

The Todo Scheduler architecture provides a solid foundation for a dependency-aware task management system. The combination of React's component model, Zustand's state management, and Tauri's cross-platform capabilities creates a performant, maintainable, and user-friendly application.

The three-column layout with expandable dependency visualization offers an intuitive user experience, while the real-time dependency resolution ensures data consistency and workflow efficiency.