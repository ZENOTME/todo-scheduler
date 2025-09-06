import React, { useEffect, useState } from 'react';
import { TodoEvent, EventStatus } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Edit,
  Check
} from 'lucide-react';

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

const statusIcons = {
  [EventStatus.Pending]: <Clock className="w-4 h-4 text-yellow-500" />,
  [EventStatus.InProgress]: <AlertCircle className="w-4 h-4 text-blue-500" />,
  [EventStatus.Completed]: <CheckCircle className="w-4 h-4 text-green-500" />,
  [EventStatus.Blocked]: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusColors = {
  [EventStatus.Pending]: 'status-badge-pending',
  [EventStatus.InProgress]: 'bg-blue-100 text-blue-800 border-blue-200',
  [EventStatus.Completed]: 'status-badge-completed',
  [EventStatus.Blocked]: 'status-badge-blocked',
};

export const TaskList: React.FC<TaskListProps> = ({
  title,
  status,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  onEventComplete,
  selectedEvent,
  showDependencies = false,
}) => {
  const { events, fetchEvents, getEventDependencies } = useEventStore();
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [dependencies, setDependencies] = useState<Record<string, TodoEvent[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Re-fetch events when event status changes
  useEffect(() => {
    // Listen for event status changes and update UI in real-time
    const checkDependenciesStatus = () => {
      // If there are expanded events, reload their dependencies
      Object.entries(expandedEvents).forEach(([eventId, isExpanded]) => {
        if (isExpanded) {
          loadDependencies(eventId);
        }
      });
    };
    
    // Check dependency status when event list changes
    checkDependenciesStatus();
  }, [events]);

  // Filter events by status
  const filteredEvents = events.filter(event => event.status === status);

  // Toggle expand/collapse state
  const toggleExpand = async (eventId: string) => {
    setExpandedEvents(prev => {
      const newState = { ...prev, [eventId]: !prev[eventId] };
      
      // If expanding, load dependencies
      if (newState[eventId] && showDependencies) {
        loadDependencies(eventId);
      }
      
      return newState;
    });
  };

  // Load dependencies
  const loadDependencies = async (eventId: string) => {
    try {
      setLoading(true);
      const deps = await getEventDependencies(eventId);
      setDependencies(prev => ({ ...prev, [eventId]: deps }));
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          {status === EventStatus.Pending && (
            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
          )}
          {status === EventStatus.Blocked && (
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
          )}
          {status === EventStatus.Completed && (
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredEvents.length}
        </Badge>
      </div>

      {/* Event List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No {title.toLowerCase()}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.id} className="space-y-2">
                <Card
                  className={`
                    group transition-all duration-200 hover:shadow-md
                    ${selectedEvent?.id === event.id 
                      ? 'ring-2 ring-primary-500 shadow-md' 
                      : 'hover:ring-1 hover:ring-gray-300'}
                  `}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start">
                      {/* Expand/Collapse button (only shown in blocked list) */}
                      {showDependencies && event.dependencies.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(event.id);
                          }}
                        >
                          {expandedEvents[event.id] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      )}

                      {/* Event content */}
                      <div 
                        className="flex-1 cursor-pointer" 
                        onClick={() => onEventSelect(event)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {event.name}
                          </h3>
                          <div className="flex items-center space-x-1 ml-2">
                            {statusIcons[event.status]}
                          </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {/* Tags */}
                        {Object.keys(event.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(event.tags).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Bottom info */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            {status === EventStatus.Blocked && (
                              <span className="flex items-center">
                                <span className="mr-1">Waiting for dependencies:</span>
                                <Badge variant="outline" className={`text-xs ${statusColors[EventStatus.Pending]}`}>
                                  {event.dependencies.length} tasks
                                </Badge>
                              </span>
                            )}
                            {status === EventStatus.Pending && (
                              <span>Ready to execute</span>
                            )}
                            {status === EventStatus.Completed && (
                              <span>Completed: {formatDate(event.updated_at)}</span>
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Quick complete button - only shown in ready list */}
                            {status === EventStatus.Pending && onEventComplete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventComplete(event);
                                }}
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Mark as completed"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventEdit(event);
                              }}
                              className="h-6 w-6 p-0"
                              title="Edit event"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventDelete(event);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete event"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dependencies list (only shown when expanded) */}
                {showDependencies && expandedEvents[event.id] && (
                  <div className="pl-8 space-y-2 dependency-item">
                    <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                      <span>Dependencies ({event.dependencies.length})</span>
                      {loading && (
                        <span className="ml-2 text-xs text-gray-400">Loading...</span>
                      )}
                    </div>
                    
                    {!loading && dependencies[event.id]?.length > 0 ? (
                      dependencies[event.id].map(dep => (
                        <Card 
                          key={dep.id} 
                          className={`border-dashed hover:shadow-sm transition-all ${
                            dep.status === EventStatus.Completed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white'
                          }`}
                        >
                          <CardContent className="p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {statusIcons[dep.status]}
                                <span className="ml-2 text-xs font-medium">{dep.name}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${statusColors[dep.status]}`}
                              >
                                {dep.status === EventStatus.Pending && 'Pending'}
                                {dep.status === EventStatus.InProgress && 'In Progress'}
                                {dep.status === EventStatus.Completed && 'Completed'}
                                {dep.status === EventStatus.Blocked && 'Blocked'}
                              </Badge>
                            </div>
                            {dep.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {dep.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : !loading && (
                      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-md">
                        Unable to load dependencies or dependencies do not exist
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};