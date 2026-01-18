# Browser Testing Checklist - Keyboard Shortcuts

## Testing Summary

**Date:** 2026-01-19
**Subtask:** 8.3 - Manual browser testing
**Status:** Checklist prepared for manual testing

---

## Implementation Review

The keyboard shortcuts implementation uses `event.code` for reliable key detection across browsers and keyboard layouts. Key browser compatibility considerations:

### Browser-Specific Implementation Details

1. **Platform Detection (`isMac()`):**
   - Uses `navigator.platform` with fallback to `navigator.userAgent`
   - Cached for performance
   - SSR-safe (checks `typeof navigator`)

2. **Key Event Handling:**
   - Uses `event.code` (e.g., 'KeyS', 'Digit1') for layout-independent detection
   - Properly handles `event.metaKey` for Mac Cmd and `event.ctrlKey` for Windows/Linux
   - Calls `event.preventDefault()` to stop browser defaults

3. **Focus Detection:**
   - Checks `input`, `textarea`, `select` elements
   - Handles `contentEditable` elements
   - Uses `HTMLElement` type checking

---

## Testing Checklist

### Chrome (Primary Target)

#### Camera Preset Shortcuts (Keys 1-4)
- [ ] Press `1` - switches to Top view
- [ ] Press `2` - switches to Sideline view
- [ ] Press `3` - switches to End-to-end view
- [ ] Press `4` - switches to Broadcast view
- [ ] Press `5-9, 0` - no action (ignored correctly)
- [ ] Rapid pressing of 1-4 - camera switches smoothly

#### Tool Selection Shortcuts
- [ ] Press `S` - enters Select mode (deselects tool)
- [ ] Press `L` - selects Line tool
- [ ] Press `A` - selects Arrow tool
- [ ] Press `C` - selects Circle tool
- [ ] Press `R` - selects Rectangle tool
- [ ] Press `T` - selects Text tool
- [ ] Rapid tool switching - tools switch immediately

#### Edit Operation Shortcuts
- [ ] Press `Ctrl+Z` - performs Undo
- [ ] Press `Ctrl+Shift+Z` - performs Redo
- [ ] Press `Ctrl+Y` - performs Redo (alternative)
- [ ] Press `Ctrl+S` - opens Save dialog (no browser save dialog appears)
- [ ] Browser save dialog is prevented when pressing Ctrl+S

#### Animation Control Shortcuts
- [ ] Press `Spacebar` - toggles animation play/pause
- [ ] Spacebar does NOT scroll the page

#### Help Overlay Shortcuts
- [ ] Press `?` (Shift+/) - opens Help overlay
- [ ] Press `Esc` - closes Help overlay
- [ ] Click outside dialog - closes Help overlay
- [ ] Tab key - cycles through focusable elements in overlay
- [ ] Shift+Tab - reverse cycles through elements
- [ ] Focus is trapped within overlay when open

#### Input Field Handling
- [ ] Click in Save dialog name input, type "S" - character appears, tool doesn't change
- [ ] Type "1234" in input - characters appear, camera doesn't switch
- [ ] Type in any contentEditable element - shortcuts don't fire

#### Modal/Dialog Handling
- [ ] Open Save dialog - shortcuts disabled (except Esc)
- [ ] Open Help overlay - shortcuts disabled (except Esc)
- [ ] Close dialogs - shortcuts re-enabled

#### No Console Errors
- [ ] Open Developer Tools Console
- [ ] Perform all above actions
- [ ] Verify no errors or warnings appear

---

### Firefox

#### Camera Preset Shortcuts (Keys 1-4)
- [ ] Press `1` - switches to Top view
- [ ] Press `2` - switches to Sideline view
- [ ] Press `3` - switches to End-to-end view
- [ ] Press `4` - switches to Broadcast view

#### Tool Selection Shortcuts
- [ ] Press `S`, `L`, `A`, `C`, `R`, `T` - correct tools selected

#### Edit Operation Shortcuts
- [ ] Press `Ctrl+Z` - performs Undo
- [ ] Press `Ctrl+Shift+Z` - performs Redo
- [ ] Press `Ctrl+S` - no browser save dialog

#### Animation Control
- [ ] Press `Spacebar` - toggles play/pause, no page scroll

#### Help Overlay
- [ ] Press `?` - opens Help overlay
- [ ] Press `Esc` - closes Help overlay
- [ ] Focus trapping works correctly

#### Input Field Handling
- [ ] Typing in inputs doesn't trigger shortcuts

#### No Console Errors
- [ ] No errors in Firefox Developer Tools

---

### Safari (Mac only)

#### Camera Preset Shortcuts (Keys 1-4)
- [ ] Press `1-4` - camera presets work

#### Tool Selection Shortcuts
- [ ] Press `S`, `L`, `A`, `C`, `R`, `T` - correct tools selected

#### Edit Operation Shortcuts (Cmd key)
- [ ] Press `Cmd+Z` - performs Undo
- [ ] Press `Cmd+Shift+Z` - performs Redo
- [ ] Press `Cmd+S` - no browser save dialog

#### Help Overlay
- [ ] Modifier key symbols display correctly (⌘, ⌥, ⇧)
- [ ] Focus management works

#### No Console Errors
- [ ] No errors in Safari Web Inspector

---

### Edge (Chromium-based)

Should behave identically to Chrome. Quick verification:
- [ ] Camera shortcuts work (1-4)
- [ ] Tool shortcuts work (S, L, A, C, R, T)
- [ ] Edit shortcuts work (Ctrl+Z, Ctrl+Shift+Z, Ctrl+S)
- [ ] Spacebar works
- [ ] Help overlay works (?, Esc)

---

## Known Browser Considerations

### All Browsers
- `event.code` provides consistent behavior across keyboard layouts
- `preventDefault()` stops native browser actions for captured shortcuts

### Firefox-Specific
- Ctrl+S may show "Save Page" briefly before preventDefault catches it
- Some accessibility shortcuts may conflict

### Safari-Specific
- Cmd key (metaKey) behavior is critical
- Safari may have stricter preventDefault handling

### Edge-Specific
- Chromium-based, should match Chrome behavior

---

## Expected Results

All shortcuts should:
1. Work immediately without delay
2. Not conflict with browser defaults (Ctrl+S should NOT open save dialog)
3. Be disabled when typing in input fields
4. Be disabled when modals/dialogs are open
5. Show correct platform-specific labels in Help overlay (⌘ on Mac, Ctrl on Windows)

---

## Sign-off

| Browser | Version | Tester | Date | Pass/Fail | Notes |
|---------|---------|--------|------|-----------|-------|
| Chrome  |         |        |      |           |       |
| Firefox |         |        |      |           |       |
| Safari  |         |        |      |           |       |
| Edge    |         |        |      |           |       |

---

## Notes for Testers

1. **Start the dev server:** `npm run dev`
2. **Open browser:** Navigate to `http://localhost:3000`
3. **Open Developer Tools:** Check Console for errors during testing
4. **Test systematically:** Follow the checklist for each browser
5. **Document any issues:** Note browser version and exact steps to reproduce
