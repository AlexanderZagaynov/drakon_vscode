# Export Feature Implementation

## Overview
Added the ability to export DRAKON diagrams as SVG, PNG, and WebP files directly from the VS Code editor.

## Components Modified

### 1. Extension (`src/extension.ts`)
- Added `handleExport()` method to handle export requests from the webview
- Saves files using VS Code's file system API with proper save dialogs
- Supports three formats: SVG (text), PNG (base64), WebP (base64)
- Save dialog opens in the same directory as the source `.drakon` file
- Default filename matches the diagram name

### 2. Webview JavaScript (`assets/js/main.js`)
- Added `exportAsSvg()` function for SVG export
- Added `exportAsImage()` function for PNG and WebP export using HTML5 Canvas
- Canvas rendering at 2x scale for high-resolution output
- Event listeners for export buttons

### 3. Styles (`assets/styles.css`)
- Added `#toolbar` styling with flex layout
- Added `.export-btn` button styling matching VS Code theme
- Hover and active states for better UX

### 4. HTML Template (`src/extension.ts`)
- Added toolbar section with three export buttons
- Positioned above the diagram container

## Usage
1. Open any `.drakon` file in VS Code
2. View the rendered diagram
3. Click one of the export buttons at the top: SVG, PNG, or WebP
4. Choose a save location in the dialog
5. File is saved with appropriate extension

## Technical Details

### SVG Export
- Serializes the SVG DOM directly to XML string
- Preserves all vector information
- Best for further editing or scaling

### PNG/WebP Export
- Creates an offscreen canvas at 2x resolution
- Inlines all computed CSS styles into SVG elements for proper rendering
- Fills white background before drawing
- Converts SVG to raster image via Image element
- Encodes to base64 data URL
- Quality set to 0.95 for WebP

**Style Inlining**: The export function walks through all SVG elements and copies their computed CSS styles as inline `style` attributes. This ensures colors, fonts, strokes, and other visual properties render correctly in the exported image, independent of the CSS stylesheet.

### Message Passing
```typescript
// Webview to Extension
{
  type: 'export',
  format: 'svg' | 'png' | 'webp',
  data: string // SVG XML or base64 data URL
}
```

## Benefits
- No external dependencies required
- Works entirely within VS Code
- Theme-aware UI
- High-resolution output for PNG/WebP
- Vector-perfect SVG output
