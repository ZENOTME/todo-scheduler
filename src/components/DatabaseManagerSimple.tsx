import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export const DatabaseManagerSimple: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleCreateDatabase = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Use Tauri's built-in dialog commands instead of plugin
      const filePath = await invoke<string | null>('show_save_dialog', {
        title: 'Create New Database',
        defaultPath: 'todo-database.db',
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }]
      });

      if (!filePath) {
        setMessage('No file selected');
        return;
      }

      await invoke('create_new_database', { path: filePath });
      await invoke('switch_database', { path: filePath });
      
      setMessage(`Database created successfully: ${filePath}`);
      
    } catch (err) {
      setMessage(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDatabase = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Use Tauri's built-in dialog commands instead of plugin
      const filePath = await invoke<string | null>('show_open_dialog', {
        title: 'Load Existing Database',
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }]
      });

      if (!filePath) {
        setMessage('No file selected');
        return;
      }

      await invoke('validate_database', { path: filePath });
      await invoke('switch_database', { path: filePath });
      
      setMessage(`Database loaded successfully: ${filePath}`);
      
    } catch (err) {
      setMessage(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-white hover:bg-primary-500"
        onClick={handleCreateDatabase}
        disabled={loading}
      >
        <Database className="w-4 h-4 mr-2" />
        New DB
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-white hover:bg-primary-500"
        onClick={handleLoadDatabase}
        disabled={loading}
      >
        Load DB
      </Button>
      
      {message && (
        <div className="text-xs text-white bg-black bg-opacity-20 px-2 py-1 rounded">
          {message}
        </div>
      )}
    </div>
  );
};