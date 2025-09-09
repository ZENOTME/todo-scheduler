import React, { useState, useEffect, useRef } from 'react';
import { TodoEvent, EventStatus } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, HelpCircle, Plus } from 'lucide-react';
import { EventFormDialog } from './EventFormDialog';
import { TaskList } from './TaskList';
import { TagSortManager } from './TagSortManager';
import { DatabaseManager } from './DatabaseManager';

export const MainLayout: React.FC = () => {
  const { events, deleteEvent, selectedEvent, setSelectedEvent, fetchEvents, updateEventStatus } = useEventStore();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingEvent, setEditingEvent] = useState<TodoEvent | null>(null);
  
  // Column width management - use percentages for equal distribution
  const [columnWidths, setColumnWidths] = useState({
    ready: 33.33,
    blocked: 33.33,
    completed: 33.34
  });
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const startWidths = useRef<{ ready: number; blocked: number; completed: number }>({ ready: 0, blocked: 0, completed: 0 });
  
  // Drag and drop state for tasks
  const [draggedEvent, setDraggedEvent] = useState<TodoEvent | null>(null);
  
  // Initialize events loading
  useEffect(() => {
    fetchEvents();
    
    // Set up periodic refresh to ensure UI state sync with backend
    const refreshInterval = setInterval(() => {
      fetchEvents();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [fetchEvents]);

  const handleEventSelect = (event: TodoEvent | null) => {
    setSelectedEvent(event);
  };

  const handleCreateEvent = () => {
    setFormMode('create');
    setEditingEvent(null);
    setFormDialogOpen(true);
  };

  const handleEditEvent = (event: TodoEvent) => {
    setFormMode('edit');
    setEditingEvent(event);
    setFormDialogOpen(true);
  };

  const handleDeleteEvent = async (event: TodoEvent) => {
    await deleteEvent(event.id);
  };

  const handleCompleteEvent = async (event: TodoEvent) => {
    await updateEventStatus(event.id, EventStatus.Completed);
  };

  const handleDatabaseChange = async (dbPath: string) => {
    // Reload events from the new database
    await fetchEvents();
  };

  // Handle task drag and drop
  const handleTaskDragStart = (event: TodoEvent) => {
    console.log('🎯 Drag started for event:', event.name, event.id);
    setDraggedEvent(event);
  };

  const handleTaskDragEnd = () => {
    console.log('🎯 Drag ended');
    setDraggedEvent(null);
  };

  const handleTaskDrop = async (targetStatus: EventStatus) => {
    console.log('🎯 Drop event triggered:', {
      draggedEvent: draggedEvent?.name,
      draggedEventId: draggedEvent?.id,
      currentStatus: draggedEvent?.status,
      targetStatus
    });

    if (!draggedEvent || draggedEvent.status === targetStatus) {
      console.log('🎯 Drop cancelled - no dragged event or same status');
      return;
    }

    try {
      console.log('🎯 Calling updateEventStatus...');
      await updateEventStatus(draggedEvent.id, targetStatus);
      console.log('🎯 Status update completed, refreshing events...');
      // Refresh events to ensure UI is in sync
      await fetchEvents();
      console.log('🎯 Events refreshed successfully');
    } catch (error) {
      console.error('🎯 Failed to update event status:', error);
    }
  };

  // Handle column resizing
  const handleMouseDown = (divider: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(divider);
    startX.current = e.clientX;
    startWidths.current = { ...columnWidths };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 32; // Account for padding and gaps
      const deltaX = e.clientX - startX.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      if (divider === 'ready-blocked') {
        const newReadyWidth = Math.max(15, Math.min(70, startWidths.current.ready + deltaPercent));
        const newBlockedWidth = Math.max(15, startWidths.current.blocked - deltaPercent);
        
        setColumnWidths(prev => ({
          ...prev,
          ready: newReadyWidth,
          blocked: newBlockedWidth
        }));
      } else if (divider === 'blocked-completed') {
        const newBlockedWidth = Math.max(15, Math.min(70, startWidths.current.blocked + deltaPercent));
        const newCompletedWidth = Math.max(15, startWidths.current.completed - deltaPercent);
        
        setColumnWidths(prev => ({
          ...prev,
          blocked: newBlockedWidth,
          completed: newCompletedWidth
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-primary-600 text-white shadow-lg z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-6 h-6" />
                <h1 className="text-xl font-bold">Task Manager</h1>
              </div>
              <div className="text-sm text-primary-100">
                Manage your tasks and dependencies
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Action Buttons */}
              <Button
                onClick={handleCreateEvent}
                variant="secondary"
                size="sm"
                className="bg-white text-primary-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Event
              </Button>
              
              <DatabaseManager 
                onDatabaseChange={handleDatabaseChange}
              />
              
              <TagSortManager 
                trigger={
                  <Button variant="ghost" size="sm" className="text-white hover:bg-primary-500">
                    <Settings className="w-4 h-4 mr-1" />
                    Sort Settings
                  </Button>
                }
              />
              
              <Button variant="ghost" size="sm" className="text-white hover:bg-primary-500">
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div 
        ref={containerRef}
        className="flex-1 flex p-4 gap-1 overflow-hidden h-0"
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        {/* Ready List */}
        <div 
          className="flex flex-col overflow-hidden h-full"
          style={{ width: `${columnWidths.ready}%`, minWidth: '200px' }}
        >
          <TaskList 
            title="Ready List" 
            status={EventStatus.Pending} 
            onEventSelect={handleEventSelect}
            onEventEdit={handleEditEvent}
            onEventDelete={handleDeleteEvent}
            onEventComplete={handleCompleteEvent}
            selectedEvent={selectedEvent}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDrop={handleTaskDrop}
            draggedEvent={draggedEvent}
          />
        </div>

        {/* Resizer between Ready and Blocked */}
        <div
          className={`w-2 cursor-col-resize flex items-center justify-center group hover:bg-gray-200 transition-colors ${
            isDragging === 'ready-blocked' ? 'bg-blue-200' : ''
          }`}
          onMouseDown={handleMouseDown('ready-blocked')}
        >
          <div className="w-1 h-8 bg-gray-300 rounded group-hover:bg-gray-400 transition-colors"></div>
        </div>

        {/* Blocked List */}
        <div 
          className="flex flex-col overflow-hidden h-full"
          style={{ width: `${columnWidths.blocked}%`, minWidth: '200px' }}
        >
          <TaskList 
            title="Blocked List" 
            status={EventStatus.Blocked} 
            onEventSelect={handleEventSelect}
            onEventEdit={handleEditEvent}
            onEventDelete={handleDeleteEvent}
            selectedEvent={selectedEvent}
            showDependencies={true}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDrop={handleTaskDrop}
            draggedEvent={draggedEvent}
          />
        </div>

        {/* Resizer between Blocked and Completed */}
        <div
          className={`w-2 cursor-col-resize flex items-center justify-center group hover:bg-gray-200 transition-colors ${
            isDragging === 'blocked-completed' ? 'bg-blue-200' : ''
          }`}
          onMouseDown={handleMouseDown('blocked-completed')}
        >
          <div className="w-1 h-8 bg-gray-300 rounded group-hover:bg-gray-400 transition-colors"></div>
        </div>

        {/* Completed List */}
        <div 
          className="flex flex-col overflow-hidden h-full"
          style={{ width: `${columnWidths.completed}%`, minWidth: '200px' }}
        >
          <TaskList 
            title="Completed List" 
            status={EventStatus.Completed} 
            onEventSelect={handleEventSelect}
            onEventEdit={handleEditEvent}
            onEventDelete={handleDeleteEvent}
            selectedEvent={selectedEvent}
            showDependencies={true}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDrop={handleTaskDrop}
            draggedEvent={draggedEvent}
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-6 py-2 z-10">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            {selectedEvent && (
              <span>Selected: {selectedEvent.name}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Todo Scheduler v0.1.0</span>
          </div>
        </div>
      </footer>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        event={editingEvent}
        mode={formMode}
      />
    </div>
  );
};