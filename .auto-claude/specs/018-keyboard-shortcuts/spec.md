# Keyboard Shortcuts System

## Overview
Implement a comprehensive keyboard shortcuts system for the AFL Coaching Board application to enable power users and presenters to access common operations without clicking through menus. This feature will provide quick camera preset switching (keys 1-4), tool selection shortcuts, standard editing operations (save, undo), animation controls (spacebar), and a discoverable help overlay (? key). The system must intelligently handle keyboard events without conflicting with browser defaults and should disable shortcuts when typing in input fields.


## Workflow Type

**Type**: feature

**Rationale**: This is a new feature addition that introduces a keyboard shortcuts system to the existing application. It adds new functionality without modifying the core architecture of camera presets, tools, or animation systems, making it a feature workflow rather than a refactor or migration.

## Task Scope

### Services Involved
- **main** (primary) - React/TypeScript frontend application where keyboard shortcuts will be implemented

### This Task Will:
- [ ] Implement camera preset shortcuts (keys 1, 2, 3, 4) for quick view switching during presentations
- [ ] Add tool selection shortcuts (S for select, D for draw, and other tools as needed)
- [ ] Implement standard editing shortcuts (Ctrl+S for save, Ctrl+Z for undo, Ctrl+Shift+Z or Ctrl+Y for redo)
- [ ] Add spacebar shortcut for play/pause animation
- [ ] Create keyboard shortcut help overlay triggered by ? key
- [ ] Implement focus management to disable shortcuts when typing in text inputs
- [ ] Use event.preventDefault() to prevent browser default behaviors for captured shortcuts
- [ ] Create a centralized keyboard event handler system with registration/deregistration capabilities

