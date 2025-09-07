import React from 'react';
import { useEventStore } from '@/store/eventStore';
import { Badge } from '@/components/ui/badge';

interface TagDisplayProps {
  tags: Record<string, string>;
  className?: string;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({ tags, className = "" }) => {
  const { sortPreferences } = useEventStore();

  if (Object.keys(tags).length === 0) {
    return null;
  }

  const tagEntries = Object.entries(tags);

  // Sort tags based on user preferences
  const sortedTags = React.useMemo(() => {
    if (sortPreferences.enabled && sortPreferences.tagSortRules.length > 0) {
      return [...tagEntries].sort(([keyA], [keyB]) => {
        const ruleA = sortPreferences.tagSortRules.find(rule => rule.tagKey === keyA);
        const ruleB = sortPreferences.tagSortRules.find(rule => rule.tagKey === keyB);
        
        // If both have rules, sort by order
        if (ruleA && ruleB) {
          return ruleA.order - ruleB.order;
        }
        
        // If only one has a rule, prioritize it
        if (ruleA) return -1;
        if (ruleB) return 1;
        
        // If neither has a rule, sort alphabetically
        return keyA.localeCompare(keyB);
      });
    }
    
    // Default alphabetical sorting
    return tagEntries.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  }, [tagEntries, sortPreferences]);

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sortedTags.map(([key, value]) => (
        <Badge key={key} variant="outline" className="text-xs">
          {key}: {value}
        </Badge>
      ))}
    </div>
  );
};