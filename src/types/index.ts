export interface TodoEvent {
  id: string;
  name: string;
  description: string;
  tags: Record<string, string>;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  dependencies: string[];
}

export enum EventStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Blocked = 'Blocked',
}

export interface CreateEventRequest {
  name: string;
  description: string;
  tags: Record<string, string>;
  dependencies: string[];
}

export interface UpdateEventRequest {
  id: string;
  name?: string;
  description?: string;
  tags?: Record<string, string>;
  status?: EventStatus;
  dependencies?: string[];
}

export interface EventFilter {
  status?: EventStatus;
  tags?: Record<string, string>;
  search?: string;
}

export interface EventNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  data: {
    event: TodoEvent;
    onEdit: (event: TodoEvent) => void;
    onDelete: (id: string) => void;
  };
}

export interface EventEdge {
  id: string;
  source: string;
  target: string;
  type: 'smoothstep';
  animated: boolean;
}