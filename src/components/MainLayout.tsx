import React, { useState, useEffect } from 'react';
import { TodoEvent, EventStatus } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, HelpCircle, Plus } from 'lucide-react';
import { EventFormDialog } from './EventFormDialog';
import { TaskList } from './TaskList';
import { TagSortManager } from './TagSortManager';

export const MainLayout: React.FC = () => {
  const { events, deleteEvent, selectedEvent, setSelectedEvent, fetchEvents, updateEventStatus } = useEventStore();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingEvent, setEditingEvent] = useState<TodoEvent | null>(null);
  
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
      <div className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Ready List */}
        <TaskList 
          title="Ready List" 
          status={EventStatus.Pending} 
          onEventSelect={handleEventSelect}
          onEventEdit={handleEditEvent}
          onEventDelete={handleDeleteEvent}
          onEventComplete={handleCompleteEvent}
          selectedEvent={selectedEvent}
        />

        {/* Blocked List */}
        <TaskList 
          title="Blocked List" 
          status={EventStatus.Blocked} 
          onEventSelect={handleEventSelect}
          onEventEdit={handleEditEvent}
          onEventDelete={handleDeleteEvent}
          selectedEvent={selectedEvent}
          showDependencies={true}
        />

        {/* Completed List */}
        <TaskList 
          title="Completed List" 
          status={EventStatus.Completed} 
          onEventSelect={handleEventSelect}
          onEventEdit={handleEditEvent}
          onEventDelete={handleDeleteEvent}
          selectedEvent={selectedEvent}
          showDependencies={true}
        />
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