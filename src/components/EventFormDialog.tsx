import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TodoEvent, EventStatus, CreateEventRequest, UpdateEventRequest } from '@/types';
import { useEventStore } from '@/store/eventStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Tag, Users } from 'lucide-react';

const eventSchema = z.object({
  name: z.string().min(1, '事件名称不能为空').max(100, '事件名称不能超过100个字符'),
  description: z.string().max(500, '描述不能超过500个字符'),
  status: z.nativeEnum(EventStatus),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: TodoEvent | null;
  mode: 'create' | 'edit';
}

export const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  onOpenChange,
  event,
  mode,
}) => {
  const { events, createEvent, updateEvent, loading } = useEventStore();
  const [tags, setTags] = useState<Record<string, string>>({});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      status: EventStatus.Pending,
    },
  });

  const watchedStatus = watch('status');

  // Initialize form when event changes
  useEffect(() => {
    if (event && mode === 'edit') {
      reset({
        name: event.name,
        description: event.description,
        status: event.status,
      });
      setTags(event.tags);
      setDependencies(event.dependencies);
    } else {
      reset({
        name: '',
        description: '',
        status: EventStatus.Pending,
      });
      setTags({});
      setDependencies([]);
    }
  }, [event, mode, reset]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setTags({});
      setDependencies([]);
      setNewTagKey('');
      setNewTagValue('');
    }
  }, [open, reset]);

  const onSubmit = async (data: EventFormData) => {
    try {
      if (mode === 'create') {
        const request: CreateEventRequest = {
          name: data.name,
          description: data.description,
          tags,
          dependencies,
        };
        await createEvent(request);
      } else if (event) {
        const request: UpdateEventRequest = {
          id: event.id,
          name: data.name,
          description: data.description,
          status: data.status,
          tags,
          dependencies,
        };
        await updateEvent(request);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const addTag = () => {
    if (newTagKey.trim() && newTagValue.trim()) {
      setTags(prev => ({
        ...prev,
        [newTagKey.trim()]: newTagValue.trim(),
      }));
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const removeTag = (key: string) => {
    setTags(prev => {
      const newTags = { ...prev };
      delete newTags[key];
      return newTags;
    });
  };

  const toggleDependency = (eventId: string) => {
    setDependencies(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  };

  const getStatusText = (status: EventStatus) => {
    switch (status) {
      case EventStatus.Pending:
        return '待办';
      case EventStatus.InProgress:
        return '进行中';
      case EventStatus.Completed:
        return '已完成';
      case EventStatus.Blocked:
        return '已阻塞';
      default:
        return '未知';
    }
  };

  const availableEvents = events.filter(e => e.id !== event?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '创建新事件' : '编辑事件'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? '填写事件信息，设置标签和依赖关系。' 
              : '修改事件信息，更新标签和依赖关系。'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">事件名称 *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="输入事件名称"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="输入事件描述"
                  rows={3}
                  className="mt-1"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status">状态</Label>
                <Select
                  value={watchedStatus}
                  onValueChange={(value) => setValue('status', value as EventStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EventStatus.Pending}>待办</SelectItem>
                    <SelectItem value={EventStatus.InProgress}>进行中</SelectItem>
                    <SelectItem value={EventStatus.Completed}>已完成</SelectItem>
                    <SelectItem value={EventStatus.Blocked}>已阻塞</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Tags Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4" />
                <Label className="text-base font-medium">标签管理</Label>
              </div>

              {/* Existing Tags */}
              {Object.keys(tags).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">当前标签</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tags).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="flex items-center space-x-1">
                        <span>{key}: {value}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(key)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Tag */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">添加新标签</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="标签名"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="标签值"
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    size="sm"
                    disabled={!newTagKey.trim() || !newTagValue.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dependencies Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <Label className="text-base font-medium">依赖关系</Label>
              </div>

              {availableEvents.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    选择此事件依赖的其他事件 ({dependencies.length} 个已选择)
                  </Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {availableEvents.map((availableEvent) => (
                      <div key={availableEvent.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dep-${availableEvent.id}`}
                          checked={dependencies.includes(availableEvent.id)}
                          onCheckedChange={() => toggleDependency(availableEvent.id)}
                        />
                        <Label
                          htmlFor={`dep-${availableEvent.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{availableEvent.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getStatusText(availableEvent.status)}
                            </Badge>
                          </div>
                          {availableEvent.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {availableEvent.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  暂无其他事件可选择为依赖
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {loading ? '保存中...' : (mode === 'create' ? '创建事件' : '保存更改')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};