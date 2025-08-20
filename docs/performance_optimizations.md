# Performance Optimization Summary: Resolving Text Selection Rendering Issues

## Problem Diagnosis
Users reported difficulty selecting text in chat messages, suspecting continuous rendering as the cause. Analysis identified several performance bottlenecks:

1. **Frequent component re-renders**: The entire MessageList re-renders every time the text selection changes.
2. **Repeated calculations**: The `normalizeMessage` function recalculates on every render.
3. **Redundant TextSelectionMenu instances**: A selection menu component is created for each message.
4. **Unoptimized selection detection**: Frequent DOM queries and state updates.

## Implemented Optimizations

### 1. Component Separation and Memoization
- **Created independent `Message` component**: Wrapped with `React.memo` to avoid unnecessary re-renders.
- **Optimized `MarkdownRenderer`**: Used `React.memo`, re-rendering only when content changes.
- **Cached computation results**: Used `useMemo` to cache `normalizedMessages`.

### 2. TextSelectionMenu Optimization
- **Single instance**: Changed from one menu per message to a single global menu.
- **Smart context detection**: Automatically detect the message context of selected text via DOM attributes.
- **Reduced component tree**: Removed redundant component instances.

### 3. Text Selection Detection Optimization
- **Debounce handling**: Added 100ms debounce to avoid frequent state updates.
- **Passive event listening**: Used `{ passive: true }` to improve scroll performance.
- **Intelligent state updates**: Update state only when the selected text actually changes.
- **Improved selector logic**: Included `[data-message-role]` selector.

### 4. Callback Function Optimization
- **Used `useCallback`**: Prevent function reference changes that cause re-renders.
- **Reduced dependencies**: Optimized hook dependency arrays.

## Specific Changes

### File Changes:
1. **Added**: `src/components/chat/Message.tsx` - Independent message component.
2. **Optimized**: `src/components/chat/MessageList.tsx` - Performance-optimized message list.
3. **Optimized**: `src/components/chat/TextSelectionMenu.tsx` - Single-instance selection menu.
4. **Optimized**: `src/components/chat/MarkdownRenderer.tsx` - Memoized renderer.
5. **Optimized**: `src/hooks/useTextSelection.ts` - Debounced and optimized selection detection.

### Performance Improvements:
- ✅ **Reduced re-renders**: Message components re-render only when their own content changes.
- ✅ **Optimized selection experience**: Text selection is smoother and uninterrupted by rendering.
- ✅ **Memory optimization**: Reduced number of component instances.
- ✅ **CPU optimization**: Reduced unnecessary computations and DOM operations.

## User Experience Improvements

### Before:
- Text selection was frequently interrupted.
- Multiple instances of selection menus could appear.
- UI response was delayed.

### Now:
- Text selection is smooth and stable.
- Floating menu is accurately positioned.
- UI responds quickly.
- Selection operations no longer trigger unnecessary re-renders.

## Technical Highlights

1. **React.memo**: Prevent unnecessary component re-renders.
2. **useMemo/useCallback**: Cache computed results and function references.
3. **Debounce mechanism**: Reduce high-frequency state updates.
4. **Smart selectors**: Pass context information via DOM attributes.
5. **Single-instance pattern**: Reduce the number of component instances.

These optimizations significantly improve the text selection user experience and resolve selection interruptions caused by rendering.