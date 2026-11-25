const betaPriors = [
  { name: "Uniform", a: 1, b: 1 },
  { name: "Symmetric, centered at 50%", a: 2, b: 2 },
  { name: "Centered at 20%", a: 2, b: 8 },
];

const percent = (value) => `${(100 * value).toFixed(2)}%`;

function precisionResults(n) {
  const standardError = 12 / Math.sqrt(n);
  const margin = 1.96 * standardError;
  return `
    <div class="hw8-bar-row"><span>Independent observations</span><strong>${standardError.toFixed(2)}</strong></div>
    <div class="hw8-track" aria-hidden="true"><span style="width: ${100 * standardError / 12}%"></span></div>
    <div class="hw8-bar-row"><span>Copies of one observation</span><strong>12.00</strong></div>
    <div class="hw8-track hw8-reference" aria-hidden="true"><span></span></div>
    <p>For an observed mean of 50, the independent-sample 95% confidence interval is approximately <strong>[${(50 - margin).toFixed(2)}, ${(50 + margin).toFixed(2)}]</strong>.</p>`;
}

function inspectionResults(priorPercent) {
  const prior = priorPercent / 100;
  const trueFlags = prior * 0.90;
  const falseFlags = (1 - prior) * 0.05;
  const posterior = trueFlags / (trueFlags + falseFlags);
  return `
    <div class="hw8-bar-row"><span>Probability a flagged item is defective</span><strong>${percent(posterior)}</strong></div>
    <div class="hw8-track hw8-reference" aria-hidden="true"><span style="width: ${100 * posterior}%"></span></div>
    <p>Per 10,000 items, the model expects <strong>${+(10_000 * trueFlags).toFixed(1)} true flags</strong> and <strong>${+(10_000 * falseFlags).toFixed(1)} false flags</strong>.</p>`;
}

function posteriorRows(n) {
  const successes = n * 0.8;
  return betaPriors.map(({ name, a, b }) => {
    const posteriorA = a + successes;
    const posteriorB = b + n - successes;
    return `<tr><th scope="row">${name}</th><td>Beta(${a}, ${b})</td><td>Beta(${posteriorA}, ${posteriorB})</td><td>${percent(posteriorA / (posteriorA + posteriorB))}</td></tr>`;
  }).join("");
}

