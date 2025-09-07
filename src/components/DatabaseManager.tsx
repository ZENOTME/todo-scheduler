import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  FolderOpen, 
  Plus, 
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import * as dialog from '@tauri-apps/plugin-dialog';

interface DatabaseManagerProps {
  trigger?: React.ReactNode;
  onDatabaseChange?: (dbPath: string) => void;
}

interface DatabaseInfo {
  path: string;
  name: string;
  lastModified: string;
  size: string;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ 
  trigger, 
  onDatabaseChange 
}) => {
  const [open, setOpen] = useState(false);
  const [currentDbPath, setCurrentDbPath] = useState<string>('');
  const [recentDatabases, setRecentDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load recent databases and current database info
  React.useEffect(() => {
    if (open) {
      loadDatabaseInfo();
    }
  }, [open]);

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      // Get current database path
      const currentPath = await invoke<string>('get_current_database_path');
      setCurrentDbPath(currentPath);
      
      // Get recent databases
      const recent = await invoke<DatabaseInfo[]>('get_recent_databases');
      setRecentDatabases(recent);
    } catch (err) {
      setError(`Failed to load database info: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewDatabase = async () => {
    try {
      setError('');
      setSuccess('');
      
      // Open save dialog to choose location and name
      const filePath = await dialog.save({
        title: 'Create New Database',
        defaultPath: 'todo-database.db',
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }]
      });

      if (!filePath) return;

      setLoading(true);
      
      // Create new database
      await invoke('create_new_database', { path: filePath });
      
      // Switch to the new database
      await invoke('switch_database', { path: filePath });
      
      setCurrentDbPath(filePath);
      setSuccess(`New database created successfully at: ${filePath}`);
      
      // Notify parent component
      if (onDatabaseChange) {
        onDatabaseChange(filePath);
      }
      
      // Refresh recent databases
      await loadDatabaseInfo();
      
    } catch (err) {
      setError(`Failed to create database: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExistingDatabase = async () => {
    try {
      setError('');
      setSuccess('');
      
      // Open file dialog to choose existing database
      const filePath = await dialog.open({
        title: 'Load Existing Database',
        multiple: false,
        filters: [{
          name: 'Database Files',
          extensions: ['db', 'sqlite', 'sqlite3']
        }]
      });

      if (!filePath) return;

      setLoading(true);
      
      // Validate and load the database
      await invoke('validate_database', { path: filePath });
      await invoke('switch_database', { path: filePath });
      
      setCurrentDbPath(filePath as string);
      setSuccess(`Database loaded successfully: ${filePath}`);
      
      // Notify parent component
      if (onDatabaseChange) {
        onDatabaseChange(filePath as string);
      }
      
      // Refresh recent databases
      await loadDatabaseInfo();
      
    } catch (err) {
      setError(`Failed to load database: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRecentDatabase = async (dbInfo: DatabaseInfo) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Validate and load the database
      await invoke('validate_database', { path: dbInfo.path });
      await invoke('switch_database', { path: dbInfo.path });
      
      setCurrentDbPath(dbInfo.path);
      setSuccess(`Database loaded successfully: ${dbInfo.name}`);
      
      // Notify parent component
      if (onDatabaseChange) {
        onDatabaseChange(dbInfo.path);
      }
      
    } catch (err) {
      setError(`Failed to load database: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="text-white hover:bg-primary-500">
      <Database className="w-4 h-4 mr-2" />
      Database
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Database Manager
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 pb-6">
            
            {/* Status Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Current Database */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Database</CardTitle>
              </CardHeader>
              <CardContent>
                {currentDbPath ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-blue-900">
                        {currentDbPath.split('/').pop() || currentDbPath.split('\\').pop()}
                      </div>
                      <div className="text-xs text-blue-600 truncate" title={currentDbPath}>
                        {currentDbPath}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No database loaded</div>
                )}
              </CardContent>
            </Card>

            {/* Database Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Database Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleCreateNewDatabase}
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Database
                </Button>
                
                <Button 
                  onClick={handleLoadExistingDatabase}
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Load Existing Database
                </Button>
              </CardContent>
            </Card>

            {/* Recent Databases */}
            {recentDatabases.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Databases</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {recentDatabases.map((db, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleLoadRecentDatabase(db)}
                        >
                          <Database className="w-4 h-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{db.name}</div>
                            <div className="text-xs text-gray-500 truncate" title={db.path}>
                              {db.path}
                            </div>
                            <div className="text-xs text-gray-400">
                              Modified: {db.lastModified} • Size: {db.size}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Help Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Create New Database:</strong> Creates a new empty database at the specified location.</p>
                  <p><strong>Load Existing Database:</strong> Opens an existing database file (.db, .sqlite, .sqlite3).</p>
                  <p><strong>Recent Databases:</strong> Quick access to recently used databases.</p>
                  <p className="text-xs text-gray-500 mt-3">
                    Note: Switching databases will reload all events from the selected database.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};