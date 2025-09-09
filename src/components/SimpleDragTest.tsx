import React, { useState } from 'react';
import { TodoEvent, EventStatus } from '@/types';

interface SimpleDragTestProps {
  draggedEvent?: TodoEvent | null;
  onTaskDrop?: (targetStatus: EventStatus) => void;
  status: EventStatus;
  title: string;
}

export const SimpleDragTest: React.FC<SimpleDragTestProps> = ({
  draggedEvent,
  onTaskDrop,
  status,
  title
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Simple drag over:', title);
    
    // 必须设置dropEffect才能正确处理拖放
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedEvent && draggedEvent.status !== status) {
      setIsDragOver(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Simple drag enter:', title);
    
    if (draggedEvent && draggedEvent.status !== status) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Simple drag leave:', title);
    
    // 检查是否真的离开了容器
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Simple drop:', title);
    
    setIsDragOver(false);
    
    // 获取拖拽的数据
    const draggedData = e.dataTransfer.getData('application/json');
    console.log('🎯 Dropped data:', draggedData);
    
    if (onTaskDrop && draggedEvent && draggedEvent.status !== status) {
      onTaskDrop(status);
    }
  };

  return (
    <div
      className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="text-gray-500">
        {isDragOver ? `Drop here for ${title}` : `${title} Drop Zone`}
      </span>
    </div>
  );
};