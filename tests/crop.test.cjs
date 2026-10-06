const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Run the real editor operations against explicit SVG coordinate-system fixtures.
// These are deterministic logic tests, not browser getBBox or rendering tests.
const html = fs.readFileSync(process.env.SVG_TWEAK_HTML || path.join(__dirname, '..', 'index.html'), 'utf8');
function functionSource(name) {
  const start = html.indexOf('  function ' + name + '(');
  assert.notEqual(start, -1);
  const end = html.indexOf('\n  }', start);
  assert.notEqual(end, -1);
  return html.slice(start, end + 4);
}
function fixture(rootBounds, childBounds = [], options = {}) {
  const attrs = { viewBox: '0 0 300 300', width: '300', height: '300' };
  const effects = [];
  const children = childBounds.map(b => ({ tagName: 'path', getBBox: () => b }));
  const svg = {
    getBBox() { if (options.throwBounds) throw new Error('not renderable'); return rootBounds; },
    querySelectorAll() { return children; },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k] ?? null; }
  };
  const context = {
    svgContainer: options.noSvg ? null : { querySelector: () => svg },
    canvasWidthInput: {}, canvasHeightInput: {},
    beginAction: () => effects.push('begin'),
    updateSVGText: () => effects.push('serialize'),
    endAction: () => effects.push('end'),
    computeFit: () => effects.push('fit'),
    applyTransform: () => effects.push('transform'),
    centerView: () => effects.push('center'),
    toast: text => effects.push(text)
  };
  vm.createContext(context);
  vm.runInContext(functionSource('cropToContent'), context);
  return { context, attrs, effects, crop: () => context.cropToContent() };
}
function cropCase(name, root, descendants, expected) {
  test(name, () => {
    const f = fixture(root, descendants); f.crop();
    assert.equal(f.attrs.viewBox, expected);
    const box = expected.split(' ').map(Number);
    assert.equal(f.attrs.width, String(box[2]));
    assert.equal(f.attrs.height, String(box[3]));
    assert.equal(f.context.canvasWidthInput.value, Math.round(box[2]));
    assert.equal(f.context.canvasHeightInput.value, Math.round(box[3]));
    assert.deepEqual(f.effects, ['begin', 'serialize', 'end', 'fit', 'transform', 'center', 'Cropped to content']);
  });
}
cropCase('ordinary untransformed path retains eight-unit padding', {x:10,y:20,width:20,height:30}, [{x:10,y:20,width:20,height:30}], '2 12 36 46');
cropCase('path translated by the editor is cropped in canvas coordinates', {x:110,y:70,width:20,height:30}, [{x:10,y:20,width:20,height:30}], '102 62 36 46');
cropCase('negative translation is retained', {x:-80,y:-60,width:20,height:30}, [{x:10,y:20,width:20,height:30}], '-88 -68 36 46');
cropCase('nested transformed groups do not add their local boxes to the crop', {x:120,y:60,width:40,height:20}, [{x:10,y:5,width:20,height:10},{x:10,y:5,width:20,height:10}], '112 52 56 36');
cropCase('rotated rectangular path uses transformed root bounds', {x:-40,y:10,width:20,height:30}, [{x:10,y:20,width:30,height:20}], '-48 2 36 46');
cropCase('two shapes at different transformed locations are both retained', {x:-90,y:-40,width:210,height:120}, [{x:0,y:0,width:20,height:20},{x:0,y:0,width:10,height:10}], '-98 -48 226 136');
cropCase('unused definition geometry does not enlarge the root drawing box', {x:10,y:20,width:20,height:30}, [{x:-1000,y:-1000,width:3000,height:3000},{x:10,y:20,width:20,height:30}], '2 12 36 46');
cropCase('horizontal zero-height geometry still receives padding', {x:10,y:20,width:30,height:0}, [{x:10,y:20,width:30,height:0}], '2 12 46 16');
cropCase('vertical zero-width geometry still receives padding', {x:10,y:20,width:0,height:30}, [{x:10,y:20,width:0,height:30}], '2 12 16 46');
test('crop is stable when repeated after the viewBox changes', () => {
  const f = fixture({x:110,y:70,width:20,height:30}, [{x:10,y:20,width:20,height:30}]);
  f.crop(); const first = {...f.attrs}; f.crop(); assert.deepEqual(f.attrs, first);
});
for (const [name, box, options] of [
  ['empty drawing', {x:0,y:0,width:0,height:0}, {}],
  ['missing SVG', null, {noSvg:true}],
  ['unavailable geometry', null, {throwBounds:true}],
  ['nonfinite geometry', {x:Infinity,y:0,width:1,height:1}, {}]
]) test(name + ' does not change the canvas or history', () => {
  const f = fixture(box, [], options); const before = {...f.attrs}; f.crop();
  assert.deepEqual(f.attrs, before); assert.deepEqual(f.effects, []);
});
test('actual editor translation followed by crop retains a moved path', () => {
  const attrs = { d: 'M10 10h20v20h-20z' };
  const pathElement = { tagName:'path', getAttribute:k=>attrs[k]??null, setAttribute:(k,v)=>attrs[k]=String(v) };
  const f = fixture({x:110,y:60,width:20,height:20}, [{x:10,y:10,width:20,height:20}]);
  vm.runInContext('function num(v, d=0) { const n=parseFloat(v); return Number.isFinite(n)?n:d; }\n' + functionSource('updateElementPosition'), f.context);
  f.context.updateElementPosition(pathElement, 100, 50);
  assert.equal(attrs.transform, 'translate(100,50)'); f.crop();
  assert.equal(f.attrs.viewBox, '102 52 36 36');
});
