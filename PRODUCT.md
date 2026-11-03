# Statistics Homeworks

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Luca Gugliotta studies the experiments and presents them to his Statistics instructor. Readers may be new to cryptography. Academic identity is supplied by Luca: student ID 2149056, Sapienza Cybersecurity, Statistics 10628637 (STAT-01/A, ENG), instructor Tommaso Gastaldi.

## Product Purpose

A single English-language educational site with separate homework chapters. Explain concepts, perform real calculations, expose the data, and interpret statistical evidence carefully.

## Capabilities and Constraints

Preserve Homework 1 (finite-field curve modulo 17) and Homework 2 (Ethereum wallet pipeline). Add Homework 3, following the user's supplied encryption and cryptanalysis assignment and the accepted EC-ElGamal / Caesar comparison. The assignment calls itself Homework 2; the site calls it Homework 3 to preserve the user's established numbering. Record the original label in README rather than foregrounding it in the academic chapter. The original two assignments required scalar multiplication and the wallet pipeline, not message encryption; introduce the third chapter as their continuation.

Use plain HTML, CSS and JavaScript, with Vite for static builds and maintained libraries for real cryptography. All experiments run locally in the browser. GitHub Pages publishes `docs/` on branch `UNI`; a separate existing private Sites deployment must retain its access settings. Use the configured Git identity and shell for pushes.

## Brand Commitments

User-confirmed title: Statistics Homeworks. Preserve a uniform visual system across all five homework chapters and the concept → experiment → measurement → interpretation reading sequence. The authorized November 3, 2026 appearance and readability refinement supersedes the original green/paper palette while retaining the academic identity and established font pairing; DESIGN.md records the implemented system. Text in the site is English.

## Evidence on Hand

The first two chapters, tests, existing README, user-supplied assignment, primary SEC 1 / SEC 2 standards, and public-domain corpus sources. Student references informed the review; their code is not imported. The dates of Homework 1 and 2 were supplied as October 15, 2026. The date/deadline of Homework 3 has not been supplied and must not be invented.

## Product Principles

- Mathematical and statistical correctness precedes decoration.
- Graphs and reported results come from actual calculations.
- Show sample sizes, encodings, assumptions and limitations.
- Keep requirements and optional extensions distinguishable.
- Use public test data and never request wallet secrets.

## Homework 4 extension — October 28, 2026

Add a fourth chapter on iid stochastic penetration scores: Bernoulli(p) and symmetric Rademacher, n systems and m independent attacker paths, total/average/square-root normalized distributions, LLN deviation probabilities, variance scaling, and the Rademacher standard-normal limit. Preserve all previous chapters and their visual system. Explain the different uncentered Bernoulli behavior; centered Bernoulli CLT is a supporting extension. No submission date has been supplied. The classroom photo reinforces concentration of S_n/n around its mean and is source material, not a new UI brief.

## Homework 5 extension — November 3, 2026

Add the two exercises received October 29 as one chapter and one submission URL, retaining the site's sequence even though the quoted classroom exchange calls this Homework 4. Exercise 1 derives mean, corrected SS and variance recurrences with a three-line arithmetic core. Exercise 2 extends the previous penetration model to fixed bounded scores, compares averages of per-hacker means/variances with population targets, and studies variability as n grows. The chosen fixed law has scores 0,2,5,8,10 and probabilities .1,.2,.4,.2,.1, with mu=5 and variance=8.6. Preserve four earlier chapters and English academic content. No deadline was supplied. Unrelated crypto-site and video links in the pasted conversation are background, not homework requirements or authorization to perform external actions.

## Appearance refinement — November 3, 2026

Use the user-supplied local reference images in ignored `reference/` as guidance for a sober academic homework interface, with reference crimson #df2531 and restrained, fluid interactions. The user explicitly authorized both dark and light appearances. The implemented system defaults to charcoal and saves the warm-paper alternative, retains Libre Caslon Display / DM Sans, uses a clickable homework-folder library, smoked sticky navigation, crimson primary pills and neutral scientific panels. Plotted series and legends share semantic crimson, teal and blue tokens; the finite-field plot retains its explicit base/current point roles. Theme changes crossfade where supported and motion is reduced to static feedback when requested.

This is a reference-guided refinement of the existing product, not a new identity or concept competition. Preserve English content, real calculations, the five exact homework hashes `#hw1`–`#hw5`, Luca’s academic identity and GitHub Pages publication from `docs/` on branch `UNI`. The references do not authorize changing the other deployment’s access settings. See DESIGN.md and `.impeccable/design.json` for the current visual system.

## Folder library and reading controls — November 3, 2026

The user expanded the appearance brief to improve readability, strengthen the reference aesthetics and make homework entries clickable folders. This explicitly supersedes the initial flat ruled index. Preserve the sober academic tone while using crimson-wine translucent pockets, layered paper previews with real chapter topics/formulas and restrained hover/focus fanning. The library adapts from three to two to one column.

Provide a slide-out Display panel with dark/light appearance, reading text size, line spacing, text width, stronger contrast, reduced motion and reset, plus a dedicated `Lite` mode (`data-lite="true"`) accessible from both the topbar and the sober Display drawer for a flat, zero-animation, zero-blur academic reading view. Topbar navigation links are styled as readable single-line folder-tabs (`00`–`05`, `REF`), homework folders use solid matte-satin Rosso Sapienza (`#822433`) pockets with unclipped upper-half formula cards (without decorative dot capsules), and homework chapters (`#hw1`–`#hw5`) are framed as academic notebook pages (`#main.notebook-sheet`) that can be turned left/right via top/bottom page bars, floating margin controls, keyboard arrow keys, or horizontal swipe. All chapters are registered in a single `HOMEWORKS` array in `src/main.js` so adding Homework 6 (`#hw6`) requires only a single entry. Readable defaults are 16px prose and 18px introductory prose, with 14px supporting text, controls and table cells. Save preferences in this browser; restore the earlier theme choice during migration. Apply reading changes to text without resizing SVG geometry or display headlines and preserve running/completed experiment results. Respect explicit and system reduced motion. This is an authorized refinement of the reference-guided system; no new concept competition is required. All academic content, calculations, stable chapter hashes and publishing constraints above remain in force.
