// normal-cdf-v1. No external service or built-in erf is used by these methods.
export const density=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
export const TAIL_CUTOFF=12;
export const omittedTailBound=density(TAIL_CUTOFF)/TAIL_CUTOFF;
function validate(z) {
  if(!Number.isFinite(z)||Math.abs(z)>8) throw new RangeError('Choose a finite z between −8 and 8.');
}
export function compositeCDF(z,n=256,method='simpson') {
  validate(z);
  if(!Number.isInteger(n)||n<2||n>65536||n%2) throw new RangeError('Use an even N from 2 to 65536.');
  if(!['simpson','trapezoid'].includes(method)) throw new RangeError('Unknown rule.');
  if(z===0) return {value:.5,tail:.5,evaluations:0};
  const a=Math.abs(z), h=a/n;
  let sum=density(0)+density(a);
  for(let i=1;i<n;i++) sum+=(method==='simpson'?(i%2?4:2):2)*density(i*h);
  const area=sum*h/(method==='simpson'?3:2);
  return {value:.5+Math.sign(z)*area,tail:.5-area,evaluations:n+1};
}
export function seriesCDF(z,tolerance=1e-14) {
  validate(z);
  // The entire series converges everywhere; the demo avoids severe cancellation.
  if(Math.abs(z)>3) return null;
  if(z===0) return {value:.5,evaluations:0,terms:0,remainder:0};
  let term=z, sum=term, j=0;
  let next=term*(-z*z/2)*(2*j+1)/((j+1)*(2*j+3));
  while(Math.abs(next)/Math.sqrt(2*Math.PI)>tolerance && j<199) {
    term=next; sum+=term; j++;
    next=term*(-z*z/2)*(2*j+1)/((j+1)*(2*j+3));
  }
  return {value:.5+sum/Math.sqrt(2*Math.PI),evaluations:0,terms:j+1,remainder:Math.abs(next)/Math.sqrt(2*Math.PI)};
}
export function adaptiveCDF(z,tolerance=1e-10) {
  validate(z);
  if(!Number.isFinite(tolerance)||tolerance<1e-13||tolerance>1e-4) throw new RangeError('Tolerance must be between 1e−13 and 1e−4.');
  if(z===0) return {value:.5,tail:.5,evaluations:0,errorEstimate:0,converged:true};
  const a=Math.abs(z), b=TAIL_CUTOFF;
  let evaluations=0,errorEstimate=0,converged=true;
  const f=x=>{evaluations++;return density(x);};
  const simpson=(l,r,fl,fm,fr)=>(r-l)*(fl+4*fm+fr)/6;
  function recurse(l,r,fl,fm,fr,whole,eps,depth) {
    const mid=(l+r)/2, f1=f((l+mid)/2),f2=f((mid+r)/2);
    const left=simpson(l,mid,fl,f1,fm),right=simpson(mid,r,fm,f2,fr),diff=left+right-whole;
    if(Math.abs(diff)<=15*eps||depth===0) {
      if(depth===0 && Math.abs(diff)>15*eps) converged=false;
      errorEstimate+=Math.abs(diff)/15;
      return left+right+diff/15;
    }
    return recurse(l,mid,fl,f1,fm,left,eps/2,depth-1)+recurse(mid,r,fm,f2,fr,right,eps/2,depth-1);
  }
  const fl=f(a),fm=f((a+b)/2),fr=f(b);
  // Relative scale of the upper tail, so negative extreme z retains precision.
  const eps=tolerance*density(a)/(a+1);
  const tail=recurse(a,b,fl,fm,fr,simpson(a,b,fl,fm,fr),eps,24);
  return {value:z<0?tail:1-tail,tail,evaluations,errorEstimate,converged};
}
// NIST table: area from 0 to |z|, converted to the CDF using symmetry.
// Values have five decimal places; their rounding uncertainty is ±0.000005.
export const NIST_REFERENCE=[[-3,.00135],[-1.96,.02500],[-1,.15866],[-.5,.30854],[0,.5],[.5,.69146],[1,.84134],[1.96,.97500],[3,.99865]];
export function cdfComparison(z,n=256,tolerance=1e-10) {
  return {z,adaptive:adaptiveCDF(z,tolerance),trapezoid:compositeCDF(z,n,'trapezoid'),simpson:compositeCDF(z,n),series:seriesCDF(z)};
}
