import test from 'node:test';
import assert from 'node:assert/strict';
import {FUNCTIONS,midpoint,rangeIntegral,sampledRange,thomaeMidpoint,integrationExperiment} from '../src/integration.js';
import {adaptiveCDF,compositeCDF,seriesCDF,NIST_REFERENCE,omittedTailBound} from '../src/normal-cdf.js';
const close=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} (t=${t})`);
const f=id=>FUNCTIONS.find(x=>x.id===id);
test('Midpoint x² has the exact known error and second-order convergence',()=>{
  for(const n of [4,31,256])close(1/3-midpoint(x=>x*x,0,1,n).value,1/(12*n*n));
  const e=n=>2-midpoint(Math.sin,0,Math.PI,n).value;
  assert.ok(Math.abs(e(32)/e(64)-4)<.005);
});
test('Steps distinguish jump alignment and odd midpoint tags',()=>{
  close(midpoint(f('step').f,0,1,32).value,2);close(midpoint(f('indicator').f,0,1,32).value,.5);
  close(midpoint(f('step').f,0,1,31).value,2+1/31);close(midpoint(f('indicator').f,0,1,31).value,.5-.5/31);
  close(midpoint(f('absolute').f,0,1,32).value,.25);
});
test('Range bounds enclose independent full/capped analytic targets for all functions',()=>{
  for(const fn of FUNCTIONS)for(const k of [1,16,127,4096]){
    const r=rangeIntegral(fn,k,16);
    assert.ok(r.lower<=r.target+1e-12,fn.id);assert.ok(r.upper>=r.target-1e-12,fn.id);
    assert.ok(Math.abs(r.value-r.target)<=(r.upper-r.lower)/2+1e-12);
    close(r.upper-r.lower,r.delta*(fn.b-fn.a));
  }
});
test('Singular range limit is capped; total error needs a growing cap',()=>{
  const a=rangeIntegral(f('singular'),4096,16);close(a.target,2-1/16);close(a.tail,1/16);
  assert.ok(Math.abs(a.value-a.target)<.002);assert.ok(Math.abs(a.value-2)>.05);
  const old=Math.abs(midpoint(f('singular').f,0,1,256).value-2),next=Math.abs(midpoint(f('singular').f,0,1,1024).value-2);
  assert.ok(old/next>1.99&&old/next<2.01);
});
test('Sinc reference checked by independent high-order composite quadrature',()=>{
  const fn=f('sinc'),n=16384,h=Math.PI/n;let sum=fn.f(0)+fn.f(Math.PI);
  for(let i=1;i<n;i++)sum+=(i%2?4:2)*fn.f(i*h);
  close(sum*h/3,fn.integral,1e-13);close(fn.survival(2/Math.PI),Math.PI/2,2e-14);
});
test('Histogram uses real bins and cannot remove domain bias by refining K',()=>{
  const fn=f('square'),m=32;
  for(const k of [16,1024]){
    const r=sampledRange(fn,k,m);assert.equal(r.counts.reduce((a,b)=>a+b,0),m);
    const fromBins=r.counts.reduce((s,c,i)=>s+c*(i+.5)/k,0)/m;close(r.value,fromBins);
  }
  const r=sampledRange(fn,8192,m),domain=midpoint(fn.f,0,1,m).value;
  assert.ok(Math.abs(r.value-domain)<=1/16384);assert.ok(Math.abs(r.value-1/3)>1e-5);
});
test('Thomae uses reduced exact rational denominators',()=>{
  close(thomaeMidpoint(2),.25);close(thomaeMidpoint(3),(1/6+1/2+1/6)/3);
  for(const n of [8,16,256,1024])close(thomaeMidpoint(n),1/(2*n));
});
// Independent vectors from Python math.erfc (libm), not the implementation under test.
const references=[[-8,6.220960574271819e-16],[-6,9.865876450377012e-10],[-3,.0013498980316300957],[-1.96,.024997895148220435],[-1,.15865525393145707],[-.5,.3085375387259869],[0,.5],[.5,.6914624612740131],[1,.8413447460685429],[1.96,.9750021048517796],[3,.9986501019683699],[8,.9999999999999993]];
test('Adaptive CDF agrees with independent reference vectors, including tiny tails',()=>{
  for(const [z,expected] of references){const r=adaptiveCDF(z,1e-12);assert.ok(r.converged);close(r.value,expected,Math.max(3e-16,Math.abs(expected)*1e-12));if(z<0)assert.ok(Math.abs(r.value/expected-1)<2e-12,`${z}: relative error`);}
  assert.ok(omittedTailBound<2e-33);
});
test('CDF symmetry, monotonicity, normalization and direct tails',()=>{
  let previous=0;
  for(let i=-64;i<=64;i++){const z=i/8,r=adaptiveCDF(z);assert.ok(r.value>=previous);previous=r.value;close(r.value+adaptiveCDF(-z).value,1);assert.ok(r.value>=0&&r.value<=1);}
  assert.ok(adaptiveCDF(-8).value>0);assert.equal(adaptiveCDF(0).evaluations,0);
});
test('NIST rounded web reference is respected to its documented precision',()=>{
  for(const [z,reference] of NIST_REFERENCE)assert.ok(Math.abs(adaptiveCDF(z).value-reference)<=5e-6);
});
test('Uniform quadrature has second/fourth order on a nondegenerate normal interval',()=>{
  const expected=.8413447460685429;
  for(const [method,order] of [['trapezoid',4],['simpson',16]]){
    const error=n=>Math.abs(compositeCDF(1,n,method).value-expected);
    assert.ok(Math.abs(error(16)/error(32)-order)<.04);
  }
});
test('Power series converges against independent references on its supported range',()=>{
  for(const [z,ref] of references.filter(([z])=>Math.abs(z)<=3)){const r=seriesCDF(z);close(r.value,ref,3e-14);assert.ok(r.remainder<=1e-14);}
  assert.equal(seriesCDF(4),null);
});
test('Tolerance changes reduce adaptive work while retaining requested accuracy',()=>{
  const loose=adaptiveCDF(-1.96,1e-6),tight=adaptiveCDF(-1.96,1e-12);
  assert.ok(tight.evaluations>loose.evaluations);assert.ok(loose.errorEstimate<1e-6*.058440944333451476/2.96);
  close(loose.value,.024997895148220435,1e-8);
});
test('Numerical APIs reject invalid workload and evaluation inputs',()=>{
  for(const z of [NaN,Infinity,-9,9]){assert.throws(()=>adaptiveCDF(z));assert.throws(()=>compositeCDF(z));}
  for(const n of [0,-1,1.5,100000])assert.throws(()=>midpoint(x=>x,0,1,n));
  assert.throws(()=>compositeCDF(1,31));assert.throws(()=>rangeIntegral(f('sin'),0));assert.throws(()=>sampledRange(f('sin'),128,0));assert.throws(()=>integrationExperiment({id:'unknown'}));assert.throws(()=>adaptiveCDF(1,0));
});
