# Orthogonal Line Routing Implementation

## Summary
Changed edge rendering from straight diagonal lines to orthogonal (right-angled) lines, matching the DRAKON standard where all connections are either horizontal or vertical.

## Problem
Previously, edges were rendered as straight lines connecting node centers:
```javascript
<line x1="x1" y1="y1" x2="x2" y2="y2" />
```
This resulted in diagonal lines crossing the diagram, which doesn't match DRAKON conventions.

## Solution
Updated edge rendering to use SVG paths with orthogonal routing:

### Implementation (`assets/js/renderer.js`)

**Before:**
```javascript
edgesGroup
  .selectAll('line')
  .data(visibleEdges)
  .enter()
  .append('line')
  .attr('x1', (d) => from.x)
  .attr('y1', (d) => from.y)
  .attr('x2', (d) => to.x)
  .attr('y2', (d) => to.y)
```

**After:**
```javascript
edgesGroup
  .selectAll('path')
  .data(visibleEdges)
  .enter()
  .append('path')
  .attr('d', (d) => {
    // Create orthogonal routing
    // 1. If same column: straight vertical
    // 2. If same row: straight horizontal
    // 3. Otherwise: vertical → horizontal → vertical
  })
```

## Routing Logic

### Case 1: Same Column (x₁ = x₂)
```
From
  |  (straight vertical line)
  ↓
To
```
Path: `M x₁ y₁ L x₂ y₂`

### Case 2: Same Row (y₁ = y₂)
```
From ----→ To  (straight horizontal line)
```
Path: `M x₁ y₁ L x₂ y₂`

### Case 3: Different Column and Row
```
From
  |
  |  (vertical segment)
  └─────┐  (horizontal segment at midpoint)
        |  (vertical segment)
        ↓
        To
```
Path: `M x₁ y₁ L x₁ midY L x₂ midY L x₂ y₂`

Where `midY = y₁ + (y₂ - y₁) / 2`

## Benefits

1. **DRAKON Standard**: Matches official DRAKON notation
2. **Readability**: Orthogonal lines are easier to follow
3. **Professional**: Looks like proper flowchart software
4. **Visual Clarity**: No diagonal lines crossing the diagram
5. **Better Exports**: PNG/WebP/SVG exports look professional

## Visual Comparison

**Before:**
```
Node A
    \
     \  (diagonal line)
      \
       ↘
        Node B
```

**After:**
```
Node A
   |
   |  (vertical)
   └──→  (horizontal)
       |  (vertical)
       ↓
    Node B
```

## Future Enhancements

Could be improved with:
- Smart routing around obstacles
- Multiple waypoints for complex paths
- Configurable corner radius for smoother bends
- Lane-aware routing (stay within lanes when possible)
- Collision detection and avoidance

## Testing

1. Open any `.drakon` file with cross-lane connections
2. Verify all lines are either:
   - Perfectly vertical
   - Perfectly horizontal
   - Right-angled combinations of both
3. No diagonal lines should appear
4. Export to PNG/SVG and verify orthogonal paths are preserved

## Notes

- The current implementation uses a simple midpoint approach
- For nodes in the same lane (same x-coordinate), lines are perfectly vertical
- For nodes in different lanes, lines use a three-segment path
- All existing CSS styles for `.edge` class still apply
- Arrow markers still attach correctly to the end of paths
