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

function inspectionResults(priorPercent, falsePositivePercent) {
  const prior = priorPercent / 100;
  const trueFlags = prior * 0.90;
  const falseFlags = (1 - prior) * falsePositivePercent / 100;
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
    <div class="hw8-modes">
      <article class="panel prose">
        <h3>In probability</h3>
        <math display="block">
          <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mo stretchy="false">|</mo><msub><mi>X</mi><mi>n</mi></msub><mo>−</mo><mi>X</mi><mo stretchy="false">|</mo>
          <mo>&gt;</mo><mi>ε</mi><mo stretchy="false">)</mo><mo>→</mo><mn>0</mn>
        </math>
        <p>For every fixed tolerance ε &gt; 0, the chance of a larger error vanishes. This is the weak law’s conclusion and a standard definition of estimator consistency.</p>
      </article>
      <article class="panel prose">
        <h3>Almost surely (a.s.)</h3>
        <math display="block">
          <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><munder><mo>lim</mo><mrow><mi>n</mi><mo>→</mo><mi>∞</mi></mrow></munder>
          <msub><mi>X</mi><mi>n</mi></msub><mo>=</mo><mi>X</mi><mo stretchy="false">)</mo><mo>=</mo><mn>1</mn>
        </math>
        <p>On almost every infinite sample path, the sequence eventually stays within any fixed tolerance of its limit. This is the strong law’s conclusion.</p>
      </article>
      <article class="panel prose">
        <h3>In mean square (L²)</h3>
        <math display="block">
          <mi mathvariant="normal">E</mi><mo stretchy="false">[</mo>
          <msup><mrow><mo stretchy="false">(</mo><msub><mi>X</mi><mi>n</mi></msub><mo>−</mo><mi>X</mi><mo stretchy="false">)</mo></mrow><mn>2</mn></msup>
          <mo stretchy="false">]</mo><mo>→</mo><mn>0</mn>
        </math>
        <p>For square-integrable variables, mean squared error vanishes. Squaring gives large errors extra weight. The sample mean has this property in the finite-variance i.i.d. case.</p>
      </article>
      <article class="panel prose">
        <h3>In distribution</h3>
        <math display="block">
          <msub><mi>F</mi><msub><mi>X</mi><mi>n</mi></msub></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo>
          <mo>→</mo><msub><mi>F</mi><mi>X</mi></msub><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo>
        </math>
        <p>The cumulative distribution functions converge at each continuity point of the limit’s CDF. This is how the CLT gives a limiting law for a standardized statistic.</p>
      </article>
    </div>
    <div class="prose hw8-flow">
      <p>The first three definitions compare random variables on a common probability space. Convergence in distribution compares only their laws, so the variables can be defined on different probability spaces.</p>
      <p>Almost sure convergence and L² convergence each imply convergence in probability, which implies convergence in distribution. Applying Markov’s inequality to the squared error gives the L² implication.</p>
      <math display="block">
        <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mo stretchy="false">|</mo><msub><mi>X</mi><mi>n</mi></msub><mo>−</mo><mi>X</mi><mo stretchy="false">|</mo><mo>&gt;</mo><mi>ε</mi><mo stretchy="false">)</mo><mo>≤</mo>
        <mfrac>
          <mrow><mi mathvariant="normal">E</mi><mo stretchy="false">[</mo><msup><mrow><mo stretchy="false">(</mo><msub><mi>X</mi><mi>n</mi></msub><mo>−</mo><mi>X</mi><mo stretchy="false">)</mo></mrow><mn>2</mn></msup><mo stretchy="false">]</mo></mrow>
          <msup><mi>ε</mi><mn>2</mn></msup>
        </mfrac>
      </math>
      <p>For the almost sure implication, the indicators of errors above ε converge to zero almost surely, so their expectations tend to zero by bounded convergence. Convergence in distribution to a constant also implies convergence in probability to that constant.</p>
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
        <p>Let X₁, X₂, … be independent and identically distributed (i.i.d.) with E|X₁| &lt; ∞ and mean μ. Write the sum and sample mean as</p>
        <math display="block">
          <msub><mi>S</mi><mi>n</mi></msub><mo>=</mo>
          <munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover>
          <msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><mspace width="1em"/>
          <msub><mover accent="true"><mi>X</mi><mo>¯</mo></mover><mi>n</mi></msub><mo>=</mo>
          <mfrac><msub><mi>S</mi><mi>n</mi></msub><mi>n</mi></mfrac>
        </math>
        <p>Under these assumptions the <strong>weak Law of Large Numbers (LLN)</strong> gives convergence of the sample mean to μ in probability, and the <strong>strong LLN</strong> gives almost sure convergence to μ. With finite variance σ², the mean is unbiased and its mean squared error is σ²/n, so it also converges in L². Chebyshev’s inequality then gives a direct finite-variance proof of the weak law.</p>
      </article>
      <article>
        <h3>How the sample mean fluctuates</h3>
        <p>For i.i.d. observations with 0 &lt; σ² &lt; ∞, the <strong>classical Central Limit Theorem (CLT)</strong> gives</p>
        <math display="block">
          <msub><mi>Z</mi><mi>n</mi></msub><mo>=</mo>
          <mfrac>
            <mrow><msub><mi>S</mi><mi>n</mi></msub><mo>−</mo><mi>n</mi><mi>μ</mi></mrow>
            <mrow><mi>σ</mi><msqrt><mi>n</mi></msqrt></mrow>
          </mfrac>
          <mo>=</mo>
          <mfrac>
            <mrow><msqrt><mi>n</mi></msqrt><mo stretchy="false">(</mo><msub><mover accent="true"><mi>X</mi><mo>¯</mo></mover><mi>n</mi></msub><mo>−</mo><mi>μ</mi><mo stretchy="false">)</mo></mrow>
            <mi>σ</mi>
          </mfrac>
        </math>
        <math display="block">
          <msub><mi>Z</mi><mi>n</mi></msub><mover><mo>→</mo><mi>d</mi></mover>
          <mi>𝒩</mi><mo stretchy="false">(</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo stretchy="false">)</mo>
        </math>
        <p>The arrow marked <em>d</em> denotes convergence in distribution. The unscaled mean concentrates at μ. After centering and rescaling, its spread stays visible and its distribution approaches a Gaussian. This yields approximate confidence intervals and tests.</p>
      </article>
    </div>
    <div class="formula-box hw8-flow">
      <h3>Why √n appears</h3>
      <math display="block">
        <mtable displaystyle="true" class="hw8-variance">
          <mtr>
            <mtd><mi>Var</mi><mo stretchy="false">(</mo><msub><mi>S</mi><mi>n</mi></msub><mo stretchy="false">)</mo><mo>=</mo></mtd>
            <mtd><munder><mo>∑</mo><mi>i</mi></munder><mi>Var</mi><mo stretchy="false">(</mo><msub><mi>X</mi><mi>i</mi></msub><mo stretchy="false">)</mo></mtd>
          </mtr>
          <mtr>
            <mtd></mtd>
            <mtd><mo>+</mo><mn>2</mn><munder><mo>∑</mo><mrow><mi>i</mi><mo>&lt;</mo><mi>j</mi></mrow></munder>
            <mi>Cov</mi><mo stretchy="false">(</mo><msub><mi>X</mi><mi>i</mi></msub><mo>,</mo><msub><mi>X</mi><mi>j</mi></msub><mo stretchy="false">)</mo></mtd>
          </mtr>
        </mtable>
      </math>
      <p>Independence makes all cross-covariances zero. With common variance σ², the sum has variance nσ² and standard deviation σ√n. Scaling the sum by 1/n scales its variance by 1/n².</p>
      <math display="block">
        <mi>Var</mi><mo stretchy="false">(</mo><msub><mover accent="true"><mi>X</mi><mo>¯</mo></mover><mi>n</mi></msub><mo stretchy="false">)</mo><mo>=</mo>
        <mfrac>
          <mrow><mi>Var</mi><mo stretchy="false">(</mo><msub><mi>S</mi><mi>n</mi></msub><mo stretchy="false">)</mo></mrow>
          <msup><mi>n</mi><mn>2</mn></msup>
        </mfrac>
        <mo>=</mo><mfrac><msup><mi>σ</mi><mn>2</mn></msup><mi>n</mi></mfrac>
      </math>
      <math display="block">
        <mi>SE</mi><mo stretchy="false">(</mo><msub><mover accent="true"><mi>X</mi><mo>¯</mo></mover><mi>n</mi></msub><mo stretchy="false">)</mo>
        <mo>=</mo><msqrt><mfrac><msup><mi>σ</mi><mn>2</mn></msup><mi>n</mi></mfrac></msqrt>
        <mo>=</mo><mfrac><mi>σ</mi><msqrt><mi>n</mi></msqrt></mfrac>
      </math>
      <p>Four times as many independent observations halve the standard error.</p>
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
    <div class="prose hw8-flow">
      <p>Using the standard normal 97.5th percentile, rounded to 1.96, yields the interval in the example. Under repeated independent sampling, its coverage approaches 95%. If σ is unknown, Slutsky’s theorem justifies using the consistent sample standard deviation in its place for the large-sample interval.</p>
      <math display="block">
        <msub><mover accent="true"><mi>X</mi><mo>¯</mo></mover><mi>n</mi></msub>
        <mo>±</mo><mn>1.96</mn><mfrac><mi>σ</mi><msqrt><mi>n</mi></msqrt></mfrac>
      </math>
    </div>
    <p class="hw8-sources">References. <a href="https://ocw.mit.edu/courses/18-175-theory-of-probability-spring-2014/4e8a2305c745bd5a82a5f15cf8bcb8bb_MIT18_175S14_Lecture9.pdf">MIT, Strong Law of Large Numbers</a> · <a href="https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/resources/mit18_05_s22_class06-prep-b_pdf/">MIT, Central Limit Theorem and Law of Large Numbers</a>.</p>
  </section>

  <section id="hw8-bayes" class="content-section">
    ${sectionHead("EXERCISE 2", "Conditional probability and Bayesian inference")}
    <div class="two-col prose">
      <article>
        <h3>Conditioning on information</h3>
        <p>Conditioning restricts attention to outcomes in B and rescales their probability to one. For events A and B with P(B) &gt; 0,</p>
        <math display="block">
          <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>A</mi><mo stretchy="false">∣</mo><mi>B</mi><mo stretchy="false">)</mo><mo>=</mo>
          <mfrac>
            <mrow><mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>A</mi><mo>∩</mo><mi>B</mi><mo stretchy="false">)</mo></mrow>
            <mrow><mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>B</mi><mo stretchy="false">)</mo></mrow>
          </mfrac>
        </math>
        <p>In a contingency table, the corresponding estimate is the number in both groups divided by the number in B. In a sampling model, conditioning describes the distribution of the observations given a parameter or hypothesis.</p>
        <p>The multiplication rule gives P(A ∩ B) = P(B | A)P(A) = P(A | B)P(B) when both conditionals exist. Equating the two expressions and dividing by P(B) gives Bayes’ theorem.</p>
      </article>
      <article>
        <h3>Prior, likelihood, and posterior</h3>
        <dl class="hw8-terms">
          <dt>Prior π(θ)</dt><dd>Represents uncertainty about θ before incorporating the current data. It can encode historical evidence or plausible parameter values.</dd>
          <dt>Likelihood p(d | θ)</dt><dd>Holds the observed data d fixed and compares how well different θ values explain them. It is a probability mass or density for the data given θ. As a function of θ it need not sum or integrate to one.</dd>
          <dt>Posterior π(θ | d)</dt><dd>Represents uncertainty about θ after incorporating d under the prior and the sampling model. It is proportional to the prior times the likelihood.</dd>
        </dl>
      </article>
    </div>
    <div class="two-col hw8-flow">
      <article class="formula-box">
        <h3>Discrete hypotheses</h3>
        <math display="block">
          <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><msub><mi>H</mi><mi>j</mi></msub><mo stretchy="false">∣</mo><mi>D</mi><mo stretchy="false">)</mo><mo>=</mo>
          <mfrac>
            <mrow><mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>D</mi><mo stretchy="false">∣</mo><msub><mi>H</mi><mi>j</mi></msub><mo stretchy="false">)</mo>
            <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><msub><mi>H</mi><mi>j</mi></msub><mo stretchy="false">)</mo></mrow>
            <mrow><munder><mo>∑</mo><mi>i</mi></munder><mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>D</mi><mo stretchy="false">∣</mo><msub><mi>H</mi><mi>i</mi></msub><mo stretchy="false">)</mo>
            <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><msub><mi>H</mi><mi>i</mi></msub><mo stretchy="false">)</mo></mrow>
          </mfrac>
        </math>
        <p>Sum over a partition of hypotheses. By the law of total probability the denominator equals P(D), which must be positive. It makes the posterior probabilities sum to one.</p>
      </article>
      <article class="formula-box">
        <h3>Continuous parameter</h3>
        <math display="block">
          <mi>π</mi><mo stretchy="false">(</mo><mi>θ</mi><mo stretchy="false">∣</mo><mi>d</mi><mo stretchy="false">)</mo><mo>=</mo>
          <mfrac>
            <mrow><mi>p</mi><mo stretchy="false">(</mo><mi>d</mi><mo stretchy="false">∣</mo><mi>θ</mi><mo stretchy="false">)</mo><mi>π</mi><mo stretchy="false">(</mo><mi>θ</mi><mo stretchy="false">)</mo></mrow>
            <mrow><mo>∫</mo><mi>p</mi><mo stretchy="false">(</mo><mi>d</mi><mo stretchy="false">∣</mo><mi>t</mi><mo stretchy="false">)</mo><mi>π</mi><mo stretchy="false">(</mo><mi>t</mi><mo stretchy="false">)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>t</mi></mrow>
          </mfrac>
        </math>
        <p>Integrate over the parameter space. The denominator is the marginal likelihood of d. When it is positive and finite it makes the posterior density integrate to one.</p>
      </article>
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
      <math display="block">
        <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>H</mi><mo stretchy="false">∣</mo><mi>D</mi><mo stretchy="false">)</mo><mo>=</mo>
        <mfrac>
          <mrow><mn>0.90</mn><mo>×</mo><mn>0.01</mn></mrow>
          <mrow><mn>0.90</mn><mo>×</mo><mn>0.01</mn><mo>+</mo><mn>0.05</mn><mo>×</mo><mn>0.99</mn></mrow>
        </mfrac>
      </math>
      <math display="block">
        <mi mathvariant="normal">P</mi><mo stretchy="false">(</mo><mi>H</mi><mo stretchy="false">∣</mo><mi>D</mi><mo stretchy="false">)</mo><mo>=</mo>
        <mfrac><mn>90</mn><mrow><mn>90</mn><mo>+</mo><mn>495</mn></mrow></mfrac><mo>≈</mo><mn>15.38</mn><mo>%</mo>
      </math>
      <p>Among 10,000 items, the model expects 90 true flags and 495 false flags. The high proportion of sound items explains why most flags are false at this base rate. Increasing the prior defect rate to 10% while holding inspection performance fixed raises the posterior to 66.67%. Holding the prior at 1% and lowering the false-positive rate to 1% raises it to 47.62%. The calculation helps prioritize manual follow-up when historical rates and measured inspection performance apply to the current production line.</p>
    </div>
    <div class="panel hw8-demo">
      <div class="controls">
        <label for="hw8-base-rate">Prior defect rate</label>
        <select id="hw8-base-rate"><option value="0.1">0.1%</option><option value="1" selected>1%</option><option value="5">5%</option><option value="10">10%</option></select>
        <label for="hw8-false-positive">False-positive rate</label>
        <select id="hw8-false-positive"><option value="1">1%</option><option value="5" selected>5%</option><option value="10">10%</option></select>
        <p>The true-positive rate stays at 90%.</p>
      </div>
      <div id="hw8-inspection-output" aria-live="polite">${inspectionResults(1, 5)}</div>
    </div>
    <div class="prose hw8-flow">
      <h3>Estimating an unknown pass rate</h3>
      <p>A new process passes 8 of 10 trials. Assume trials are independent given a common pass probability θ. For an observed count k in n trials, the binomial likelihood is</p>
      <math display="block">
        <mi>L</mi><mo stretchy="false">(</mo><mi>θ</mi><mo stretchy="false">)</mo><mo>=</mo>
        <mrow><mo>(</mo><mfrac linethickness="0"><mi>n</mi><mi>k</mi></mfrac><mo>)</mo></mrow>
        <msup><mi>θ</mi><mi>k</mi></msup>
        <msup><mrow><mo stretchy="false">(</mo><mn>1</mn><mo>−</mo><mi>θ</mi><mo stretchy="false">)</mo></mrow><mrow><mi>n</mi><mo>−</mo><mi>k</mi></mrow></msup>
      </math>
      <p>A Beta(a, b) prior with a, b &gt; 0 has density proportional to θ<sup>a−1</sup>(1 − θ)<sup>b−1</sup> on 0 &lt; θ &lt; 1. Multiplying by the likelihood adds k to the first exponent and n − k to the second. This gives a conjugate update because the posterior is also a Beta distribution.</p>
      <math display="block">
        <mi>θ</mi><mo stretchy="false">∣</mo><mi>k</mi><mo>,</mo><mi>n</mi><mo>∼</mo><mi>Beta</mi>
        <mo stretchy="false">(</mo><mi>a</mi><mo>+</mo><mi>k</mi><mo>,</mo><mi>b</mi><mo>+</mo><mi>n</mi><mo>−</mo><mi>k</mi><mo stretchy="false">)</mo>
      </math>
      <math display="block">
        <mi mathvariant="normal">E</mi><mo stretchy="false">[</mo><mi>θ</mi><mo stretchy="false">∣</mo><mi>k</mi><mo>,</mo><mi>n</mi><mo stretchy="false">]</mo><mo>=</mo>
        <mfrac><mrow><mi>a</mi><mo>+</mo><mi>k</mi></mrow><mrow><mi>a</mi><mo>+</mo><mi>b</mi><mo>+</mo><mi>n</mi></mrow></mfrac>
      </math>
      <p>The posterior mean combines the prior mean and the observed pass fraction with weights proportional to a + b and n. It also gives the predictive probability that the next trial passes under the same model. With 8 passes, the uniform prior yields 75%, while the prior centered at 20% yields 50%. The table keeps the observed pass fraction at 80% and varies sample size.</p>
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
    [["hw8-size"], "hw8-precision-output", precisionResults],
    [["hw8-base-rate", "hw8-false-positive"], "hw8-inspection-output", inspectionResults],
    [["hw8-trials"], "hw8-posterior-rows", posteriorRows],
  ];
  for (const [controlIds, outputId, render] of examples) {
    const controls = controlIds.map((id) => document.getElementById(id));
    const output = document.getElementById(outputId);
    const update = () => {
      output.innerHTML = render(...controls.map((control) => Number(control.value)));
    };
    for (const control of controls) control.addEventListener("change", update);
    update();
  }
}
