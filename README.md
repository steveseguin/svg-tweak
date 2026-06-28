# SVG Tweak

A lightweight, browser-based SVG editor with a live preview, direct on-canvas
editing, and one-click export/conversion. It is a single static HTML file built
with vanilla JavaScript — no build step, no dependencies, nothing to install.

**USE IT NOW: [https://vdo.ninja/svg](https://vdo.ninja/svg)**

![image](https://github.com/user-attachments/assets/b730889b-7262-4ff5-877c-c07d4235d085)

## Features

- **Live preview** — edit the SVG source and see changes instantly, both ways.
- **Direct manipulation** — drag elements to move them; scroll the wheel to
  resize the selected element; nudge with the arrow keys.
- **Selection inspector** — change fill, stroke, stroke width and opacity;
  center, reorder (front/back), duplicate or delete the selected element.
- **Add shapes** — drop in rectangles, circles, ellipses, lines and text.
- **Import** — open a `.svg` file, or drag-and-drop an SVG (or any image, which
  is embedded into a new SVG) straight onto the canvas.
- **Export & convert**:
  - SVG file
  - PNG (with optional transparent background) and JPEG, at any resolution
  - Copy SVG code or a PNG to the clipboard
  - Base64 data URL, favicon `<link>` tag, and `<img>` tag
  - 3D **STL** conversion (built-in `svg2stl` converter)
- **Transparency checkerboard** — toggle a grid behind the drawing to see
  transparent areas clearly.
- **Fit / crop / zoom** — auto-fit any drawing to the view (tiny icons scale up,
  large artwork scales down), crop the canvas tightly to the content, and zoom.
- **Undo** — coalesced history with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- **Autosave** — your work is kept in the browser's local storage between visits.
- **Theme** — automatic light/dark, with a manual auto → light → dark toggle.
- **Touch friendly** — drag and edit on phones and tablets.
- **No dependencies** — one self-contained HTML file.

## Usage

1. **Add or import SVG** — paste markup into the code panel, use **Import**, drag
   a file onto the canvas, or build it up with the **Add** menu.
2. **Select** an element by clicking it; the inspector bar appears.
3. **Move / resize** — drag to move, scroll to resize, arrow keys to nudge
   (hold <kbd>Shift</kbd> for ×10).
4. **Style** — adjust fill, stroke and opacity in the inspector.
5. **Export** — pick a format from the **Export** menu.

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd>+<kbd>D</kbd> | Duplicate selected element |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected element |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | Nudge selected (<kbd>Shift</kbd> = ×10) |
| <kbd>Esc</kbd> | Deselect |
| Scroll wheel | Resize selected element |
| Click / Drag | Select / move element |

### Example SVG

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="50" width="50" height="50" fill="blue"/>
  <circle cx="125" cy="75" r="25" fill="red"/>
  <text x="75" y="150" fill="green">Drag me!</text>
</svg>
```

## Supported SVG elements

Drag-to-move works for: `<rect>`, `<circle>`, `<ellipse>`, `<text>`, `<line>`,
`<polygon>`, `<polyline>`, `<path>`, `<image>`, `<use>` (and other elements are
moved with a `transform`). Wheel-resize applies to `<rect>`, `<circle>`,
`<ellipse>` and `<text>`.

## Browser support

Latest Chrome, Firefox, Safari and Edge. Clipboard-image copy requires a browser
that supports the async Clipboard `write()` API.

## Technical notes

- **Clean output** — editor-only helper classes used for selection/dragging are
  stripped from every export, so the SVG you get out is exactly what you authored.
- **Display vs. canvas size** — the on-screen size is decoupled from the SVG's
  `width`/`height`/`viewBox`, so zooming never changes the exported dimensions.
- **STL conversion** runs locally in `svg2stl.html` (loaded in an iframe); the
  current drawing is handed to it via `postMessage`.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## Acknowledgments

- SVG specification by W3C
- Inspired by various online SVG editors
- Built with modern web standards
