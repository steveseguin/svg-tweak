const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const html = fs.readFileSync(process.env.CENTER_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8');
const stl = fs.readFileSync(path.join(__dirname, '..', 'svg2stl.html'), 'utf8');
function extract(name) {
  const start = html.indexOf(`  function ${name}(`);
  assert(start >= 0);
  return html.slice(start, html.indexOf('\n  }', start) + 4);
}
class Matrix {
  constructor(e=0,f=0) { Object.assign(this,{a:1,b:0,c:0,d:1,e,f}); }
  inverse() { return new Matrix(-this.e,-this.f); }
}
class Point {
  constructor(x=0,y=0) { Object.assign(this,{x,y}); }
  matrixTransform(m) { return new Point(this.x+m.e,this.y+m.f); }
}
class Shape {
  constructor() { this.currentPoint={x:0,y:0};this.points=[]; }
  moveTo(x,y) { this.currentPoint={x,y};this.points.push([x,y]); }
  lineTo(x,y) { this.moveTo(x,y); }
  closePath() { this.moveTo(...this.points[0]); }
}
function centeredRectangle() {
  const attrs={x:'10',y:'10',width:'20',height:'20'};
  const root={getAttribute:n=>n==='viewBox'?'0 0 200 200':null,getScreenCTM:()=>new Matrix(),createSVGPoint:()=>new Point()};
  const rect={tagName:'rect',parentElement:root,getAttribute:n=>attrs[n]??null,setAttribute:(n,v)=>attrs[n]=String(v),
    getBBox:()=>({x:+attrs.x,y:+attrs.y,width:+attrs.width,height:+attrs.height}),
    getScreenCTM:()=>{const m=(attrs.transform||'').match(/translate\(([^,]+),([^\)]+)\)/);return m?new Matrix(+m[1],+m[2]):new Matrix();}};
  const context=vm.createContext({selectedElement:rect,svgContainer:{querySelector:()=>root},beginAction(){},endAction(){},updateSVGText(){}});
  vm.runInContext(['num','getViewBoxDims','updateElementPosition','centerSelected'].map(extract).join('\n'),context);
  context.centerSelected();context.centerSelected();
  return attrs;
}
// Explicit XML/DOM and Shape fixtures; source parser and path conversion run unchanged.
function convertedPoints(rectangles,lineMode) {
  const elements=new Map();
  const document={getElementById(id){if(!elements.has(id))elements.set(id,{value:'1',nextElementSibling:{},style:{},addEventListener(){}});return elements.get(id);},addEventListener(){}};
  class DOMParser { parseFromString(){return {querySelector:()=>({getAttribute:n=>n==='viewBox'?'0 0 200 200':null,querySelectorAll:n=>n==='rect'?rectangles.map(attrs=>({tagName:'rect',getAttribute:k=>attrs[k]??null})):[]})};} }
  const context=vm.createContext({document,DOMParser,URLSearchParams,window:{location:{search:''},addEventListener(){}},console:{log(){},warn(){},error(){}}});
  const script=[...stl.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  vm.runInContext(script,context);vm.runInContext(`isLineMode=${lineMode}`,context);
  context.parseSVG('<svg/>');
  return Array.from(vm.runInContext('svgPaths',context),p=>{const shape=new Shape();context.createShapeFromPathData(shape,p.pathData,1);return shape.points;});
}
for(const lineMode of [false,true]) test(`Center twice keeps two rectangles aligned in STL ${lineMode?'line':'volume'} mode`,()=>{
  const centered=centeredRectangle();
  const geometry=convertedPoints([centered,{x:'150',y:'90',width:'20',height:'20'}],lineMode);
  assert.equal(geometry.length,2);
  // Relative separation matters even if the entire model is recentered later.
  assert.equal(geometry[1][0][0]-geometry[0][0][0],60);
  assert.equal(geometry[0][0][1],-90);
  assert.equal(geometry[1][0][1],-90);
  assert.equal(centered.transform,undefined);
});
