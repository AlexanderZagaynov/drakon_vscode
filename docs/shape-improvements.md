# DRAKON Shape Improvements

## Overview
Updated the shapes rendering to better match the official DRAKON visual specifications based on the prototype images in `docs/shape_prototypes/`.

### Implicit Start/End Terminators
- Diagrams now synthesize start and end nodes automatically when they are not declared explicitly.
- Explicit `start` / `end` blocks are still supported for custom captions, ids, or metadata.
- The renderer wires the generated nodes into the main liana so every lane still begins with Start and ends with End.

## Changes Made

### 1. Start/End Shape (Stadium Shape)
**Before:** Used a full ellipse for start/end blocks
**After:** Now renders as a true "stadium" or "pill" shape - a rectangle with semicircular ends

```typescript
// Creates a path with two semicircular ends connected by straight lines
// More closely matches the DRAKON standard
```

**Visual Impact:**
- Start and end blocks now have a more elongated, capsule-like appearance
- Better distinguishes them from the diamond (question) shape
- More consistent with flowchart standards

### 2. Rounded Rectangle Corner Radius
**Before:** Corner radius of `min(18, min(width, height) / 8)`
**After:** Smaller radius of `min(12, min(width, height) / 10)`

**Affected Shapes:** Action, Parameters, Insertion, Process, Shelf, Control Period, Pause
**Visual Impact:**
- Shapes appear more rectangular and less "bubbly"
- Better matches the crisp, technical appearance of DRAKON diagrams

### 3. Comment Shape (Folded Corner)
**Before:** Irregular tail extending from the right side
**After:** Clean rectangle with a folded "dog-ear" corner at top-right

```typescript
// Now includes fold lines to show the corner is turned down
// Creates the classic "sticky note" appearance
```

**Visual Impact:**
- Much clearer that this is a comment/annotation
- Fold lines add depth and make the shape more recognizable
- Better matches document annotation conventions

### 4. Input/Output Bevel Size
**Before:** Bevel size of `min(width * 0.18, 48)`
**After:** Smaller bevel of `min(width * 0.15, 40)`

**Visual Impact:**
- More subtle parallelogram angle
- Cleaner, less exaggerated directional indication
- Better proportions for smaller shapes

### 5. Choice Shape (Hexagon)
**Before:** Indent of `min(width * 0.22, 60)`
**After:** Slightly smaller indent of `min(width * 0.20, 56)`

**Visual Impact:**
- More balanced hexagon proportions
- Better distinguishes from diamond (question) shape
- Cleaner appearance at various sizes

### 6. Insertion Shape (Double Border)
**Before:** Inset of `min(12, width * 0.04)` with radius `max(4, inset)`
**After:** Inset of `min(8, width * 0.035)` with radius `min(8, min(width, height) / 12)`

**Visual Impact:**
- Tighter double-border effect
- More consistent corner radius on inner rectangle
- Clearer indication of the insertion/subroutine call nature

## Shape Reference

### Basic Shapes
- **Start/End**: Stadium (pill shape with semicircular ends)
- **Action**: Rounded rectangle with top and bottom divider lines
- **Parameters**: Rounded rectangle with top divider only

### Decision Shapes
- **Question**: Diamond (rhombus) for binary Yes/No decisions
- **Choice**: Hexagon for multi-way branching

### Data Flow Shapes
- **Input**: Parallelogram with left bevel (points inward)
- **Output**: Parallelogram with right bevel (points outward)
- **Simple Input/Output**: Same as Input/Output but smaller dimensions

### Special Purpose Shapes
- **Comment**: Rectangle with folded top-right corner
- **Insertion**: Double-bordered rounded rectangle
- **Process**: Rounded rectangle with two top bands
- **Shelf**: Rounded rectangle with top, bottom dividers and center vertical line
- **Duration**: Half-stadium with rounded left edge
- **Pause**: Rounded rectangle with filled bands at top and bottom
- **Timer**: Hourglass/bow-tie shape
- **Control Period Start/End**: Rounded rectangle with vertical bars

## Testing

To test the improved shapes, open `docs/examples/shape-test.drakon` which contains all shape types in a single diagram.

## Visual Comparison

Compare the rendered shapes with the reference images in:
- `docs/shape_prototypes/example-*.png`

Key improvements:
1. ✅ Start/End blocks are now pill-shaped instead of elliptical
2. ✅ Comment blocks have a clear folded corner
3. ✅ All rounded rectangles have crisper, less rounded corners
4. ✅ Input/Output shapes have more subtle bevels
5. ✅ Insertion blocks have tighter double-border effect

## Future Improvements

Potential enhancements based on prototype analysis:
- Fine-tune stroke widths for different shape types
- Add optional shadow effects for depth
- Implement shape color variations based on semantic meaning
- Add support for custom shape decorations/icons
