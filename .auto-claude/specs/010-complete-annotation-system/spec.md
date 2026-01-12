# Specification: Complete Annotation System

## Overview

Complete the partially implemented annotation system for the AFL coaching board application. This feature will enable coaches to add tactical context to plays through text labels, directional arrows, zone highlighting, and free-hand drawings. All annotations must persist with the playbook data, allowing coaches to communicate strategies, player responsibilities, and tactical notes effectively.

## Workflow Type

**Type**: feature

**Rationale**: This is new functionality being added to an existing application. The annotation layer is partially implemented but incomplete. This task will add four distinct annotation types (text, arrows, zones, free-hand) with full CRUD capabilities and persistence, representing a significant feature addition to the coaching board's capabilities.

## Task Scope

### Services Involved
- **main** (primary) - React/TypeScript frontend with Three.js field rendering, Zustand state management, and Dexie persistence

### This Task Will:
- [ ] Implement text label annotations with positioning anywhere on the field
- [ ] Implement arrow annotations with start/end point controls
- [ ] Implement zone highlighting with semi-transparent shape rendering
- [ ] Implement free-hand drawing capability on the field surface
- [ ] Create annotation data model and persistence layer in Dexie
- [ ] Build annotation toolbar/UI for creating and editing annotations
- [ ] Integrate annotations with playbook save/load system
- [ ] Implement delete and edit operations for individual annotations
- [ ] Add annotation rendering layer in Three.js scene

### Out of Scope:
- Advanced annotation features (curves, custom shapes, color palettes beyond basic selection)
- Annotation collaboration/sharing between users
- Annotation versioning or history
- Export annotations separately from playbooks
- Animation or dynamic annotations

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- 3D Rendering: Three.js (@react-three/fiber, @react-three/drei)
- State Management: Zustand
- Persistence: Dexie (IndexedDB)
- Styling: Tailwind CSS
- Animation: Framer Motion
- Key directories: src/

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/types/annotations.ts` | main | Create annotation type definitions (TextAnnotation, ArrowAnnotation, ZoneAnnotation, DrawingAnnotation) |
| `src/stores/annotationStore.ts` | main | Create Zustand store for annotation state management |
| `src/db/schema.ts` | main | Add annotations table to Dexie schema |
| `src/components/Field/AnnotationLayer.tsx` | main | Create/complete Three.js annotation rendering component |
| `src/components/UI/AnnotationToolbar.tsx` | main | Create annotation tool selection and controls UI |
| `src/components/Annotations/TextAnnotation.tsx` | main | Implement text label annotation component |
| `src/components/Annotations/ArrowAnnotation.tsx` | main | Implement arrow annotation component |
| `src/components/Annotations/ZoneAnnotation.tsx` | main | Implement zone highlighting component |
| `src/components/Annotations/DrawingAnnotation.tsx` | main | Implement free-hand drawing component |
| `src/services/playbookService.ts` | main | Add annotation serialization to playbook save/load |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/stores/*.ts` | Zustand store patterns for state management |
| `src/db/schema.ts` | Dexie database schema definition patterns |
| `src/types/*.ts` | TypeScript type definition conventions |
| `src/components/Field/*.tsx` | Three.js component patterns using @react-three/fiber |
| Existing playbook components | Save/load patterns for data persistence |

## Patterns to Follow

### Zustand Store Pattern

For annotation state management:

```typescript
interface AnnotationStore {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  activeToolType: AnnotationType | null;

  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  setActiveTool: (type: AnnotationType | null) => void;
}
```

**Key Points:**
- Use immer for immutable state updates (Zustand middleware)
- Keep store focused on annotation-specific state
- Separate concerns: UI state vs data state

### Dexie Schema Pattern

For annotation persistence:

```typescript
class PlaybookDatabase extends Dexie {
  annotations!: Table<Annotation>;

  constructor() {
    super('PlaybookDB');
    this.version(2).stores({
      annotations: '++id, playbookId, type, createdAt'
    });
  }
}
```

