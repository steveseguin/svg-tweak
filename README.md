# Interactive SVG Editor

A lightweight, browser-based SVG editor with real-time preview and interactive editing capabilities. Built with vanilla JavaScript, this editor allows you to create, modify, and visualize SVG elements directly in your browser.


DEMO: https://steveseguin.github.io/svg-editor

## Features

- **Live Preview**: See your SVG changes in real-time as you edit the code
- **Interactive Manipulation**: Drag SVG elements directly in the preview panel
- **Element Selection**: Click elements to highlight their corresponding code
- **Resize Support**: Use mouse wheel to resize selected elements
- **Responsive Design**: Works on both desktop and mobile devices
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **No Dependencies**: Pure JavaScript implementation with no external libraries

## Usage

### Basic Operations

1. **Edit SVG Code**: Type or paste SVG code in the editor panel
2. **Move Elements**: Click and drag elements in the preview panel
3. **Select Elements**: Click any element to highlight its code
4. **Resize Elements**: Use mouse wheel while an element is selected
5. **Preview Changes**: All modifications are instantly reflected in both panels

### Example SVG Code

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="50" width="50" height="50" fill="blue"/>
  <circle cx="125" cy="75" r="25" fill="red"/>
  <text x="75" y="150" fill="green">Drag me!</text>
</svg>
```

## Supported SVG Elements

The editor supports manipulation of these SVG elements:

- Rectangle (`<rect>`)
- Circle (`<circle>`)
- Ellipse (`<ellipse>`)
- Text (`<text>`)
- Line (`<line>`)
- Polygon (`<polygon>`)
- Polyline (`<polyline>`)
- Path (`<path>`)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Technical Details

### Element Position Updates

The editor handles different SVG elements uniquely based on their attributes:

- Rectangles and text elements use `x` and `y` attributes
- Circles and ellipses use `cx` and `cy` attributes
- Lines use `x1`, `y1`, `x2`, and `y2` attributes
- Polygons and polylines use the `points` attribute
- Paths use the `d` attribute with transform matrices

### Size Modifications

Element resizing is implemented based on element type:

- Rectangles: Updates width and height
- Circles: Modifies radius
- Ellipses: Adjusts rx and ry values
- Text: Changes font size

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