### Out of Scope:
- Customizable keyboard shortcuts (user-defined mappings)
- Keyboard shortcut configuration UI
- Exporting/importing shortcut preferences
- Multi-key chord shortcuts (e.g., Ctrl+K Ctrl+S)
- Context-specific shortcuts based on selected objects
- Modifications to the underlying camera, tool, or animation systems themselves

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Tailwind CSS
- State Management: Zustand
- 3D Library: Three.js with @react-three/fiber and @react-three/drei
- Animation: Framer Motion

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `react` - UI framework
- `zustand` - State management (likely used for camera presets, tool selection, animation state)
- `three` / `@react-three/fiber` / `@react-three/drei` - 3D rendering and camera controls
- `framer-motion` - Animation system

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/hooks/useKeyboardShortcuts.tsx` | main | Create new custom hook to manage keyboard event listeners and shortcut registration |
| `src/components/KeyboardShortcutsHelp.tsx` | main | Create new help overlay component to display available shortcuts |
| `src/App.tsx` | main | Integrate useKeyboardShortcuts hook at the root level |
| `src/stores/*` | main | Locate and integrate with existing Zustand stores for camera presets, tools, and animation |
| `src/types/shortcuts.ts` | main | Create TypeScript types for shortcut definitions and handlers |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/stores/*` | Zustand store patterns for accessing camera preset actions, tool selection, save/undo, and animation controls |
| `src/App.tsx` | Application root structure and hook integration patterns |
| `src/components/*` | React component patterns with TypeScript and Tailwind CSS styling |
| `src/hooks/*` | Custom hook patterns for side effects and event handling |

## Patterns to Follow

### Zustand Store Integration

Zustand stores likely exist for camera, tools, and animation state. The keyboard shortcuts will need to call store actions:

```typescript
// Example pattern from existing stores
import { create } from 'zustand';

interface CameraStore {
  activePreset: number;
  setPreset: (preset: number) => void;
}

const useCameraStore = create<CameraStore>((set) => ({
  activePreset: 1,
  setPreset: (preset) => set({ activePreset: preset }),
}));

// In keyboard handler
const { setPreset } = useCameraStore();
```

**Key Points:**
- Use store selectors to access actions without causing unnecessary re-renders
- Call store actions directly from keyboard event handlers
- Don't duplicate state - rely on existing stores

### Custom Hook with useEffect

```typescript
// Pattern for keyboard event listeners
import { useEffect } from 'react';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

**Key Points:**
- Attach to window for global shortcuts
- Clean up event listeners on unmount
- Include dependencies in useEffect array

### Focus Detection Pattern

```typescript
// Disable shortcuts when typing in inputs
const isTyping = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tagName) ||
         target.isContentEditable;
};
```

**Key Points:**
- Check if the active element is an input field
- Also check for contentEditable elements
- Return early if user is typing

## Requirements

### Functional Requirements

1. **Camera Preset Switching**
   - Description: Number keys 1-4 switch between saved camera presets
   - Acceptance: Pressing 1 switches to preset 1, 2 to preset 2, etc. immediately without delay

2. **Tool Selection Shortcuts**
   - Description: Single-key shortcuts select tools (S for select, D for draw)
   - Acceptance: Pressing S activates select tool, D activates draw tool, visible in UI

3. **Standard Editing Operations**
   - Description: Ctrl+S saves, Ctrl+Z undos, Ctrl+Shift+Z or Ctrl+Y redos
   - Acceptance: Shortcuts trigger save/undo/redo functionality with visual feedback

4. **Animation Control**
   - Description: Spacebar plays/pauses animation
   - Acceptance: Spacebar toggles animation state, animation starts/stops as expected

5. **Help Overlay**
   - Description: ? key displays keyboard shortcuts help
   - Acceptance: Pressing ? shows modal/overlay with all shortcuts, dismissible with Esc or clicking outside

6. **Browser Conflict Prevention**
   - Description: Captured shortcuts prevent browser default behavior
   - Acceptance: Ctrl+S doesn't open browser save dialog, shortcuts work as expected

7. **Input Field Handling**
   - Description: Shortcuts disabled when typing in text fields
   - Acceptance: Typing "S" in a text input doesn't change tools, normal typing works

### Edge Cases

1. **Multiple Keys Pressed Simultaneously** - Only process the first recognized shortcut, ignore others
2. **Modifier Keys on Mac vs Windows** - Detect platform and use Cmd on Mac, Ctrl on Windows
3. **Non-English Keyboards** - Use event.code instead of event.key for reliable detection
4. **Rapid Key Presses** - Debounce or throttle if needed to prevent duplicate actions
5. **Browser Extensions Capturing Keys** - Document that some shortcuts may be overridden by extensions
6. **Help Overlay While Animating** - Pause animation when help is shown, resume on close
7. **Invalid Camera Preset Numbers** - Ignore keys 5-9-0 if only 4 presets exist

## Implementation Notes

### DO
- Use `event.preventDefault()` for captured shortcuts to prevent browser defaults
- Check `document.activeElement` to detect if user is typing in an input
- Use `event.code` for reliable key detection across keyboard layouts
- Store shortcut definitions in a centralized registry for maintainability
- Use Zustand stores for accessing camera, tool, and animation actions
- Make the help overlay accessible with keyboard navigation (Tab, Esc)
- Test shortcuts on both Windows (Ctrl) and Mac (Cmd)
- Use TypeScript interfaces to define shortcut handler signatures

### DON'T
- Don't attach listeners to individual components - use a global handler
- Don't create new state for camera presets, tools, etc. - use existing stores
- Don't capture essential browser shortcuts (Ctrl+T, Ctrl+W, F5, etc.)
- Don't process shortcuts when modals or dialogs are open (unless it's the help overlay)
- Don't use `event.key` alone - it varies by keyboard layout
- Don't forget to clean up event listeners to prevent memory leaks
- Don't make shortcuts case-sensitive - normalize to lowercase

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Main Application: http://localhost:3000

### Required Environment Variables
None required for this feature (uses existing environment)

## Success Criteria

The task is complete when:

1. [ ] Camera presets 1-4 can be switched using number keys during presentations
2. [ ] Tool selection works with S (select), D (draw), and other defined tool shortcuts
3. [ ] Ctrl+S saves without opening browser save dialog
4. [ ] Ctrl+Z undos last action, Ctrl+Shift+Z or Ctrl+Y redos
5. [ ] Spacebar plays and pauses animation
6. [ ] ? key displays help overlay showing all available shortcuts
7. [ ] Typing in text inputs doesn't trigger shortcuts
8. [ ] No console errors or warnings
9. [ ] Existing functionality (camera presets, tools, animation) still works via mouse/UI
10. [ ] Shortcuts work on both Windows (Ctrl) and Mac (Cmd) where applicable
11. [ ] Help overlay is dismissible with Esc key or clicking outside
12. [ ] All shortcuts documented in help overlay match implementation

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Keyboard event handler | `src/hooks/useKeyboardShortcuts.test.tsx` | Key press detection, preventDefault called, correct actions dispatched |
| Focus detection | `src/hooks/useKeyboardShortcuts.test.tsx` | Shortcuts disabled when typing in input/textarea/contentEditable |
| Shortcut registry | `src/types/shortcuts.test.ts` | Shortcut definitions are valid, no duplicate bindings |
| Help overlay | `src/components/KeyboardShortcutsHelp.test.tsx` | Renders all shortcuts, dismissible with Esc, accessible |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Camera preset switching | main | Number keys 1-4 call camera store actions, camera view changes |
| Tool selection | main | S and D keys call tool store actions, active tool changes |
| Save/undo/redo | main | Ctrl+S, Ctrl+Z, Ctrl+Shift+Z trigger correct store actions |
| Animation control | main | Spacebar calls animation store play/pause action, animation responds |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Presentation workflow | 1. Load board 2. Press 1, 2, 3, 4 keys 3. Observe camera | Camera smoothly switches between all 4 presets |
| Drawing workflow | 1. Press D key 2. Draw on canvas 3. Press S key 4. Click object | Draw tool activated, line drawn, select tool activated, object selected |
| Edit workflow | 1. Make change 2. Ctrl+Z 3. Ctrl+Shift+Z 4. Ctrl+S | Change undone, change redone, board saved |
| Help discovery | 1. Press ? key 2. Read shortcuts 3. Press Esc | Help overlay shown, all shortcuts visible, overlay dismissed |
| Input protection | 1. Click text input 2. Type "S" 3. Type "123" | Characters typed normally, tools/camera not changed |

### Browser Verification
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Application | `http://localhost:3000` | All shortcuts work, no browser save dialog on Ctrl+S |
| Help Overlay | `http://localhost:3000` (press ?) | Help overlay displays, all shortcuts documented, Esc closes |
| With Animation | `http://localhost:3000` (with animation) | Spacebar plays/pauses, help overlay doesn't break animation |

### Manual Testing Checklist
| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Camera shortcuts | Press keys 1, 2, 3, 4 rapidly | Camera switches smoothly without errors |
| Tool shortcuts | Press S, D alternately | Tools switch immediately |
| Save shortcut | Press Ctrl+S | Board saves, no browser dialog |
| Undo/redo | Make change, Ctrl+Z, Ctrl+Shift+Z | Change undone and redone |
| Animation control | Press spacebar multiple times | Animation plays/pauses reliably |
| Help overlay | Press ?, read, press Esc | Help shows and dismisses |
| Input focus | Click input, type S, D, 1, 2 | Characters typed, no shortcuts triggered |
| Mac compatibility | Test on Mac with Cmd key | Cmd+S, Cmd+Z work (if Mac available) |

### QA Sign-off Requirements
- [ ] All unit tests pass (or created if none exist)
- [ ] All integration tests pass (or created if none exist)
- [ ] All E2E test scenarios verified manually
- [ ] Browser verification complete (Chrome, Firefox, Safari)
- [ ] Manual testing checklist complete
- [ ] No regressions in existing camera, tool, animation functionality
- [ ] Code follows React/TypeScript/Zustand patterns established in codebase
- [ ] No console errors or warnings
- [ ] Help overlay accessible via keyboard only (Tab, Esc)
- [ ] Shortcuts work on Windows (Ctrl) and Mac (Cmd) where applicable
- [ ] No security vulnerabilities (XSS, etc.)
- [ ] Performance impact negligible (no lag on keypress)