**Key Points:**
- Use auto-incrementing primary keys
- Index fields used for queries (playbookId for filtering)
- Version migrations for schema changes

### Three.js Component Pattern

For rendering annotations in the 3D scene:

```typescript
function AnnotationLayer() {
  const annotations = useAnnotationStore(state => state.annotations);

  return (
    <group name="annotation-layer">
      {annotations.map(annotation => (
        <AnnotationRenderer key={annotation.id} annotation={annotation} />
      ))}
    </group>
  );
}
```

**Key Points:**
- Use React Three Fiber declarative components
- Leverage @react-three/drei helpers for text, shapes
- Use groups for logical organization
- Keep rendering logic separate from interaction logic

## Requirements

### Functional Requirements

1. **Text Label Annotations**
   - Description: Allow placement of text labels at any 3D position on the field
   - Acceptance: User can click "Text" tool, click field location, enter text, and see label rendered with editable text and position

2. **Arrow Annotations**
   - Description: Draw directional arrows between two points on the field
   - Acceptance: User can click "Arrow" tool, click start point, drag to end point, and see arrow with adjustable endpoints

3. **Zone Highlighting**
   - Description: Create semi-transparent shapes to highlight areas of the field
   - Acceptance: User can click "Zone" tool, define shape bounds (rectangle/circle), and see semi-transparent overlay with adjustable size/position

4. **Free-hand Drawing**
   - Description: Allow direct sketching on the field surface
   - Acceptance: User can click "Draw" tool, drag mouse to create continuous path, and see rendered stroke with smooth curves

5. **Annotation Persistence**
   - Description: All annotations must save with playbook data and reload when playbook is opened
   - Acceptance: Create annotations, save playbook, close/reopen app, load playbook - all annotations appear exactly as created

6. **Annotation Editing**
   - Description: Individual annotations can be selected, edited, and deleted
   - Acceptance: Click annotation to select, use delete key or button to remove, drag handles to modify position/size/endpoints

### Edge Cases

1. **Overlapping Annotations** - Implement z-index or selection priority so users can select/edit stacked annotations
2. **Off-field Positioning** - Constrain annotation positions to valid field bounds or allow but visually indicate out-of-bounds
3. **Empty Annotations** - Prevent saving annotations with no content (empty text, zero-length arrows, zero-size zones)
4. **Playbook Without Annotations** - Handle loading legacy playbooks that don't have annotation data gracefully
5. **Concurrent Edits** - Ensure annotation store updates don't conflict when multiple annotations are being edited
6. **Performance with Many Annotations** - Optimize rendering for playbooks with 100+ annotations (consider virtualization or LOD)

## Implementation Notes

### DO
- Follow the existing Zustand store pattern for state management
- Use Dexie for client-side IndexedDB persistence
- Leverage @react-three/drei helpers (Text, Line, Shape) for Three.js rendering
- Implement annotation selection using Three.js raycasting
- Store annotation coordinates in field-space (not screen-space) for 3D consistency
- Use TypeScript discriminated unions for annotation types
- Add annotation data to playbook JSON structure for save/load
- Implement undo/redo capability using Zustand middleware or history stack

### DON'T
- Create separate persistence layer - integrate with existing Dexie database
- Use 2D canvas overlay - keep annotations in 3D scene for proper perspective
- Hard-code annotation styles - make colors/sizes configurable
- Store annotations separately from playbooks - they're part of the playbook data
- Implement complex vector editing features - keep interactions simple and coach-friendly
- Forget to validate annotation data on load - handle malformed data gracefully

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- main: http://localhost:3000

### Required Environment Variables
- No additional environment variables required (client-side only application)

## Success Criteria

The task is complete when:

