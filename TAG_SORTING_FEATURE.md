# Tag Sorting Feature Documentation

## Overview
The Tag Sorting Feature allows users to customize the display order of all tags and set sorting rules (ascending or descending) for each tag, enabling events in the lists to be sorted according to these settings while arranging tags in the user-specified order.

## Features Implemented

### 1. Tag Management Interface
- **Location**: Accessible via "Sort Settings" button in the top navigation bar
- **Interface**: Modal dialog with intuitive drag-and-drop functionality
- **Functionality**: Users can adjust the order of tag sorting rules

### 2. Individual Tag Sorting Rules
- **Ascending/Descending**: Each tag can be set to sort in ascending (ASC) or descending (DESC) order
- **Visual Indicators**: Clear icons (SortAsc/SortDesc) show the current sorting direction
- **Toggle Functionality**: Click the direction button to switch between ASC and DESC

### 3. Real-time Sorting in Event Lists
- **Immediate Effect**: Changes to sorting rules are applied instantly to all event lists
- **Multi-level Sorting**: Events are sorted by multiple tags in the order specified by the user
- **Fallback Sorting**: Events without specified tags fall back to alphabetical sorting

### 4. Persistent User Preferences
- **Local Storage**: Sorting preferences are saved using Zustand's persist middleware
- **Session Persistence**: Settings are maintained across browser sessions
- **Default State**: Sensible defaults when no custom sorting is configured

## Technical Implementation

### Components
1. **TagSortManager**: Main interface for managing tag sorting rules
2. **TagDisplay**: Component for displaying tags in the correct order
3. **TaskList**: Updated to use the sorting functionality
4. **MainLayout**: Integration point for the tag sorting interface

### State Management
- **Zustand Store**: Centralized state management for sorting preferences
- **Persist Middleware**: Automatic saving/loading of user preferences
- **Real-time Updates**: Immediate UI updates when preferences change

### Data Structure
```typescript
interface TagSortPreferences {
  enabled: boolean;
  tagSortRules: TagSortRule[];
}

interface TagSortRule {
  tagKey: string;
  direction: 'asc' | 'desc';
  order: number;
}
```

## User Guide

### How to Use Tag Sorting

1. **Enable Tag Sorting**
   - Click "Sort Settings" in the top navigation
   - Toggle the "Enable Tag Sorting" switch

2. **Add Tag Sort Rules**
   - Select a tag from the dropdown
   - Click "Add" to add it to the sorting rules
   - The tag will be added with ascending order by default

3. **Customize Sort Order**
   - **Reorder**: Drag and drop rules to change their priority
   - **Direction**: Click the ASC/DESC button to change sorting direction
   - **Remove**: Click the trash icon to remove a rule

4. **View Results**
   - Changes are applied immediately to all event lists
   - Events are sorted according to the rules in order of priority

### Sorting Logic

1. **Primary Sort**: Events are first sorted by the first tag rule
2. **Secondary Sort**: If values are equal, the second tag rule is applied
3. **Tertiary Sort**: Process continues through all tag rules
4. **Fallback**: Events without specified tags are sorted alphabetically

### Example Usage

If you have tags like `priority`, `category`, and `deadline`, you can:
- Set `priority` as the first rule (DESC) to show high-priority items first
- Set `deadline` as the second rule (ASC) to show urgent items next
- Set `category` as the third rule (ASC) for final organization

## Benefits

1. **Improved Organization**: Events are automatically organized according to user preferences
2. **Flexible Sorting**: Multiple sorting criteria can be combined
3. **User Control**: Complete customization of sorting behavior
4. **Persistent Settings**: Preferences are saved and restored automatically
5. **Real-time Updates**: Immediate feedback when making changes

## Future Enhancements

Potential improvements for future versions:
- **Conditional Sorting**: Different sorting rules for different event statuses
- **Advanced Filters**: Combine sorting with filtering capabilities
- **Export/Import**: Share sorting configurations between users
- **Sorting Templates**: Pre-defined sorting configurations for common use cases