import React, { useEffect, useState, useRef } from 'react';
import { TodoEvent, EventStatus } from '@/types';
import { useEventStore } from '@/store/eventStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TagDisplay } from './TagDisplay';

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
  onTaskDragStart?: (event: TodoEvent) => void;
  onTaskDragEnd?: () => void;
  onTaskDrop?: (targetStatus: EventStatus) => void;
  draggedEvent?: TodoEvent | null;
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
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDrop,
  draggedEvent,
}) => {
  const { events, fetchEvents, getEventDependencies, getSortedEvents } = useEventStore();
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [dependencies, setDependencies] = useState<Record<string, TodoEvent[]>>({});
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Mouse-based drag detection
  useEffect(() => {
    if (!draggedEvent) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check if mouse is over this container
      const isOverContainer = 
        mouseX >= containerRect.left &&
        mouseX <= containerRect.right &&
        mouseY >= containerRect.top &&
        mouseY <= containerRect.bottom;

      if (isOverContainer && draggedEvent.status !== status) {
        // Simulate dragged card dimensions
        const cardWidth = 300;
        const cardHeight = 120;
        
        // Calculate simulated card position (centered on mouse)
        const cardLeft = mouseX - cardWidth / 2;
        const cardRight = mouseX + cardWidth / 2;
        const cardTop = mouseY - cardHeight / 2;
        const cardBottom = mouseY + cardHeight / 2;

        // Calculate overlap
        const overlapLeft = Math.max(cardLeft, containerRect.left);
        const overlapRight = Math.min(cardRight, containerRect.right);
        const overlapTop = Math.max(cardTop, containerRect.top);
        const overlapBottom = Math.min(cardBottom, containerRect.bottom);

        const overlapWidth = Math.max(0, overlapRight - overlapLeft);
        const overlapHeight = Math.max(0, overlapBottom - overlapTop);
        const overlapArea = overlapWidth * overlapHeight;
        const cardArea = cardWidth * cardHeight;
        const overlapRatio = overlapArea / cardArea;

        console.log('🎯 Mouse drag detection for', title, {
          mouseX, mouseY,
          containerRect: { left: containerRect.left, right: containerRect.right, top: containerRect.top, bottom: containerRect.bottom },
          cardRect: { left: cardLeft, right: cardRight, top: cardTop, bottom: cardBottom },
          overlapArea,
          cardArea,
          overlapRatio: (overlapRatio * 100).toFixed(1) + '%',
          shouldHighlight: overlapRatio > 0.5
        });

        setIsDragOver(overlapRatio > 0.5);
      } else {
        setIsDragOver(false);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check if mouse is over this container when released
      const isOverContainer = 
        mouseX >= containerRect.left &&
        mouseX <= containerRect.right &&
        mouseY >= containerRect.top &&
        mouseY <= containerRect.bottom;

      if (isOverContainer && isDragOver && onTaskDrop && draggedEvent.status !== status) {
        console.log('🎯 Mouse-based drop on', title, 'with status:', status);
        onTaskDrop(status);
      }

      setIsDragOver(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedEvent, status, isDragOver, onTaskDrop, title]);

  // Filter events by status and apply sorting
  const baseFilteredEvents = events.filter(event => event.status === status);
  const filteredEvents = getSortedEvents(baseFilteredEvents);

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

  // Handle drag and drop events with area-based logic
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 handleDragEnter triggered for list:', title, 'draggedEvent:', draggedEvent?.name);
    
    if (draggedEvent && draggedEvent.status !== status) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 handleDragLeave triggered for list:', title);
    
    // 检查是否真的离开了容器
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 handleDrop triggered for list:', title, 'target status:', status);
    setIsDragOver(false);
    
    if (onTaskDrop && draggedEvent && draggedEvent.status !== status) {
      console.log('🎯 Calling onTaskDrop with status:', status);
      onTaskDrop(status);
    } else {
      console.log('🎯 Drop conditions not met:', {
        hasOnTaskDrop: !!onTaskDrop,
        hasDraggedEvent: !!draggedEvent,
        draggedEventStatus: draggedEvent?.status,
        targetStatus: status,
        statusDifferent: draggedEvent?.status !== status
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden transition-all ${
        isDragOver ? 'bg-gray-100 border-gray-400 shadow-md' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
                  data-event-id={event.id}
                  draggable={!!onTaskDragStart}
                  onDragStart={(e) => {
                    console.log('🎯 Card drag start:', event.name);
                    e.dataTransfer.effectAllowed = 'move';
                    
                    // 设置多种数据格式
                    e.dataTransfer.setData('text/plain', event.id);
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      id: event.id,
                      name: event.name,
                      status: event.status
                    }));
                    
                    if (onTaskDragStart) {
                      onTaskDragStart(event);
                    }
                  }}
                  onDragEnd={(e) => {
                    console.log('🎯 Card drag end:', event.name);
                    if (onTaskDragEnd) {
                      onTaskDragEnd();
                    }
                  }}
                  className={`
                    group transition-all duration-200 hover:shadow-md cursor-move
                    ${selectedEvent?.id === event.id 
                      ? 'ring-2 ring-primary-500 shadow-md' 
                      : 'hover:ring-1 hover:ring-gray-300'}
                    ${draggedEvent?.id === event.id ? 'opacity-50' : ''}
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
                        <TagDisplay tags={event.tags || {}} className="mb-2" />

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