1. [ ] User can add text labels anywhere on field with custom text input
2. [ ] User can draw arrows between two points with visible direction indicator
3. [ ] User can create zone highlights with semi-transparent fill and adjustable bounds
4. [ ] User can free-hand draw smooth paths on field surface
5. [ ] All annotation types render correctly in Three.js scene with proper 3D positioning
6. [ ] Annotations persist when playbook is saved and reload when playbook is opened
7. [ ] User can select, edit, and delete individual annotations
8. [ ] Annotation toolbar provides clear UI for tool selection and active tool indication
9. [ ] No console errors during annotation creation, editing, or deletion
10. [ ] Existing playbook functionality still works (no regressions)
11. [ ] Annotations follow established TypeScript patterns and type safety
12. [ ] Browser verification shows all annotation types working at http://localhost:3000

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Annotation Store Actions | `src/stores/annotationStore.test.ts` | addAnnotation, updateAnnotation, deleteAnnotation, selectAnnotation all modify state correctly |
| Annotation Type Guards | `src/types/annotations.test.ts` | Type guards correctly identify annotation types (isTextAnnotation, isArrowAnnotation, etc.) |
| Annotation Validation | `src/utils/annotationValidation.test.ts` | Empty/invalid annotations are rejected, valid annotations pass |
| Serialization/Deserialization | `src/services/playbookService.test.ts` | Annotations serialize to JSON and deserialize correctly, handle missing annotation data |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Playbook Save/Load with Annotations | main (Dexie + Store) | Annotations save to Dexie, reload from Dexie, appear in correct positions |
| Annotation Store ↔ Dexie Sync | main (Store ↔ DB) | Store changes trigger DB updates, DB loads populate store correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Create Text Annotation | 1. Click text tool 2. Click field 3. Type "Zone Defense" 4. Press Enter | Text label appears on field at clicked position |
| Create Arrow Annotation | 1. Click arrow tool 2. Click start point 3. Drag to end point 4. Release | Arrow appears from start to end with direction indicator |
| Create Zone Highlight | 1. Click zone tool 2. Click center 3. Drag to define size 4. Release | Semi-transparent shape appears covering defined area |
| Free-hand Drawing | 1. Click draw tool 2. Press and drag mouse in pattern 3. Release | Smooth path follows mouse movement |
| Edit Annotation | 1. Create annotation 2. Click to select 3. Drag handle/position 4. Release | Annotation updates to new position/size |
| Delete Annotation | 1. Create annotation 2. Click to select 3. Press Delete or click delete button | Annotation disappears and doesn't persist |
| Persist Annotations | 1. Create multiple annotations 2. Save playbook 3. Refresh page 4. Load playbook | All annotations appear exactly as created |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Coaching Board | `http://localhost:3000` | Annotation toolbar visible, all tools selectable |
| Text Annotation Tool | `http://localhost:3000` | Text tool creates labels, text is editable, labels positioned correctly |
| Arrow Annotation Tool | `http://localhost:3000` | Arrows render with proper direction, endpoints draggable |
| Zone Annotation Tool | `http://localhost:3000` | Zones render semi-transparent, boundaries adjustable |
| Drawing Tool | `http://localhost:3000` | Free-hand paths smooth, follow mouse accurately |
| Annotation Selection | `http://localhost:3000` | Clicking annotations selects them, selection highlight visible |
| Annotation Deletion | `http://localhost:3000` | Delete button/key removes selected annotation immediately |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Annotations Table Exists | Open DevTools → Application → IndexedDB → PlaybookDB | `annotations` table present |
| Annotation Data Structure | Inspect annotation record in Dexie | Contains id, playbookId, type, position, data fields |
| Playbook Includes Annotations | Load playbook from DB | Playbook object contains annotations array |

### QA Sign-off Requirements
- [ ] All unit tests pass (annotation store, type guards, validation, serialization)
- [ ] All integration tests pass (Dexie persistence, store sync)
- [ ] All E2E tests pass (create/edit/delete for all annotation types)
- [ ] Browser verification complete: All tools work in localhost:3000
- [ ] Database verification complete: Annotations persist in Dexie
- [ ] No regressions in existing playbook functionality (save/load/view)
- [ ] Code follows established TypeScript/React/Three.js patterns
- [ ] No console errors or warnings during annotation operations
- [ ] No security vulnerabilities introduced (XSS in text annotations, etc.)
- [ ] Performance verified: 100+ annotations render without lag
