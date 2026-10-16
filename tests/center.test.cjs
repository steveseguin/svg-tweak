const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(process.env.CENTER_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf('\n  }', start) + 4;
  assert(start >= 0 && end > start, `Missing ${name}`);
  return source.slice(start, end);
}
// Explicit 2D DOMMatrix/SVGPoint fixtures; these do not emulate a browser renderer.
class Matrix {
  constructor(a=1,b=0,c=0,d=1,e=0,f=0) { Object.assign(this,{a,b,c,d,e,f}); }
  multiply(m) {const {a,b,c,d,e,f}=this;return new Matrix(a*m.a+c*m.b,b*m.a+d*m.b,a*m.c+c*m.d,b*m.c+d*m.d,a*m.e+c*m.f+e,b*m.e+d*m.f+f);}
  inverse() {const {a,b,c,d,e,f}=this,det=a*d-b*c;if(!det)throw Error('Singular');return new Matrix(d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det);}
}
class Point {
  constructor(x=0,y=0) {Object.assign(this,{x,y});}
  matrixTransform(m) {return new Point(m.a*this.x+m.c*this.y+m.e,m.b*this.x+m.d*this.y+m.f);}
}
function parseTransform(text='') {
  let result=new Matrix();
  for(const [,kind,args] of text.matchAll(/(matrix|translate|scale|rotate|skewX)\(([^)]+)\)/g)) {
    const v=args.trim().split(/[\s,]+/).map(Number);let m;
    if(kind==='matrix')m=new Matrix(...v);
    if(kind==='translate')m=new Matrix(1,0,0,1,v[0],v[1]||0);
    if(kind==='scale')m=new Matrix(v[0],0,0,v[1]??v[0]);
    if(kind==='rotate'){const a=v[0]*Math.PI/180;m=new Matrix(Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a));}
    if(kind==='skewX')m=new Matrix(1,0,Math.tan(v[0]*Math.PI/180),1);
    result=result.multiply(m);
  }
  return result;
}
function near(actual,expected) {assert(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);}
function fixture(options={}) {
  const {tag='path',transform='',parentTransform='',viewBox='0 0 200 200',box={x:10,y:10,width:20,height:20}}=options;
  const rootScreen=parseTransform('translate(125,87) scale(2.5)');
  const attrs={x:'10',y:'10',width:String(box.width),height:String(box.height)};
  if(transform)attrs.transform=transform;
  const root={getAttribute:n=>n==='viewBox'?viewBox:null,getScreenCTM:()=>rootScreen,createSVGPoint:()=>new Point()};
  const parent={getScreenCTM:()=>root.getScreenCTM().multiply(parseTransform(parentTransform))};
  const element={tagName:tag,parentElement:parent,getAttribute:n=>attrs[n]??null,setAttribute:(n,v)=>{attrs[n]=String(v)},
    getBBox:()=>tag==='rect'?{...box,x:Number(attrs.x),y:Number(attrs.y)}:{...box},
    getScreenCTM:()=>parent.getScreenCTM().multiply(parseTransform(attrs.transform))};
  const calls=[];
  const context={selectedElement:element,svgContainer:{querySelector:()=>root},beginAction:()=>calls.push('begin'),updateSVGText:()=>calls.push('serialize'),endAction:()=>calls.push('end')};
  vm.createContext(context);
  vm.runInContext(['num','getViewBoxDims','updateElementPosition','centerSelected'].map(extract).join('\n'),context);
  function run(){vm.runInContext('centerSelected()',context);}
  function assertCentered(){const b=element.getBBox(),p=new Point(b.x+b.width/2,b.y+b.height/2).matrixTransform(element.getScreenCTM());const [x,y,w,h]=viewBox.split(' ').map(Number),target=new Point(x+w/2,y+h/2).matrixTransform(rootScreen);near(p.x,target.x);near(p.y,target.y);}
  return {attrs,root,parent,element,context,calls,run,assertCentered};
}
for(const [name,options] of [
 ['ordinary rectangle',{tag:'rect'}],['plain path',{}],['translated path',{transform:'translate(100,50)'}],
 ['scaled rectangle',{tag:'rect',transform:'scale(2,3)'}],['rotated rectangle',{tag:'rect',transform:'rotate(60)'}],
 ['transformed group',{tag:'g',transform:'rotate(35) scale(2,3)'}],
 ['nested group transforms',{tag:'path',parentTransform:'translate(45,20) rotate(40) scale(2,3)',transform:'translate(5,9) rotate(23)'}],
 ['skew and reflection',{tag:'g',parentTransform:'skewX(20)',transform:'scale(-2,3) translate(8,4)'}],
 ['nonzero viewBox',{viewBox:'-100 50 400 300',transform:'translate(100,50)'}],
 ['vertical line bounds',{tag:'line',box:{x:20,y:10,width:0,height:30}}],
 ['horizontal line bounds',{tag:'line',box:{x:20,y:10,width:30,height:0}}]
]) {
 test(`${name}: centers once, preserves geometry/transforms, repeats without movement`,()=>{
   const f=fixture(options),before={...f.attrs};f.run();f.assertCentered();
   const after={...f.attrs};if(before.transform)assert(after.transform.endsWith(before.transform));
   assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.width,before.width);assert.equal(after.height,before.height);
   assert.deepEqual(f.calls,['begin','serialize','end']);f.run();f.assertCentered();assert.deepEqual(f.attrs,after);assert.deepEqual(f.calls,['begin','serialize','end']);
 });
}
function noMutation(name,prepare){test(name,()=>{const f=fixture();prepare(f);const before={...f.attrs};f.run();assert.deepEqual(f.attrs,before);assert.deepEqual(f.calls,[]);});}
noMutation('no selected element',f=>f.context.selectedElement=null);
noMutation('no SVG container',f=>f.context.svgContainer=null);
noMutation('no root SVG',f=>f.context.svgContainer.querySelector=()=>null);
noMutation('detached selection',f=>f.element.parentElement=null);
noMutation('getBBox throws',f=>f.element.getBBox=()=>{throw Error('not rendered')});
noMutation('empty point bounds',f=>f.element.getBBox=()=>({x:0,y:0,width:0,height:0}));
noMutation('nonfinite bounds',f=>f.element.getBBox=()=>({x:NaN,y:0,width:20,height:20}));
noMutation('negative bounds',f=>f.element.getBBox=()=>({x:0,y:0,width:-1,height:20}));
noMutation('invalid viewBox dimensions',f=>f.root.getAttribute=()=> '0 0 0 200');
for(const who of ['root','parent','element']) {
 noMutation(`${who}: missing CTM`,f=>f[who].getScreenCTM=()=>null);
 noMutation(`${who}: singular CTM`,f=>f[who].getScreenCTM=()=>new Matrix(0,0,0,1));
 noMutation(`${who}: nonfinite CTM`,f=>f[who].getScreenCTM=()=>new Matrix(1,0,0,1,Infinity,0));
}
noMutation('matrix inverse throws',f=>f.parent.getScreenCTM=()=>Object.assign(new Matrix(),{inverse(){throw Error('inverse failed')}}));
noMutation('inverse yields NaN',f=>f.parent.getScreenCTM=()=>Object.assign(new Matrix(),{inverse(){return new Matrix(NaN,0,0,1)}}));
noMutation('already centered',f=>f.attrs.transform='translate(80,80)');
test('original regression: repeated path Center remains at (100,100)',()=>{const f=fixture();f.run();f.run();f.assertCentered();});
