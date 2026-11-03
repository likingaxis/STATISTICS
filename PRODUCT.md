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

User-confirmed title: Statistics Homeworks. The user explicitly requests uniformity with the two existing homework chapters. Preserve their visual system and the concept → experiment → measurement → interpretation reading sequence. Text in the site is English.

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
