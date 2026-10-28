import test from "node:test";
import assert from "node:assert/strict";
import { parameters, theory, simulate, exactLaw, moments, standardized, normalCDF, cdfDistance, normalLawDistance, summarize, histogram, outside, validateConfig } from "../src/stochastic.js";
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const config={n:100,m:100,p:0.3,seed:20261028};
test("Both models have the required means and three variance scalings",()=>{
  assert.deepEqual(parameters('rademacher'),{mu:0,variance:1,q:0.5});
  const b=theory('bernoulli',400,0.25),r=theory('rademacher',400);
  close(b.total.mean,100);close(b.total.variance,75);close(b.average.variance,0.1875/400);close(b.normalized.mean,5);close(b.normalized.variance,0.1875);
  close(r.normalized.mean,0);close(r.normalized.variance,1);close(r.average.variance,1/400);
});
test("Exact finite laws agree with independently enumerated two-step probabilities",()=>{
  assert.deepEqual([...exactLaw('bernoulli',2,0.25).scores],[0,1,2]);
  exactLaw('bernoulli',2,0.25).mass.forEach((p,i)=>close(p,[0.5625,0.375,0.0625][i]));
  const r=exactLaw('rademacher',2);assert.deepEqual([...r.scores],[-2,0,2]);r.mass.forEach((p,i)=>close(p,[0.25,0.5,0.25][i]));
});
test("Stable large-n mass retains unit probability, mean and variance, including rare p",()=>{
  for(const [model,p] of [['rademacher',0.5],['bernoulli',0.01],['bernoulli',0.99],['bernoulli',0],['bernoulli',1]]){
    const n=10000,law=exactLaw(model,n,p);let mass=0,mean=0;for(let k=0;k<=n;k++){mass+=law.mass[k];mean+=law.scores[k]*law.mass[k];}
    let variance=0;for(let k=0;k<=n;k++)variance+=(law.scores[k]-mean)**2*law.mass[k];
    close(mass,1,1e-12);close(mean,theory(model,n,p).total.mean,1e-7);close(variance,theory(model,n,p).total.variance,1e-6);
  }
});
test("Simulation paths have only permitted increments, valid endpoints and Rademacher parity",async()=>{
  const r=await simulate(config);
  for(const model of ['bernoulli','rademacher']){
    r.models[model].paths.forEach((path,j)=>{for(let k=1;k<path.length;k++)assert.ok((model==='bernoulli'?[0,1]:[-1,1]).includes(path[k]-path[k-1]));
      r.checkpoints.forEach((k,i)=>assert.equal(path[k],r.models[model].totals[i][j]));});
    r.models[model].totals.forEach((v,i)=>v.forEach(x=>{assert.ok(model==='bernoulli'?x>=0&&x<=r.checkpoints[i]:Math.abs(x)<=r.checkpoints[i]);if(model==='rademacher')assert.equal(Math.abs((x-r.checkpoints[i])%2),0);}));
  }
});
test("Runs reproduce exactly and retain prefixes when n and m increase",async()=>{
  const a=await simulate({...config,n:25,m:50}),b=await simulate({...config,n:100,m:100}),again=await simulate({...config,n:25,m:50});
  assert.deepEqual(a,again);
  for(const model of ['bernoulli','rademacher'])a.checkpoints.forEach((n,ci)=>assert.deepEqual(a.models[model].totals[ci],b.models[model].totals[b.checkpoints.indexOf(n)].slice(0,50)));
  const other=await simulate({...config,n:25,m:50,seed:12345});assert.notDeepEqual(a.models.rademacher.totals.at(-1),other.models.rademacher.totals.at(-1));
});
test("p=0 and p=1 are deterministic and have no standardized Bernoulli variable",async()=>{
  for(const p of [0,1]){const r=await simulate({...config,n:25,m:20,p});assert.ok(r.models.bernoulli.totals.at(-1).every(x=>x===25*p));assert.equal(standardized(25*p,25,'bernoulli',p),null);const s=summarize(r.models.bernoulli.totals.at(-1),'bernoulli',25,p,0.1);assert.equal(s.variance,0);assert.equal(s.exactTail,0);assert.equal(s.empiricalD,null);assert.equal(s.exactD,null);}
});
test("LLN strict tail event, exact binomial tail and Chebyshev bound agree",()=>{
  const law=exactLaw('bernoulli',2,0.5),s=summarize([0,1,1,2],'bernoulli',2,0.5,0.25,law);
  close(s.exactTail,0.5);close(s.fraction,0.5);assert.equal(outside(3,10,0.2,0.1),false);
  for(const model of ['bernoulli','rademacher'])for(const n of [5,50,500]){const x=summarize([0,1],model,n,0.3,0.1);assert.ok(x.exactTail<=x.bound+1e-12);}
  assert.ok(s.interval[0]<0.5&&s.interval[1]>0.5);
});
test("Histogram counts and exact bin masses share correct denominators at all three scales",()=>{
  const v=[-4,-2,0,0,2,4],law=exactLaw('rademacher',4);
  for(const kind of ['total','average','normalized']){const h=histogram(v,law,4,kind);assert.equal(h.reduce((a,b)=>a+b.count,0),v.length);close(h.reduce((a,b)=>a+b.probability,0),1);}
});
test("Normal reference and CDF distances handle discrete jumps rather than treating mass as density",()=>{
  close(normalCDF(0),0.5);close(normalCDF(1.95996398454),0.975,2e-7);close(normalCDF(-8)+normalCDF(8),1,1e-12);close(cdfDistance([0,0]),0.5);
  const d1=normalLawDistance(exactLaw('rademacher',1),1,'rademacher',0.5),d1000=normalLawDistance(exactLaw('rademacher',1000),1000,'rademacher',0.5);
  assert.ok(d1000<0.02&&d1000<d1);close(standardized(120,400,'bernoulli',0.3),0);close(standardized(20,400,'rademacher'),1);
});
test("Default Monte Carlo experiment agrees with model moments within declared tolerances",async()=>{
  const r=await simulate({...config,n:1000,m:1000});
  for(const model of ['bernoulli','rademacher']){const x=moments(r.models[model].totals.at(-1)),t=theory(model,1000,0.3).total;assert.ok(Math.abs(x.mean-t.mean)<5*Math.sqrt(t.variance/1000));assert.ok(Math.abs(x.variance/t.variance-1)<0.15);}
});
test("Simulation rejects invalid and unbounded configurations",()=>{
  for(const patch of [{n:0},{n:10001},{m:1},{m:2001},{p:-0.1},{p:NaN},{seed:0},{seed:1.5}])assert.throws(()=>validateConfig({...config,...patch}));
});
