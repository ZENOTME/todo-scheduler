import React, { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { TagSortRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  SortAsc,
  SortDesc
} from 'lucide-react';

interface TagSortManagerProps {
  trigger?: React.ReactNode;
}

export const TagSortManager: React.FC<TagSortManagerProps> = ({ trigger }) => {
  const { 
    events, 
    sortPreferences, 
    setSortPreferences, 
    updateTagSortRule, 
    removeTagSortRule, 
    reorderTagSortRules 
  } = useEventStore();
  
  const [open, setOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Extract all unique tag keys from events
  useEffect(() => {
    const tagKeys = new Set<string>();
    events.forEach(event => {
      // Safely handle undefined or null tags
      if (event.tags) {
        Object.keys(event.tags).forEach(key => tagKeys.add(key));
      }
    });
    setAvailableTags(Array.from(tagKeys).sort());
  }, [events]);

  const handleToggleSort = (enabled: boolean) => {
    setSortPreferences({
      ...sortPreferences,
      enabled,
    });
  };

  const handleAddTagRule = () => {
    if (selectedTag && !sortPreferences.tagSortRules.find(rule => rule.tagKey === selectedTag)) {
      const newOrder = sortPreferences.tagSortRules.length;
      updateTagSortRule(selectedTag, 'asc', newOrder);
      setSelectedTag('');
    }
  };

  const handleRemoveTagRule = (tagKey: string) => {
    removeTagSortRule(tagKey);
  };

  const handleDirectionChange = (tagKey: string, direction: 'asc' | 'desc') => {
    const rule = sortPreferences.tagSortRules.find(r => r.tagKey === tagKey);
    if (rule) {
      updateTagSortRule(tagKey, direction, rule.order);
    }
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const rules = [...sortPreferences.tagSortRules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < rules.length) {
      // Swap the rules
      [rules[index], rules[targetIndex]] = [rules[targetIndex], rules[index]];
      
      // Update order values
      rules.forEach((rule, idx) => {
        rule.order = idx;
      });
      
      reorderTagSortRules(rules);
    }
  };



  const getTagValuePreview = (tagKey: string) => {
    const allValues = events
      .map(event => {
        // Safely handle undefined or null tags
        const tags = event.tags || {};
        return tags[tagKey];
      })
      .filter(Boolean);
    
    if (allValues.length === 0) return 'No values';
    
    // Get unique values and limit to first 2
    const uniqueValues = [...new Set(allValues)];
    const displayValues = uniqueValues.slice(0, 2).map(value => {
      // Truncate long values
      const str = String(value);
      return str.length > 15 ? str.substring(0, 15) + '...' : str;
    });
    
    // Show count and sample values
    const totalCount = uniqueValues.length;
    const sampleText = displayValues.join(', ');
    
    if (totalCount > 2) {
      return `${sampleText} (+${totalCount - 2} more)`;
    }
    
    return sampleText;
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Settings className="w-4 h-4 mr-2" />
      Sort Settings
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col tag-sort-dialog">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Tag Sort Manager
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4 tag-sort-scroll">
          <div className="space-y-6 pb-6">
          {/* Enable/Disable Sort */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Enable Tag Sorting
                <Switch
                  checked={sortPreferences.enabled}
                  onCheckedChange={handleToggleSort}
                />
              </CardTitle>
            </CardHeader>
            {sortPreferences.enabled && (
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600">
                  Events will be sorted based on the tag rules below. Rules are applied in order from top to bottom.
                </p>
              </CardContent>
            )}
          </Card>

          {/* Add New Tag Rule */}
          {sortPreferences.enabled && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Tag Sort Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a tag to sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags
                        .filter(tag => !sortPreferences.tagSortRules.find(rule => rule.tagKey === tag))
                        .map(tag => (
                          <SelectItem key={tag} value={tag}>
                            <div className="flex items-center justify-between w-full">
                              <span>{tag}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {getTagValuePreview(tag)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddTagRule}
                    disabled={!selectedTag}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Sort Rules */}
          {sortPreferences.enabled && sortPreferences.tagSortRules.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sort Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortPreferences.tagSortRules.map((rule, index) => (
                      <div
                        key={rule.tagKey}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                      >
                        
                        {/* Order Number */}
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        
                        {/* Tag Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{rule.tagKey}</div>
                          <div className="text-xs text-gray-500 truncate" title={`Values: ${getTagValuePreview(rule.tagKey)}`}>
                            Values: {getTagValuePreview(rule.tagKey)}
                          </div>
                        </div>
                        
                        {/* Direction Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDirectionChange(
                            rule.tagKey, 
                            rule.direction === 'asc' ? 'desc' : 'asc'
                          )}
                          className="flex items-center gap-1"
                        >
                          {rule.direction === 'asc' ? (
                            <>
                              <SortAsc className="w-3 h-3" />
                              ASC
                            </>
                          ) : (
                            <>
                              <SortDesc className="w-3 h-3" />
                              DESC
                            </>
                          )}
                        </Button>
                        
                        {/* Move Buttons */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveRule(index, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveRule(index, 'down')}
                            disabled={index === sortPreferences.tagSortRules.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTagRule(rule.tagKey)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};