export function renderHomework8({ chapterIntro, sectionHead }) {
  return `<main id="main" class="homework-eight">${chapterIntro(
    "8",
    "Modes of Convergence<br><em>and Bayesian Inference</em>",
    "Study how sample averages behave as observations accumulate, then use Bayes’ theorem to update probabilities and estimate an unknown success rate.",
    "LIMIT THEOREMS · CONDITIONAL PROBABILITY",
  )}
  <nav class="section-nav" aria-label="Chapter sections">
    <a href="#hw8-convergence">Modes of convergence</a>
    <a href="#hw8-scaling">LLN, CLT &amp; √n</a>
    <a href="#hw8-bayes">Bayes’ theorem</a>
    <a href="#hw8-examples">Bayesian examples</a>
  </nav>

  <section id="hw8-convergence" class="content-section">
    ${sectionHead("EXERCISE 1", "Modes of convergence in probability theory", "A limit can describe individual sample paths, the probability of an error, the size of squared errors, or the shape of an entire distribution.")}
    <div class="table-scroll" role="region" aria-label="Modes of convergence comparison" tabindex="0">
      <table class="hw8-modes">
        <thead><tr><th scope="col">Mode</th><th scope="col">Definition</th><th scope="col">Interpretation and statistical role</th></tr></thead>
        <tbody>
          <tr><th scope="row">In probability</th><td>P(|Xₙ − X| &gt; ε) → 0 for every ε &gt; 0.</td><td>The chance of exceeding any fixed error tolerance vanishes. This is the weak law’s conclusion and a standard definition of estimator consistency.</td></tr>
          <tr><th scope="row">Almost surely (a.s.)</th><td>P(lim<sub>n→∞</sub> Xₙ = X) = 1.</td><td>On almost every infinite sample path, the sequence eventually stays within any fixed tolerance of its limit. This is the strong law’s conclusion.</td></tr>
          <tr><th scope="row">In mean square (L²)</th><td>E[(Xₙ − X)²] → 0 for square-integrable variables.</td><td>Mean squared error vanishes. Large errors receive extra weight. This is useful for assessing estimator accuracy and proves the weak law in the finite-variance i.i.d. case.</td></tr>
          <tr><th scope="row">In distribution</th><td>F<sub>Xₙ</sub>(t) → F<sub>X</sub>(t) at each continuity point t of F<sub>X</sub>.</td><td>The cumulative distributions approach a limiting law. The CLT uses this to approximate the sampling distribution of a standardized statistic.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="prose hw8-flow">
      <p>Almost sure convergence and L² convergence each imply convergence in probability, which implies convergence in distribution. The L² implication follows from <strong>P(|Xₙ − X| &gt; ε) ≤ E[(Xₙ − X)²] / ε²</strong>. For the almost sure implication, the indicators of errors above ε converge to zero almost surely, so their expectations tend to zero by bounded convergence. Convergence in distribution to a constant also implies convergence in probability to that constant.</p>
      <details>
        <summary>Counterexamples to the reverse implications</summary>
        <ul>
          <li><strong>L² need not imply a.s.</strong> Let Xₙ be independent indicators with P(Xₙ = 1) = 1/n. Then E[Xₙ²] = 1/n, but the second Borel–Cantelli lemma gives infinitely many ones with probability one because ∑ 1/n diverges. This also shows convergence in probability can hold without a.s. convergence.</li>
          <li><strong>A.s. need not imply L².</strong> For U uniform on (0, 1), let Xₙ = √n · 1{U ≤ 1/n}. Each positive U eventually makes Xₙ zero, yet E[Xₙ²] = n · (1/n) = 1. This also gives convergence in probability without L² convergence.</li>
          <li><strong>Distribution need not imply probability.</strong> Let X be equally likely to be −1 or 1 and set Xₙ = −X for every n. The distributions are identical and |Xₙ − X| = 2 almost surely.</li>
        </ul>
      </details>
    </div>
  </section>

  <section id="hw8-scaling" class="content-section">
    ${sectionHead("EXERCISE 1", "The LLN, the CLT, and the square-root scale")}
    <div class="two-col prose">
      <article>
        <h3>Where the sample mean goes</h3>
        <p>Let X₁, X₂, … be independent and identically distributed (i.i.d.), with finite mean μ and variance σ². Write Sₙ = ∑<sub>i=1</sub><sup>n</sup> Xᵢ and X̄ₙ = Sₙ/n. The <strong>weak LLN</strong> gives X̄ₙ → μ in probability. In the finite-variance setting, E[(X̄ₙ − μ)²] = σ²/n, so the mean also converges in L² and Chebyshev’s inequality bounds its error probability by σ²/(nε²).</p>
        <p>The <strong>strong LLN</strong> gives X̄ₙ → μ almost surely for i.i.d. observations with E|X₁| &lt; ∞. A finite variance is unnecessary for this form of the strong law.</p>
      </article>
      <article>
        <h3>How the sample mean fluctuates</h3>
        <p>For i.i.d. observations with 0 &lt; σ² &lt; ∞, the <strong>classical CLT</strong> gives</p>
        <p class="hw8-equation">(Sₙ − nμ)/(σ√n) = √n(X̄ₙ − μ)/σ → 𝒩(0, 1) in distribution.</p>
        <p>The unscaled mean concentrates at μ. After centering and rescaling, its spread stays visible and its distribution approaches a Gaussian. This yields approximate confidence intervals and tests. If σ is unknown and the sample standard deviation consistently estimates it, Slutsky’s theorem justifies substituting it in the standardized statistic asymptotically.</p>
      </article>
    </div>
    <div class="formula-box hw8-flow">
      <h3>Why √n appears</h3>
      <p class="hw8-equation">Var(Sₙ) = ∑<sub>i</sub> Var(Xᵢ) + 2∑<sub>i&lt;j</sub> Cov(Xᵢ, Xⱼ).</p>
      <p>Independence makes all cross-covariances zero. With common variance σ², the sum has variance nσ² and standard deviation σ√n. Dividing by n gives the mean variance σ²/n and standard error σ/√n. Four times as many independent observations halve that standard error.</p>
      <p>Pairwise zero covariance suffices for variance additivity. A Gaussian limit requires additional assumptions, such as those of the classical i.i.d. CLT. With dependence the covariance terms matter. If Xᵢ = Y for every i, then Sₙ = nY and Var(Sₙ) = n²σ², so averaging copies leaves the standard error at σ. Some weakly dependent processes still have a √n CLT with a variance that includes autocovariances. Heavy-tailed i.i.d. data can satisfy the LLN even when their variance is infinite and the classical CLT is unavailable.</p>
    </div>
    <div class="panel hw8-demo">
      <div class="controls">
        <h3>Standard error as sample size grows</h3>
        <p>Fix the population standard deviation at σ = 12. The bars use a common scale from 0 to 12.</p>
        <label for="hw8-size">Sample size n</label>
        <select id="hw8-size"><option>25</option><option selected>100</option><option>400</option><option>1600</option></select>
      </div>
      <div id="hw8-precision-output" aria-live="polite">${precisionResults(100)}</div>
    </div>
    <p class="hw8-sources">References. <a href="https://ocw.mit.edu/courses/18-175-theory-of-probability-spring-2014/4e8a2305c745bd5a82a5f15cf8bcb8bb_MIT18_175S14_Lecture9.pdf">MIT, Strong Law of Large Numbers</a> · <a href="https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/resources/mit18_05_s22_class06-prep-b_pdf/">MIT, Central Limit Theorem and Law of Large Numbers</a>.</p>
  </section>

  <section id="hw8-bayes" class="content-section">
    ${sectionHead("EXERCISE 2", "Conditional probability and Bayesian inference")}
    <div class="two-col prose">
      <article>
        <h3>Conditioning on information</h3>
        <p>For events A and B with P(B) &gt; 0, <strong>P(A | B) = P(A ∩ B) / P(B)</strong>. Conditioning restricts attention to outcomes in B and rescales their probability to one. In a contingency table, an estimate of P(A | B) is the number in both groups divided by the number in B. In a statistical model, conditioning also describes how observations are generated given a parameter or hypothesis.</p>
        <p>The multiplication rule gives P(A ∩ B) = P(B | A)P(A) = P(A | B)P(B) when both conditionals exist. Solving for P(A | B) gives Bayes’ theorem. For a partition of hypotheses Hᵢ, total probability gives P(D) = ∑<sub>i</sub> P(D | Hᵢ)P(Hᵢ), which normalizes the posterior weights.</p>
      </article>
      <article>
        <h3>Prior, likelihood, and posterior</h3>
        <dl class="hw8-terms">
          <dt>Prior π(θ)</dt><dd>Represents uncertainty about θ before incorporating the current data. It can encode historical evidence or plausible parameter values.</dd>
          <dt>Likelihood L(θ; d) = p(d | θ)</dt><dd>Holds the observed data d fixed and compares how well different θ values explain them. As a function of θ, it need not integrate or sum to one.</dd>
          <dt>Posterior π(θ | d)</dt><dd>Represents uncertainty about θ after incorporating d under the prior and the sampling model. The denominator, or marginal likelihood, makes the total posterior mass one.</dd>
        </dl>
      </article>
    </div>
    <div class="formula-box hw8-flow">
      <p class="hw8-equation">P(H | D) = P(D | H)P(H) / P(D)</p>
      <p class="hw8-equation">π(θ | d) = p(d | θ)π(θ) / ∫ p(d | t)π(t) dt</p>
      <p>The first formula updates a hypothesis probability and the second updates a parameter density, assuming positive, finite marginal likelihood for the observation.</p>
    </div>
    <div class="prose hw8-flow">
      <p>The posterior supports estimates, credible intervals, and predictions. A 95% credible interval contains 95% posterior probability for θ under the model. A posterior predictive distribution averages the distribution of future observations over the posterior uncertainty in θ. With conditionally independent batches, the posterior from the first batch becomes the prior for the second. Multiplying by the second batch’s likelihood gives the same update as using the joint likelihood for both batches.</p>
    </div>
  </section>

  <section id="hw8-examples" class="content-section">
    ${sectionHead("EXERCISE 2", "Worked examples of Bayesian updating")}
    <div class="prose">
      <h3>Quality inspection and the base rate</h3>
      <p>Suppose a factory’s inspection flags 90% of defective items and 5% of sound items. Let H mean “defective” and D mean “flagged.” A historical defect rate of 1% gives prior P(H) = 0.01. The likelihoods are P(D | H) = 0.90 and P(D | Hᶜ) = 0.05. Bayes’ theorem gives</p>
      <p class="hw8-equation">P(H | D) = (0.90 × 0.01) / [(0.90 × 0.01) + (0.05 × 0.99)] ≈ 15.38%.</p>
      <p>Among 10,000 items, the model expects 90 true flags and 495 false flags. The high proportion of sound items explains why most flags are false at this base rate. Try 10% below with the same inspection performance and the posterior rises to 66.67%. This calculation helps prioritize manual follow-up. Historical rates and measured inspection performance must be relevant to the current production line.</p>
    </div>
    <div class="panel hw8-demo">
      <div class="controls">
        <label for="hw8-base-rate">Prior defect rate</label>
        <select id="hw8-base-rate"><option value="0.1">0.1%</option><option value="1" selected>1%</option><option value="5">5%</option><option value="10">10%</option></select>
      </div>
      <div id="hw8-inspection-output" aria-live="polite">${inspectionResults(1)}</div>
    </div>
    <div class="prose hw8-flow">
      <h3>Estimating an unknown pass rate</h3>
      <p>A new process passes 8 of 10 trials. Assume trials are independent given a common pass probability θ. For k passes in n trials the binomial likelihood is <strong>L(θ; k, n) = C(n, k) θ<sup>k</sup>(1 − θ)<sup>n−k</sup></strong>. A Beta(a, b) prior has density proportional to θ<sup>a−1</sup>(1 − θ)<sup>b−1</sup>. Multiplying adds the exponents, so the posterior is <strong>Beta(a + k, b + n − k)</strong>. This conjugacy gives a closed-form update.</p>
      <p>The posterior mean (a + k)/(a + b + n) combines the prior mean and the observed pass fraction with weights proportional to a + b and n. Under the same model it is also the predictive probability that the next trial passes. With 8 passes, the uniform prior yields 75%, while the prior centered at 20% yields 50%. The table keeps the observed pass fraction at 80% and varies sample size.</p>
    </div>
    <div class="panel hw8-flow">
      <div class="controls hw8-select">
        <label for="hw8-trials">Observed trials</label>
        <select id="hw8-trials"><option value="10">8 passes out of 10</option><option value="100">80 passes out of 100</option><option value="1000">800 passes out of 1,000</option></select>
      </div>
      <div class="table-scroll" role="region" aria-label="Posterior sensitivity to prior choice" tabindex="0">
        <table class="hw8-beta">
          <thead><tr><th scope="col">Prior assumption</th><th scope="col">Prior</th><th scope="col">Posterior</th><th scope="col">Posterior mean</th></tr></thead>
          <tbody id="hw8-posterior-rows" aria-live="polite">${posteriorRows(10)}</tbody>
        </table>
      </div>
    </div>
    <div class="two-col prose hw8-flow">
      <article><h3>What the update contributes</h3><p>Relevant prior information can stabilize estimates from sparse data, and the posterior carries uncertainty through to forecasts and decisions. In this example, the chosen priors matter most with ten trials. At 1,000 trials the likelihood carries more weight and the posterior means cluster near 80%.</p></article>
      <article><h3>What can change the conclusion</h3><p>An overly concentrated or outdated prior can pull estimates away from the current evidence, and a hypothesis assigned zero prior mass keeps zero posterior mass. The likelihood matters too. Batches with different pass rates or correlated trials violate the common-rate binomial model and can make its posterior misleadingly precise. Prior sensitivity checks and a sampling model that reflects the data-generating process address different sources of error.</p></article>
    </div>
    <p class="hw8-sources">References. <a href="https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/resources/mit18_05_s22_class11-prep_pdf/">MIT, Bayesian Updating with Discrete Priors</a> · <a href="https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/resources/mit18_05_s22_class15-prep_pdf/">MIT, Beta and Normal Conjugate Priors</a>.</p>
  </section>
  </main>`;
}

export function bindHomework8() {
  const examples = [
    ["hw8-size", "hw8-precision-output", precisionResults],
    ["hw8-base-rate", "hw8-inspection-output", inspectionResults],
    ["hw8-trials", "hw8-posterior-rows", posteriorRows],
  ];
  for (const [controlId, outputId, render] of examples) {
    const control = document.getElementById(controlId);
    const output = document.getElementById(outputId);
    const update = () => { output.innerHTML = render(Number(control.value)); };
    control.addEventListener("change", update);
    update();
  }
}
