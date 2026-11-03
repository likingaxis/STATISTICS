import test from 'node:test';
import assert from 'node:assert/strict';
import { Welford, SCORE_LAW, distributionMoments, estimatorTheory, drawScore, simulateWelford, checkpointSummary, traceWelford, parseScores, validateConfig } from '../src/welford.js';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const batch=xs=>{const mean=xs.reduce((a,b)=>a+b,0)/xs.length,SS=xs.reduce((s,x)=>s+(x-mean)**2,0);return {mean,SS,variance:xs.length>1?SS/(xs.length-1):null};};
const config={n:100,m:100,seed:20261103};
test('Welford handles empty/first/constant samples and rejects nonfinite input before mutation',()=>{
 const a=new Welford();assert.equal(a.sampleVariance,null);assert.equal(a.descriptiveVariance,null);a.add(7);assert.equal(a.mean,7);assert.equal(a.SS,0);assert.equal(a.sampleVariance,null);a.add(7).add(7);assert.equal(a.sampleVariance,0);const before={...a};for(const x of [NaN,Infinity,-Infinity])assert.throws(()=>a.add(x));assert.deepEqual({...a},before);
});
test('Worked sequence and every prefix agree with independent two-pass arithmetic',()=>{
 const xs=[2,8,5,0,10],rows=traceWelford(xs);assert.equal(rows[0].mean,null);assert.equal(rows[1].variance,null);
 for(let k=1;k<=xs.length;k++){const b=batch(xs.slice(0,k));close(rows[k].mean,b.mean);close(rows[k].SS,b.SS);if(k>1)close(rows[k].variance,b.variance);}
 close(rows.at(-1).mean,5);close(rows.at(-1).SS,68);close(rows.at(-1).variance,17);close(rows.at(-1).descriptive,13.6);
});
test('Explicit descriptive/sample variance recurrences reproduce SS-based variances',()=>{
 const xs=[0,10,5,2,8,10,0,5],a=new Welford();let v=0,s2=null;
 xs.forEach((x,i)=>{const k=i+1,delta=x-a.mean;v=(k-1)/k*v+(k-1)/(k*k)*delta*delta;if(k===2)s2=delta*delta/2;else if(k>=3)s2=(k-2)/(k-1)*s2+delta*delta/k;a.add(x);close(v,a.descriptiveVariance);if(k>1)close(s2,a.sampleVariance);});
});
test('Welford retains small spread under a large representable translation',()=>{
 const a=new Welford(),b=new Welford();for(const x of [4,7,13,16]){a.add(x);b.add(1e12+x);}close(a.SS,90);close(b.SS,90);close(b.mean-1e12,a.mean);close(b.sampleVariance,30);
});
test('Fixed weighted score law has the advertised mass and first/fourth central moments',()=>{
 assert.equal(SCORE_LAW.weights.reduce((a,b)=>a+b,0),10);assert.deepEqual(SCORE_LAW.scores,[0,2,5,8,10]);const p=distributionMoments();close(p.mean,5);close(p.variance,8.6);close(p.fourth,157.4);assert.ok(SCORE_LAW.scores.every(x=>x>=0&&x<=10));
});
test('Exact enumeration independently verifies unbiasedness, finite-n bias and Var(s²)',()=>{
 for(const n of [2,3]){let mean=0,varMean=0,avgS2=0,secondS2=0,biased=0;
  function enumerate(xs,prob){if(xs.length===n){const b=batch(xs);mean+=prob*b.mean;varMean+=prob*(b.mean-5)**2;avgS2+=prob*b.variance;secondS2+=prob*b.variance**2;biased+=prob*b.SS/n;return;}SCORE_LAW.scores.forEach((x,i)=>enumerate([...xs,x],prob*SCORE_LAW.weights[i]/10));}
  enumerate([],1);const t=estimatorTheory(n,100);close(mean,5);close(avgS2,8.6);close(varMean,t.varianceOfSampleMean);close(secondS2-avgS2**2,t.varianceOfSampleVariance);close(biased,t.meanOfDescriptiveVariances);
 }
});
test('Score sampler implements all ten weighted tickets and rejects modulo-bias tail',()=>{
 assert.deepEqual(Array.from({length:10},(_,i)=>drawScore(()=>i)),[0,2,2,5,5,5,5,8,8,10]);const seq=[4294967295,4294967290,9];assert.equal(drawScore(()=>seq.shift()),10);assert.equal(seq.length,0);
});
test('Simulated scores and each retained hacker state match an independent batch check',async()=>{
 const r=await simulateWelford(config);assert.equal(r.scoreCounts.reduce((a,b)=>a+b,0),10000);[1,3,4,6,7,9].forEach(x=>assert.equal(r.scoreCounts[x],0));
 r.paths.forEach((path,j)=>r.checkpoints.forEach((n,i)=>{const b=batch(Array.from(path.scores.slice(0,n)));close(r.means[i][j],b.mean);close(r.sumsOfSquares[i][j],b.SS,1e-7);close(path.means[n],b.mean);close(path.SS[n],b.SS,1e-7);}));
});
test('Seeded runs reproduce, extend n/m prefixes, and change with a new seed',async()=>{
 const a=await simulateWelford({...config,n:25,m:50}),b=await simulateWelford(config),again=await simulateWelford({...config,n:25,m:50});assert.deepEqual(a,again);
 a.checkpoints.forEach((n,i)=>{const bi=b.checkpoints.indexOf(n);assert.deepEqual(a.means[i],b.means[bi].slice(0,50));assert.deepEqual(a.sumsOfSquares[i],b.sumsOfSquares[bi].slice(0,50));});assert.deepEqual(a.paths[0].scores,b.paths[0].scores.slice(0,25));const other=await simulateWelford({...config,n:25,m:50,seed:42});assert.notDeepEqual(a.means.at(-1),other.means.at(-1));
});
test('Across-hacker summaries preserve checkpoint n and independently reproduce both estimator variances',async()=>{
 const r=await simulateWelford(config);r.checkpoints.forEach((n,i)=>{const s=checkpointSummary(r,i),a=batch(Array.from(r.means[i]));assert.equal(s.checkpoint,n);assert.equal(s.attackers,100);close(s.averageMean,a.mean);close(s.betweenMeanVariance,a.variance);if(n>1){const b=batch(Array.from(r.sumsOfSquares[i],SS=>SS/(n-1)));close(s.averageVariance,b.mean);close(s.betweenVarianceVariance,b.variance);close(s.estimatedSeVariance,Math.sqrt(b.variance/100));}});
});
test('n=1 keeps sample variance undefined at both statistical levels',async()=>{
 const r=await simulateWelford({...config,n:1}),s=checkpointSummary(r,0);assert.equal(s.averageVariance,null);assert.equal(s.betweenVarianceVariance,null);assert.equal(s.theory.varianceOfSampleVariance,null);assert.equal(s.estimatedSeVariance,null);assert.equal(s.averageDescriptiveVariance,0);assert.ok(r.sumsOfSquares[0].every(SS=>SS===0));
});
test('Default Monte Carlo averages and estimator variability agree with their exact references',async()=>{
 const r=await simulateWelford({...config,n:1000,m:1000}),s=checkpointSummary(r,r.checkpoints.length-1),t=s.theory;assert.ok(Math.abs(s.averageMean-5)<6*t.seMeanOfMeans);assert.ok(Math.abs(s.averageVariance-8.6)<6*t.seMeanOfVariances);assert.ok(Math.abs(s.betweenMeanVariance/t.varianceOfSampleMean-1)<0.2);assert.ok(Math.abs(s.betweenVarianceVariance/t.varianceOfSampleVariance-1)<0.2);close(t.seMeanOfMeans,Math.sqrt(8.6/1e6));
});
test('Bounded configurations and example parsing reject invalid or ambiguous empty data',()=>{
 for(const patch of [{n:0},{n:10001},{m:1},{m:2001},{seed:0},{seed:1.5}])assert.throws(()=>validateConfig({...config,...patch}));assert.deepEqual(parseScores('0, 2; 5 8 10,'),[0,2,5,8,10]);assert.deepEqual(parseScores('2.5 7.5'),[2.5,7.5]);for(const text of ['',',,','-1','11','abc','Infinity',Array(51).fill(5).join(',')])assert.throws(()=>parseScores(text));
});
