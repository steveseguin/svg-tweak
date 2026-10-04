const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

// Run the actual inline history code and editor input callback, not a copy.
const html = fs.readFileSync(process.env.SVG_TWEAK_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8');
const history = html.slice(html.indexOf('  const undoStack = []'), html.indexOf('  // ---------- Persistence ----------'));
const input = html.slice(html.indexOf("  editor.addEventListener('input', () => {"), html.indexOf("  document.addEventListener('keydown', onKeyDown);"));
assert.ok(history.includes('function groupedAction('));
assert.ok(input.includes('typingTimer = setTimeout'));
function harness() {
  let now = 0, id = 0, inputHandler;
  const timers = new Map();
  const editor = { value: 'initial', addEventListener(type, fn) { assert.equal(type, 'input'); inputHandler = fn; } };
  const context = vm.createContext({ editor, MAX_UNDO: 80, toast() {}, deselect() {}, updatePreview() {}, schedulePersist() {},
    setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { timers.delete(key); }
  });
  vm.runInContext(history + input + '\nlastValue = editor.value;', context);
  const run = code => vm.runInContext(code, context);
  return {
    group(value) { context.next = value; run('groupedAction(() => { editor.value = next; })'); },
    action(value) { context.next = value; run('beginAction(); editor.value = next; endAction()'); },
    type(value) { editor.value = value; inputHandler(); },
    undo() { run('undo()'); },
    value() { return editor.value; },
    advance(ms) { const end = now + ms; for (;;) { const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]; if (!due) break; const [key, timer] = due; now = timer.at; timers.delete(key); timer.fn(); } now = end; }
  };
}
test('rapid nudge then discrete delete retains the nudged undo state', () => { const h=harness(); h.group('nudged'); h.action('deleted'); h.undo(); assert.equal(h.value(),'nudged'); h.undo(); assert.equal(h.value(),'initial'); });
test('undo then reselect and edit creates a new undo step before old timer', () => { const h=harness(); h.group('nudged'); h.undo(); h.group('edited after reselection'); h.advance(500); h.undo(); assert.equal(h.value(),'initial'); });
test('rapid nudges coalesce into one step', () => { const h=harness(); h.group('one'); h.advance(100); h.group('two'); h.advance(100); h.group('three'); h.undo(); assert.equal(h.value(),'initial'); });
test('settled group then delete retains both steps', () => { const h=harness(); h.group('nudged'); h.advance(450); h.action('deleted'); h.undo(); assert.equal(h.value(),'nudged'); h.undo(); assert.equal(h.value(),'initial'); });
test('settled groups form separate undo steps', () => { const h=harness(); h.group('one'); h.advance(450); h.group('two'); h.undo(); assert.equal(h.value(),'one'); h.undo(); assert.equal(h.value(),'initial'); });
test('import during active group preserves preceding drawing', () => { const h=harness(); h.group('resized'); h.action('imported'); h.advance(500); h.undo(); assert.equal(h.value(),'resized'); h.undo(); assert.equal(h.value(),'initial'); });
test('typing during group preserves both prior states', () => { const h=harness(); h.group('nudged'); h.type('typed'); h.advance(600); h.undo(); assert.equal(h.value(),'nudged'); h.undo(); assert.equal(h.value(),'initial'); });
test('undo pending typing during group preserves preceding group', () => { const h=harness(); h.group('nudged'); h.type('typed'); h.undo(); assert.equal(h.value(),'nudged'); h.undo(); assert.equal(h.value(),'initial'); });
test('group after pending typing preserves typed document', () => { const h=harness(); h.type('typed'); h.group('nudged'); h.undo(); assert.equal(h.value(),'typed'); h.undo(); assert.equal(h.value(),'initial'); });
test('new group after discrete action gets its own step', () => { const h=harness(); h.group('one'); h.action('two'); h.group('three'); h.undo(); assert.equal(h.value(),'two'); h.undo(); assert.equal(h.value(),'one'); h.undo(); assert.equal(h.value(),'initial'); });
test('cancelled group timer cannot overwrite pending typing baseline', () => { const h=harness(); h.group('one'); h.advance(100); h.type('typed'); h.advance(350); h.undo(); assert.equal(h.value(),'one'); });
test('ordinary typing remains coalesced', () => { const h=harness(); h.type('one'); h.advance(200); h.type('two'); h.advance(500); h.undo(); assert.equal(h.value(),'initial'); });
test('ordinary discrete actions remain ordered', () => { const h=harness(); h.action('one'); h.action('two'); h.undo(); assert.equal(h.value(),'one'); h.undo(); assert.equal(h.value(),'initial'); });
test('cancelled timer cannot reopen or prolong group after undo', () => { const h=harness(); h.group('one'); h.undo(); h.advance(300); h.group('two'); h.advance(151); h.group('three'); h.undo(); assert.equal(h.value(),'initial'); });
