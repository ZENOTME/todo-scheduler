import React from 'react';
import { useEventStore } from '@/store/eventStore';
import { Badge } from '@/components/ui/badge';

interface TagDisplayProps {
  tags: Record<string, string>;
  className?: string;
}

// Predefined color palette for tag keys
const TAG_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
];

// Hash function to convert string to number
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Get color for a tag key
const getTagColor = (tagKey: string) => {
  const hash = hashString(tagKey);
  const colorIndex = hash % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
};

export const TagDisplay: React.FC<TagDisplayProps> = ({ tags, className = "" }) => {
  const { sortPreferences } = useEventStore();

  // Sort tags based on user preferences - must be called before any conditional returns
  const sortedTags = React.useMemo(() => {
    // Safely handle undefined or null tags
    if (!tags || Object.keys(tags).length === 0) {
      return [];
    }
    
    const tagEntries = Object.entries(tags);
    
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
  }, [tags, sortPreferences]);

  // Return null after all hooks have been called
  if (sortedTags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sortedTags.map(([key, value]) => {
        const color = getTagColor(key);
        return (
          <Badge 
            key={key} 
            variant="outline" 
            className={`text-xs ${color.bg} ${color.text} ${color.border} border`}
          >
            {key}: {value}
          </Badge>
        );
      })}
    </div>
  );
};