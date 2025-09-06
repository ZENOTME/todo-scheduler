import { create } from 'zustand';
import { TodoEvent, EventFilter, CreateEventRequest, UpdateEventRequest, EventStatus } from '@/types';
import { invoke } from '@tauri-apps/api/core';

interface EventStore {
  events: TodoEvent[];
  selectedEvent: TodoEvent | null;
  filter: EventFilter;
  loading: boolean;
  error: string | null;
  
  // Actions
  setEvents: (events: TodoEvent[]) => void;
  setSelectedEvent: (event: TodoEvent | null) => void;
  setFilter: (filter: EventFilter) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // API calls
  fetchEvents: () => Promise<void>;
  createEvent: (request: CreateEventRequest) => Promise<void>;
  updateEvent: (request: UpdateEventRequest) => Promise<void>;
  updateEventStatus: (id: string, status: EventStatus) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  filterEvents: (filter: EventFilter) => Promise<void>;
  getEventDependencies: (id: string) => Promise<TodoEvent[]>;
  getEventDependents: (id: string) => Promise<TodoEvent[]>;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  selectedEvent: null,
  filter: {},
  loading: false,
  error: null,

  setEvents: (events) => set({ events }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setFilter: (filter) => set({ filter }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchEvents: async () => {
    try {
      set({ loading: true, error: null });
      const events = await invoke<TodoEvent[]>('get_all_events');
      set({ events, loading: false });
    } catch (error) {
      set({ error: error as string, loading: false });
    }
  },

  createEvent: async (request) => {
    try {
      set({ loading: true, error: null });
      const newEvent = await invoke<TodoEvent>('create_event', { request });
      const { events } = get();
      set({ events: [newEvent, ...events], loading: false });
    } catch (error) {
      set({ error: error as string, loading: false });
    }
  },

  updateEvent: async (request) => {
    try {
      set({ loading: true, error: null });
      const updatedEvent = await invoke<TodoEvent | null>('update_event', { request });
      if (updatedEvent) {
        const { events } = get();
        const updatedEvents = events.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        );
        set({ events: updatedEvents, loading: false });
      }
    } catch (error) {
      set({ error: error as string, loading: false });
    }
  },

  updateEventStatus: async (id, status) => {
    try {
      set({ loading: true, error: null });
      console.log('🏪 Updating event status:', id, status);
      
      // 1. 首先更新当前事件状态
      const updatedEvents = await invoke<TodoEvent[]>('update_event_status', { id, status });
      console.log('🏪 Status update result:', updatedEvents);
      
      if (updatedEvents && updatedEvents.length > 0) {
        const { events } = get();
        let newEvents = [...events];
        
        // 2. 更新所有受影响的事件
        updatedEvents.forEach(updatedEvent => {
          const index = newEvents.findIndex(e => e.id === updatedEvent.id);
          if (index !== -1) {
            newEvents[index] = updatedEvent;
          }
        });

        // 3. 如果事件状态变为Completed，检查是否有阻塞事件可以解除
        if (status === EventStatus.Completed) {
          // 获取所有依赖此事件的其他事件
          const dependents = await invoke<TodoEvent[]>('get_event_dependents', { id });
          console.log('🏪 Found dependents:', dependents);
          
          // 检查每个依赖事件是否满足解除阻塞条件
          for (const dependent of dependents) {
            if (dependent.status === EventStatus.Blocked) {
              // 获取该事件的所有依赖项
              const deps = await invoke<TodoEvent[]>('get_event_dependencies', { id: dependent.id });
              const allDepsCompleted = deps.every(dep => dep.status === EventStatus.Completed);
              
              if (allDepsCompleted) {
                // 所有依赖项已完成，将事件状态更新为Pending
                console.log('🏪 Unblocking dependent event:', dependent.id);
                const unblockedEvents = await invoke<TodoEvent[]>('update_event_status', { 
                  id: dependent.id, 
                  status: EventStatus.Pending 
                });
                
                // 更新UI中的事件状态
                unblockedEvents.forEach(unblockedEvent => {
                  const idx = newEvents.findIndex(e => e.id === unblockedEvent.id);
                  if (idx !== -1) {
                    newEvents[idx] = unblockedEvent;
                  }
                });
              }
            }
          }
        }
        
        set({ events: newEvents, loading: false });
        console.log('🏪 Events updated after status change');
      }
    } catch (error) {
      console.error('🏪 Update event status error:', error);
      set({ error: error as string, loading: false });
    }
  },

  deleteEvent: async (id) => {
    console.log('🏪 Store deleteEvent called with ID:', id);
    try {
      console.log('🏪 Setting loading state...');
      set({ loading: true, error: null });
      
      console.log('🏪 Invoking Tauri delete_event command...');
      const success = await invoke<boolean>('delete_event', { id });
      console.log('🏪 Tauri delete_event result:', success);
      
      if (success) {
        const { events, selectedEvent } = get();
        console.log('🏪 Current events count:', events.length);
        console.log('🏪 Current selected event:', selectedEvent?.id);
        
        const filteredEvents = events.filter(event => event.id !== id);
        console.log('🏪 Filtered events count:', filteredEvents.length);
        
        // 如果删除的是当前选中的事件，清除选择
        const newSelectedEvent = selectedEvent?.id === id ? null : selectedEvent;
        console.log('🏪 New selected event:', newSelectedEvent?.id);
        
        set({ 
          events: filteredEvents, 
          selectedEvent: newSelectedEvent,
          loading: false 
        });
        console.log('🏪 Store state updated successfully');
      } else {
        console.log('🏪 Delete failed - success is false');
        set({ error: '删除事件失败', loading: false });
      }
    } catch (error) {
      console.error('🏪 Delete event error:', error);
      set({ error: error as string, loading: false });
    }
  },

  filterEvents: async (filter) => {
    try {
      set({ loading: true, error: null, filter });
      const events = await invoke<TodoEvent[]>('filter_events', { filter });
      set({ events, loading: false });
    } catch (error) {
      set({ error: error as string, loading: false });
    }
  },

  getEventDependencies: async (id) => {
    try {
      const dependencies = await invoke<TodoEvent[]>('get_event_dependencies', { id });
      return dependencies;
    } catch (error) {
      set({ error: error as string });
      return [];
    }
  },

  getEventDependents: async (id) => {
    try {
      const dependents = await invoke<TodoEvent[]>('get_event_dependents', { id });
      return dependents;
    } catch (error) {
      set({ error: error as string });
      return [];
    }
  },
}));