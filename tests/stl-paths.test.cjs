const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const sourcePath = process.env.SVG_STL_SOURCE || path.join(__dirname, '..', 'svg2stl.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];

// The test observes the coordinates given to Three.Shape. No browser or WebGL is needed.
class RecordingShape {
    constructor() { this.currentPoint = { x: 0, y: 0 }; this.points = []; }
    moveTo(x, y) { this.currentPoint = { x, y }; this.points.push([x, y]); }
    lineTo(x, y) { this.moveTo(x, y); }
    closePath() { this.moveTo(...this.points[0]); }
}

function harness(rectangle) {
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                value: '1', nextElementSibling: {}, style: {}, addEventListener() {}
            });
            return elements.get(id);
        },
        addEventListener() {}
    };
    // XML parsing is a fixture here. The actual application rectangle conversion is executed.
    class DOMParser {
        parseFromString() {
            const rect = { tagName: 'rect', getAttribute: name => rectangle[name] ?? null };
            const svg = {
                getAttribute: name => name === 'viewBox' ? '0 0 100 100' : null,
                querySelectorAll: name => name === 'rect' ? [rect] : []
            };
            return { querySelector: () => svg };
        }
    }
    const context = vm.createContext({ document, DOMParser, URLSearchParams,
        window: { location: { search: '' }, addEventListener() {} },
        console: { log() {}, warn() {}, error() {} }
    });
    vm.runInContext(script, context);
    return context;
}

function points(context, data, scale = 1) {
    const shape = new RecordingShape();
    context.createShapeFromPathData(shape, data, scale);
    return shape.points;
}

for (const [name, data, scale, expected] of [
    ['positive relative vertical', 'M2,3 v5', 1, [[2,-3],[2,-8]]],
    ['negative relative vertical', 'M2,3 v-5', 1, [[2,-3],[2,2]]],
    ['zero relative vertical', 'M2,3 v0', 1, [[2,-3],[2,-3]]],
    ['fractional relative vertical', 'M2,3 v1.5', 0.5, [[1,-1.5],[1,-2.25]]],
    ['repeated relative vertical commands', 'M2,3 v5 v-2 v0.5', 1, [[2,-3],[2,-8],[2,-6],[2,-6.5]]],
    ['horizontal then vertical', 'M2,3 h4 v5', 1, [[2,-3],[6,-3],[6,-8]]],
    ['relative moveto then vertical', 'm2,3 v5', 1, [[2,-3],[2,-8]]],
    ['absolute vertical control', 'M2,3 V5', 1, [[2,-3],[2,-5]]],
    ['absolute horizontal control', 'M2,3 H5', 1, [[2,-3],[5,-3]]],
    ['relative horizontal control', 'M2,3 h5', 1, [[2,-3],[7,-3]]],
    ['absolute line control', 'M2,3 L5,7', 1, [[2,-3],[5,-7]]],
    ['relative line control', 'M2,3 l5,7', 1, [[2,-3],[7,-10]]]
]) test(name, () => assert.deepEqual(points(harness(), data, scale), expected));

for (const [name, attributes, expected] of [
    ['ordinary rectangle', {x:'10',y:'10',width:'20',height:'20'}, [[10,-10],[30,-10],[30,-30],[10,-30],[10,-10]]],
    ['default rectangle origin', {width:'20',height:'10'}, [[0,0],[20,0],[20,-10],[0,-10],[0,0]]],
    ['negative rectangle origin', {x:'-10',y:'-20',width:'5',height:'7'}, [[-10,20],[-5,20],[-5,13],[-10,13],[-10,20]]],
    ['fractional rectangle', {x:'0.5',y:'1.5',width:'2.5',height:'3.5'}, [[0.5,-1.5],[3,-1.5],[3,-5],[0.5,-5],[0.5,-1.5]]]
]) for (const lineMode of [false, true]) test(`${name}, ${lineMode ? 'line' : 'volume'} mode`, () => {
    const context = harness(attributes);
    vm.runInContext(`isLineMode = ${lineMode}`, context);
    context.parseSVG('<svg/>');
    const paths = vm.runInContext('svgPaths', context);
    assert.equal(paths.length, 1);
    assert.equal(paths[0].isHole, false);
    const actual = points(context, paths[0].pathData).map(p => p.map(x => x === 0 ? 0 : x));
    assert.deepEqual(actual, expected);
    assert.ok(actual.flat().every(Number.isFinite));
});
