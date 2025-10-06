# DRAKON Diagram Styling Update

## Summary
Updated the diagram styling to match the original DRAKON color scheme with light blue background, gray lanes, and light-colored node shapes.

## Changes Made

### 1. Background Colors (`assets/styles.css`)

**SVG Background:**
- Changed from: `var(--vscode-editorCodeLens-foreground, transparent)` (dark theme dependent)
- Changed to: `#c8e6f5` (light cyan/blue, matches original)

**Lane Background:**
- Changed from: `color-mix()` with VS Code theme variables (made lanes invisible in dark theme)
- Changed to: `#9ba8b0` fill with `#7a8891` stroke (gray, like original)
- Increased opacity from 0.6 to 0.8 for better visibility

### 2. Node Shape Colors

All node shapes updated from theme-dependent `color-mix()` to fixed light colors:

| Node Type | New Color | Purpose |
|-----------|-----------|---------|
| **default** | `#ffffff` (white) | Base color for most nodes |
| **action, for_each, parallel** | `#f5f5f5` (off-white) | Action blocks |
| **parameters** | `#e8f0ff` (light blue) | Parameter declarations |
| **comment** | `#fff9e6` (light yellow) | Comments and annotations |
| **choice, question** | `#fff9e6` (light yellow) | Decision points |
| **start, end** | `#e0ffe0` (light green) | Entry/exit points |
| **input, simple_input** | `#f0f8ff` (alice blue) | Input operations |
| **output, simple_output** | `#f0fff0` (honeydew) | Output operations |
| **process** | `#fff8f0` (seashell) | Process control |
| **insertion** | `#f0f8ff` (alice blue) | Insertions |
| **duration** | `#d6ebf5` (light blue) | Time durations |
| **group_duration** | `#e8dff5` (lavender) | Grouped durations |
| **pause** | `#fce4ec` (light pink) | Pause blocks |
| **timer** | `#fff3e0` (papaya whip) | Timer blocks |
| **shelf** | `#e0f7fa` (light cyan) | Storage/shelf |
| **ctrl_period_start/end** | `#f5f5f5` (off-white) | Control periods |

### 3. Text and Stroke Colors

**Node Shapes:**
- Stroke: `#2c3e50` (dark blue-gray) - was theme-dependent
- Stroke width: 2px (unchanged)

**Labels:**
- Fill: `#000000` (black) - was theme-dependent
- Font size: 14px (unchanged)

**Lane Titles:**
- Fill: `#000000` (black) - was theme-dependent
- Font size: 16px (unchanged)

**Edges (Connectors):**
- Stroke: `#2c3e50` (dark blue-gray) - was theme-dependent
- Stroke width: 2px (unchanged)

**Edge Labels:**
- Fill: `#2c3e50` (dark blue-gray) - was theme-dependent

**Internal Node Elements:**
- Dividers: `#4a5568` (gray) - was theme-dependent
- Insets: `#4a5568` (gray) - was theme-dependent
- Bands: `#e0e0e0` (light gray) - was theme-dependent

### 4. Export Background (`assets/js/main.js`)

**Canvas Fill:**
- Changed from: `#ffffff` (white)
- Changed to: `#c8e6f5` (light cyan/blue, matches SVG background)

This ensures exported PNG/WebP images have the same background color as the editor view.

## Benefits

1. **Consistent Appearance**: Diagrams look the same in both editor and exports
2. **Better Contrast**: Light backgrounds with dark text are easier to read
3. **Original Style**: Matches the classic DRAKON diagram appearance
4. **Theme Independent**: No longer affected by VS Code's dark/light theme
5. **Export Quality**: PNG/WebP exports now have proper colors and backgrounds

## Visual Comparison

**Before:**
- Dark theme-dependent colors
- Black/dark gray backgrounds in exports
- Poor contrast
- Lanes invisible or barely visible

**After:**
- Light cyan background (#c8e6f5)
- Gray lanes (#9ba8b0) with good contrast
- White and pastel-colored node shapes
- Black text on light backgrounds
- Matches original DRAKON style

## Testing

1. Open any `.drakon` file in VS Code
2. Verify the diagram has:
   - Light blue background
   - Gray lanes visible and distinct
   - Light-colored nodes with dark borders
   - Black text labels
3. Export as PNG or WebP
4. Verify exported image matches editor appearance

## Notes

- Colors are now fixed and won't adapt to VS Code themes
- This is intentional to maintain DRAKON's visual standards
- For accessibility or theme-aware versions, consider adding a settings option in future
