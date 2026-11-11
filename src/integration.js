// integration-v1: deterministic midpoint quadrature and range simple functions.
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sinc = x => x === 0 ? 1 : Math.sin(x) / x;
function sincPreimage(y) {
  if (y <= 0) return Math.PI;
  if (y >= 1) return 0;
  let lo = 0, hi = Math.PI;
  for (let i = 0; i < 48; i++) {
    const m = (lo + hi) / 2;
    if (sinc(m) > y) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
export const FUNCTIONS = [
  { id:'sin', label:'sin(x) · [0, π]', a:0, b:Math.PI, low:0, high:1, f:Math.sin, integral:2,
    survival:y => y < 0 ? Math.PI : y >= 1 ? 0 : Math.PI - 2*Math.asin(y),
    measure:'μ{sin(x)>y} = π − 2 asin(y), 0≤y≤1.', comment:'Smooth: midpoint error is O(N⁻²). The range bound shrinks as O(K⁻¹); the two sums approach 2.' },
  { id:'square', label:'x² · [0, 1]', a:0, b:1, low:0, high:1, f:x=>x*x, integral:1/3,
    survival:y => 1-Math.sqrt(clamp(y,0,1)), measure:'μ{x²>y} = 1 − √y, 0≤y≤1.',
    comment:'Midpoint error is exactly 1/(12N²) in real arithmetic. The square-root preimage makes the range integral less smooth near zero.' },
  { id:'step', label:'1 then 3 · jump at ½', a:0, b:1, low:1, high:3, f:x=>x<.5?1:3, integral:2,
    survival:y=>y<1?1:y<3?.5:0, measure:'μ{f>y} = 1 for y<1; ½ for 1≤y<3; 0 for y≥3.',
    comment:'An even domain grid aligns with the jump and is exact; odd N need not be. The exact simple-function integral is 1·½ + 3·½ = 2, requiring only two level sets.' },
  { id:'absolute', label:'|x − ½| · [0, 1]', a:0, b:1, low:0, high:.5, f:x=>Math.abs(x-.5), integral:.25,
    survival:y=>1-2*clamp(y,0,.5), measure:'μ{|x−½|>y} = 1 − 2y, 0≤y≤½.',
    comment:'A midpoint grid with even N splits at the corner and is exact on each linear half. Range midpoint sums are also exact in real arithmetic because the survival function is linear.' },
  { id:'singular', label:'1/√x · (0, 1]', a:0, b:1, low:1, high:16, f:x=>1/Math.sqrt(x), integral:2,
    survival:y=>y<1?1:1/(y*y), measure:'For g=min(f,T): μ{g>y}=1/y² for 1≤y<T. ∫g=2−1/T; the discarded tail is 1/T.',
    comment:'The original function is unbounded: it has an improper Riemann integral, not a proper one on [0,1]. Midpoints avoid x=0 but converge only at order N⁻½. Increasing K at fixed cap T converges to 2−1/T, not 2.' },
  { id:'indicator', label:'1 then 0 · jump at ½', a:0, b:1, low:0, high:1, f:x=>x<.5?1:0, integral:.5,
    survival:y=>y<0?1:y<1?.5:0, measure:'μ{f>y} = ½ for 0≤y<1. Directly, ∫1_[0,½) = μ([0,½)) = ½.',
    comment:'A two-valued measurable function is integrated exactly from its two preimages. A uniform range partition still introduces quantization; it is not the most efficient representation of this function.' },
  { id:'sinc', label:'sin(x)/x · [0, π], f(0)=1', a:0, b:Math.PI, low:0, high:1, f:sinc, integral:1.8519370519824662,
    survival:sincPreimage, measure:'sin(x)/x decreases on (0,π): μ{f>y} is its inverse. Each threshold is solved by 48 bisections (domain error ≤π/2⁴⁸).',
    comment:'The removable singularity is filled with f(0)=1. The reference is Si(π), independently checked numerically. Preimage inversion is much more expensive here than a direct midpoint function evaluation.' },
];
function integer(n,lo,hi,name) {
  if(!Number.isInteger(n)||n<lo||n>hi) throw new RangeError(`${name} must be an integer in [${lo}, ${hi}].`);
}
export function midpoint(f,a,b,n) {
  integer(n,1,65536,'N');
  const h=(b-a)/n; let sum=0;
  for(let i=0;i<n;i++) sum+=f(a+(i+.5)*h);
  return {value:sum*h,evaluations:n};
}
export function rangeIntegral(fn,k,cap=16) {
  integer(k,1,8192,'K');
  if(!Number.isFinite(cap)||cap<2||cap>256) throw new RangeError('Cap T must be between 2 and 256.');
  const high=fn.id==='singular'?cap:fn.high, delta=(high-fn.low)/k, length=fn.b-fn.a;
  let sum=0;
  for(let j=1;j<k;j++) sum+=fn.survival(fn.low+j*delta);
  const lower=fn.low*length+delta*sum, upper=lower+delta*length;
  return {value:(lower+upper)/2,lower,upper,delta,queries:k-1,
    target:fn.id==='singular'?2-1/cap:fn.integral,
    tail:fn.id==='singular'?1/cap:0};
}
export function sampledRange(fn,k,m,cap=16) {
  integer(k,1,8192,'K'); integer(m,1,65536,'M');
  const high=fn.id==='singular'?cap:fn.high, delta=(high-fn.low)/k;
  const counts=new Uint32Array(k); let sum=0;
  for(let i=0;i<m;i++) {
    const y=Math.min(high,fn.f(fn.a+(i+.5)*(fn.b-fn.a)/m));
    const bin=clamp(Math.ceil((y-fn.low)/delta)-1,0,k-1);
    counts[bin]++; sum+=fn.low+(bin+.5)*delta;
  }
  return {value:sum*(fn.b-fn.a)/m,counts,evaluations:m};
}
export function integrationExperiment({id='sin',n=256,k=128,m=2048,cap=16}={}) {
  const fn=FUNCTIONS.find(f=>f.id===id);
  if(!fn) throw new RangeError('Unknown function.');
  return {config:{id,n,k,m,cap},midpoint:midpoint(fn.f,fn.a,fn.b,n),range:rangeIntegral(fn,k,cap),sampled:sampledRange(fn,k,m,cap)};
}
export const gcd=(a,b)=>{while(b){const r=a%b;a=b;b=r;}return a;};
// Exact integer arithmetic for the mathematical rational tags (2i+1)/(2N).
export function thomaeMidpoint(n) {
  integer(n,1,65536,'N'); let sum=0;
  for(let i=0;i<n;i++) sum+=gcd(2*i+1,2*n)/(2*n);
  return sum/n;
}
