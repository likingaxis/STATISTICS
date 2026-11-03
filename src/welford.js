// welford-v1: bounded-score iid teaching model; deterministic Monte Carlo streams.
export const PROTOCOL = "welford-v1";
export const SCORE_LAW = Object.freeze({ id: "weighted-five-v1", scores: Object.freeze([0, 2, 5, 8, 10]), weights: Object.freeze([1, 2, 4, 2, 1]), denominator: 10 });
export const CHECKPOINTS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
export class Welford {
  constructor() { this.count = 0; this.mean = 0; this.SS = 0; }
  add(x) {
    if (!Number.isFinite(x)) throw new Error("Observations must be finite numbers.");
    const delta = x - this.mean;
    this.mean += delta / ++this.count;
    this.SS += delta * (x - this.mean);
    return this;
  }
  get sampleVariance() { return this.count > 1 ? this.SS / (this.count - 1) : null; }
  get descriptiveVariance() { return this.count ? this.SS / this.count : null; }
}
export function distributionMoments() {
  const { scores, weights, denominator } = SCORE_LAW;
  const mean = scores.reduce((s,x,i)=>s+x*weights[i]/denominator,0);
  const variance = scores.reduce((s,x,i)=>s+(x-mean)**2*weights[i]/denominator,0);
  const fourth = scores.reduce((s,x,i)=>s+(x-mean)**4*weights[i]/denominator,0);
  return { mean, variance, fourth };
}
export function estimatorTheory(n, m) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(m) || m < 1) throw new Error("n and m must be positive integers.");
  const { mean, variance, fourth } = distributionMoments();
  const varianceOfSampleVariance = n > 1 ? (fourth - (n - 3) / (n - 1) * variance ** 2) / n : null;
  return { mean, variance, fourth, meanOfMeans: mean, meanOfVariances: n > 1 ? variance : null, meanOfDescriptiveVariances: (n-1)/n*variance, varianceOfSampleMean: variance/n, varianceOfSampleVariance, seMeanOfMeans: Math.sqrt(variance/(n*m)), seMeanOfVariances: n > 1 ? Math.sqrt(varianceOfSampleVariance/m) : null };
}
function stream(seed, attacker) {
  let a = (seed ^ Math.imul(attacker + 1, 0x9e3779b9) ^ 0xa341316c) >>> 0;
  a ^= a >>> 16; a = Math.imul(a, 0x7feb352d); a ^= a >>> 15;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
}
export function drawScore(randomUint32) {
  // Rejection sampling avoids bias when mapping a 32-bit output to ten weighted tickets.
  let u; do { u = randomUint32(); } while (u >= 4294967290);
  const ticket = u % 10;
  return ticket < 1 ? 0 : ticket < 3 ? 2 : ticket < 7 ? 5 : ticket < 9 ? 8 : 10;
}
export function validateConfig({ n, m, seed }) {
  if (!Number.isInteger(n) || n < 1 || n > 10000) throw new Error("Systems n must be an integer from 1 to 10,000.");
  if (!Number.isInteger(m) || m < 2 || m > 2000) throw new Error("Hackers m must be an integer from 2 to 2,000.");
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) throw new Error("Seed must be an integer from 1 to 4,294,967,295.");
}
export async function simulateWelford(config, progress = () => {}) {
  validateConfig(config);
  const { n, m, seed } = config;
  const checkpoints = [...new Set([...CHECKPOINTS.filter(k => k <= n), n])].sort((a,b)=>a-b);
  const means = checkpoints.map(()=>new Float64Array(m)), sumsOfSquares = checkpoints.map(()=>new Float64Array(m));
  const paths = [], scoreCounts = new Uint32Array(11);
  for (let j=0;j<m;j++) {
    const random=stream(seed,j), acc=new Welford(); let ci=0;
    const path=j<Math.min(12,m)?{scores:new Uint8Array(n),means:new Float64Array(n+1),SS:new Float64Array(n+1)}:null;
    for(let k=1;k<=n;k++) {
      const x=drawScore(random);scoreCounts[x]++;acc.add(x);
      if(path){path.scores[k-1]=x;path.means[k]=acc.mean;path.SS[k]=acc.SS;}
      if(k===checkpoints[ci]){means[ci][j]=acc.mean;sumsOfSquares[ci++][j]=acc.SS;}
    }
    if(path)paths.push(path);
    if((j+1)%128===0){progress({completed:j+1,m});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  return { protocol:PROTOCOL,distribution:SCORE_LAW.id,config:{...config},checkpoints,means,sumsOfSquares,paths,scoreCounts };
}
function stats(values) { const a=new Welford();for(const x of values)a.add(x);return {count:a.count,mean:a.count?a.mean:null,variance:a.sampleVariance}; }
export function checkpointSummary(result, ci) {
  const n=result.checkpoints[ci],m=result.config.m,means=result.means[ci],SS=result.sumsOfSquares[ci];
  const a=stats(means),b=n>1?stats(Array.from(SS,s=>s/(n-1))):{count:0,mean:null,variance:null};
  return { checkpoint:n,attackers:m,averageMean:a.mean,averageVariance:b.mean,averageDescriptiveVariance:stats(Array.from(SS,s=>s/n)).mean,betweenMeanVariance:a.variance,betweenVarianceVariance:b.variance,estimatedSeMean:Math.sqrt(a.variance/m),estimatedSeVariance:n>1?Math.sqrt(b.variance/m):null,theory:estimatorTheory(n,m) };
}
export function traceWelford(values) {
  const a=new Welford(),rows=[{step:0,x:null,oldMean:null,delta:null,mean:null,SS:0,variance:null,descriptive:null}];
  for(const x of values){const old=a.mean;a.add(x);rows.push({step:a.count,x,oldMean:old,delta:x-old,mean:a.mean,SS:a.SS,variance:a.sampleVariance,descriptive:a.descriptiveVariance});}
  return rows;
}
export function parseScores(text) {
  const clean=text.trim();if(!clean)throw new Error("Enter at least one score from 0 to 10.");
  const tokens=clean.split(/[\s,;]+/).filter(Boolean);if(!tokens.length)throw new Error("Enter at least one score from 0 to 10.");if(tokens.length>50)throw new Error("Use at most 50 scores in the worked example.");
  const xs=tokens.map(Number);if(xs.some(x=>!Number.isFinite(x)||x<0||x>10))throw new Error("Every example score must be a finite number from 0 to 10. Separate scores with commas or spaces; use a decimal point.");
  return xs;
}
