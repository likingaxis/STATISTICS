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
    measure:'Exact level-set measure: μ({x ∈ [0, π] : sin(x) > y}) = π − 2 arcsin(y) for 0 ≤ y ≤ 1.',
    comment:'Because sin(x) is smooth on [0, π], midpoint Riemann quadrature converges at second order O(N⁻²), whereas the uniform K-level simple-function midpoint converges at first order O(K⁻¹) toward the exact integral 2.' },
  { id:'square', label:'x² · [0, 1]', a:0, b:1, low:0, high:1, f:x=>x*x, integral:1/3,
    survival:y => 1-Math.sqrt(clamp(y,0,1)),
    measure:'Exact level-set measure: μ({x ∈ [0, 1] : x² > y}) = 1 − √y for 0 ≤ y ≤ 1.',
    comment:'In exact arithmetic, the midpoint Riemann error on x² over [0, 1] is identically 1/(12N²). On the range side, the square-root singularity in the derivative of 1 − √y near y = 0 governs the quantization error.' },
  { id:'step', label:'Step function (1 then 3, jump at x = ½)', a:0, b:1, low:1, high:3, f:x=>x<.5?1:3, integral:2,
    survival:y=>y<1?1:y<3?.5:0,
    measure:'Exact level-set measure: μ({f > y}) = 1 for y < 1, ½ for 1 ≤ y < 3, and 0 for y ≥ 3.',
    comment:'When N is even, x = ½ is a subinterval boundary and the midpoint rule integrates the step function with zero error; when N is odd, the central subinterval straddles the jump. From the Lebesgue perspective, a two-term simple function 1·μ([0, ½)) + 3·μ([½, 1]) = 2 is exact immediately.' },
  { id:'absolute', label:'|x − ½| · [0, 1]', a:0, b:1, low:0, high:.5, f:x=>Math.abs(x-.5), integral:.25,
    survival:y=>1-2*clamp(y,0,.5),
    measure:'Exact level-set measure: μ({x ∈ [0, 1] : |x − ½| > y}) = 1 − 2y for 0 ≤ y ≤ ½.',
    comment:'For any even N, the midpoint rule is exact on both linear branches of |x − ½|. Because the survival function 1 − 2y is also linear on [0, ½], the midpoint between the lower and upper Lebesgue simple-function bounds reproduces 0.25 to machine precision for every K.' },
  { id:'singular', label:'1/√x · (0, 1] (unbounded at x = 0)', a:0, b:1, low:1, high:16, f:x=>1/Math.sqrt(x), integral:2,
    survival:y=>y<1?1:1/(y*y),
    measure:'For the truncated function g_T(x) = min(1/√x, T): μ({g_T > y}) = 1/y² for 1 ≤ y < T, with ∫₀¹ g_T(x) dx = 2 − 1/T and omitted tail 1/T.',
    comment:'Because 1/√x is unbounded near 0, its Riemann integral on [0, 1] is improper; open midpoint tags avoid x = 0 but converge slowly at rate O(N⁻½). In the Lebesgue construction, refining K at a fixed cap T converges to the truncated integral 2 − 1/T, so T must also grow to eliminate the 1/T tail.' },
  { id:'indicator', label:'Indicator 1_[0, ½) · [0, 1]', a:0, b:1, low:0, high:1, f:x=>x<.5?1:0, integral:.5,
    survival:y=>y<0?1:y<1?.5:0,
    measure:'Exact level-set measure: μ({f > y}) = ½ for 0 ≤ y < 1, matching ∫₀¹ 1_[0, ½)(x) dx = μ([0, ½)) = ½.',
    comment:'By definition, the Lebesgue integral of an indicator function 1_E is simply the measure μ(E) = ½. Partitioning the range [0, 1] into K uniform bands still introduces an O(1/K) bracket width unless the two values {0, 1} are treated directly.' },
  { id:'sinc', label:'sin(x)/x · [0, π] with f(0) = 1', a:0, b:Math.PI, low:0, high:1, f:sinc, integral:1.8519370519824662,
    survival:sincPreimage,
    measure:'Because sin(x)/x is strictly decreasing on [0, π], μ({f > y}) equals its inverse x(y), computed here to machine precision via 48 bisection steps per level.',
    comment:'Setting f(0) = 1 removes the singularity at the origin, yielding the sine integral Si(π) ≈ 1.851937051982. Here evaluating f(x) at N midpoints is much cheaper than numerically inverting sin(x)/x = y across K range thresholds.' },
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
