# Statistics Homeworks — Luca Gugliotta

**Author:** Luca Gugliotta · **Student ID:** 2149056

**Programme:** Sapienza · Cybersecurity

**Course:** Statistics (10628637 · STAT-01/A · ENG)

**Instructor:** Tommaso Gastaldi

**Homework 1 & Homework 2 date:** October 15, 2026 (homework date; not labelled as a deadline).

Un unico sito didattico per gli Homework 1, 2 e 3 di Statistica. Testi dell'applicazione in inglese; istruzioni di utilizzo in italiano. Implementazione originale in HTML, CSS e JavaScript, senza backend.

## Avvio e verifica

Richiede Node.js 22.12+ (o 20.19+). Dalla cartella di questo README:

```sh
npm ci
npm run dev
```

Aprire l'URL locale mostrato da Vite. Per verificare e preparare la consegna:

```sh
npm test
npm run build
npm run preview
```

`dist/` è il sito statico pronto da ospitare. Non aprire `index.html` con doppio clic: i moduli JavaScript richiedono un server HTTP. La build usa percorsi relativi, adatti anche a un sottopercorso di hosting statico. Font e librerie sono locali: dopo l'installazione non servono CDN o servizi esterni per eseguire la build o gli esperimenti. L'apertura delle fonti esterne richiede Internet. Il sito non implementa una cache offline/service worker.

Se l'ambiente Windows ha uno shim npm configurato in modo errato, si può invocare la CLI ufficiale con `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"` al posto di `npm`.

## Percorso di presentazione al docente

1. **Overview**: spiegare il legame tra i due homework. Il primo rende visibile la legge di gruppo su una curva piccola; il secondo applica l'idea a una pipeline reale.
2. **Homework 1 / Understand**: definire chiave privata, punto pubblico e modulo. Verificare G = (1,5) nella curva y² = x³ + 7 mod 17.
3. **Curve laboratory**: partire da k = 6 e ottenere `TOY PUBLIC KEY = (5, 8)`. Usare Reset, Step e Play per illustrare inverso modulare e formule. Con k = 9 ottenere O; con k = 10 ritrovare G. Cambiare algoritmo e punto base per osservare ordini diversi.
4. **Statistical exploration**: selezionare il censimento completo. Con G = (1,5), gli otto punti affini non nulli producono x = 1,2,5,12,12,5,2,1. Quattro valori compaiono due volte, ma gli altri tredici non compaiono: non è uniformità su F₁₇. Confrontare con la modalità sequenza, che include ripetizioni e conta separatamente le identità.
5. Leggere distribuzioni, entropie marginali descrittive, bit e grafico input-output insieme a Pearson. Aprire i dati tabellari. I confronti a un bit formano un insieme separato di coppie valide del sottogruppo e dipendono da G. Con G di ordine 2 non esistono coppie valide: la media è dichiarata non definita.
6. **Interpretation**: distinguere ECDLP, struttura algebrica e proprietà delle hash. La curva giocattolo è invertibile con una ricerca esaustiva minuscola; nessun grafico ne dimostra la sicurezza.
7. **Homework 2 / Pipeline**: seguire l'esempio pubblico da entropia a parole, seed, chiave privata, chiave pubblica, digest e indirizzo EIP-55. Cambiare l'indice per ottenere altri figli dello stesso albero; scegliere la passphrase pubblica TREZOR per il vettore BIP-39.
8. **Standards**: presentare BIP-39, BIP-32, BIP-44, secp256k1, Keccak-256 ed EIP-55. La chiave pubblica non compressa ha 65 byte; l'hash usa i 64 byte X || Y, senza 0x04. L'indirizzo usa gli ultimi 20 byte del digest.
9. **Hash experiment**: ogni coppia cambia esattamente un bit in un messaggio da 32 byte. Mostrare numerosità, media, deviazione standard, bilanciamento dei bit, frequenze esadecimali e dati esportati. La media ideale è 128, la deviazione standard ideale è 8, sotto il modello Binomiale(256, 0.5); non sono requisiti per ogni singola prova.
10. Confrontare SHA-512, Keccak-256 e SHA3-256 sullo stesso testo. Provare il checksum EIP-55 alterando una lettera o un valore. Chiudere con cronologia e ruoli distinti: generazione, derivazione, crittografia a chiave pubblica, hashing, checksum ed encoding.

## Protocollo statistico e limiti

**Toy ECC.** Il dataset è una popolazione finita deterministica, non una simulazione di chiavi sicure. La modalità censimento considera k = 1…ord(G)−1. La modalità sequenza considera k = 1…k selezionato e include le ripetizioni. O non ha coordinate e viene escluso da statistiche marginali, bit e correlazioni; viene comunque contato e mostrato. Ogni coordinata usa 5 bit. Le coppie XOR sono uniche, non ordinate, con entrambe le chiavi in 1…ord(G)−1, e codificano i punti su 10 bit. Le entropie visualizzate descrivono le distribuzioni marginali osservate, non l'entropia dei segreti. Non si applicano p-value chi-square con celle attese minuscole.

**Keccak protocol v1.** Il trial j del batch b usa `Keccak256(UTF8("statistics-lab/v1/b/j"))` come messaggio binario di 32 byte. Si inverte il bit `j mod 256`: byte `floor(bit/8)`, maschera `1 << (bit mod 8)`. Si hashano entrambi i messaggi con Keccak-256 e si conta la distanza di Hamming tra i digest. Il batch iniziale è 1. Sample size: 64, 256 o 1024. Le frequenze usano un digest originale per trial, con denominatore 64n digit; il confronto troncato usa gli ultimi 40n digit degli stessi digest. Il bilanciamento dei bit usa 256n bit. Il CSV include protocollo, batch, trial, bit, entrambi gli input, entrambi i digest e distanza.

Gli input sono riproducibili e deterministici, non osservazioni indipendenti campionate casualmente. `s/√n` è un riferimento descrittivo sotto modello, non un intervallo di confidenza validato. I digest troncati non sono presentati come account Ethereum effettivamente derivati. Il loro insieme si sovrappone ai digest completi: i due istogrammi non sono campioni indipendenti. Nessuno di questi indicatori certifica casualità, pseudocasualità, resistenza alle collisioni o sicurezza crittografica.

**EIP-55.** Il validatore del laboratorio richiede la codifica esatta: alcune librerie accettano indirizzi tutti minuscoli come indirizzi senza checksum, ma ciò non prova un checksum corretto. Un errore può occasionalmente non essere rilevato. Il checksum non autentica il destinatario.

## Organizzazione del codice

| File                      | Responsabilità                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `src/math.js`             | Campo finito, punti, identità `null`, due algoritmi, ordine, dataset statistico            |
| `src/crypto.js`           | Pipeline con ethers, Keccak, confronto SHA3, protocollo sperimentale, validazione EIP-55   |
| `src/cryptanalysis.js`    | Cesare, modello linguistico dal corpus, ranking delle 26 chiavi, esperimento riproducibile |
| `src/toy-encryption.js`   | EC-ElGamal su secp256k1 con noble-curves, encoding dei byte, decifratura e attacchi        |
| `src/homework3.js`        | Terzo capitolo, grafici, messaggi di stato, controlli ed esportazioni                      |
| `src/homework3-worker.js` | Calcoli di cifratura, crittoanalisi e ricerca chiavi in background                         |
| `src/main.js`             | Navigazione, testi, SVG, controlli, tabelle, esportazioni                                  |
| `src/style.css`           | Stile responsivo, focus tastiera, reduced motion, font locali                              |
| `tests/`                  | Test di algebra, statistica e vettori crittografici                                        |
| `public/fonts/`           | Font DM Sans e Libre Caslon Display con licenze SIL OFL                                    |

Le chiavi reali sono gestite dalla libreria con rappresentazioni crittografiche appropriate; non vengono convertite in `Number` JavaScript. Il codice originale usa la piccola aritmetica Number soltanto sulla toy curve.

## Vettori e fonti

I test includono il vettore BIP-39 zero-entropy con passphrase TREZOR; il master e i figli `m/0'` e `m/0'/1` del test vector 1 BIP-32; indirizzi ufficiali EIP-55; digest noti di input vuoto per Keccak-256 e SHA3-256; serializzazione Ethereum e indirizzo per private scalar 1. L'algebra della toy curve è controllata esaustivamente per chiusura, commutatività e associatività su tutti i 18 elementi; i due algoritmi concordano per ogni punto e k = 0…100.

- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) e [vettori Trezor](https://github.com/trezor/python-mnemonic/blob/master/vectors.json)
- [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki), [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki), [SLIP-44](https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
- [Ethereum accounts](https://ethereum.org/en/developers/docs/accounts/) e [EIP-55](https://eips.ethereum.org/EIPS/eip-55)
- [Keccak](https://keccak.team/keccak_specs_summary.html), [FIPS 202](https://csrc.nist.gov/pubs/fips/202/final), [SEC 2](https://www.secg.org/sec2-v2.pdf)
- [ethers](https://docs.ethers.org/v6/) e [noble-hashes](https://github.com/paulmillr/noble-hashes)

I requisiti delle consegne sono coperti dai due capitoli; animazione, secondo algoritmo, demo HD e CSV sono aggiunte didattiche. Le date storiche sono approssimate secondo la consegna. Non è importato codice dai progetti degli altri studenti.

## Dati di prova

Tutti i segreti visualizzati sono pubblici. Non esistono campi per mnemonic o chiavi private reali, connessione wallet, backend o analytics. Non usare gli indirizzi del laboratorio per fondi reali. I dati dei form e degli esperimenti non vengono inviati a servizi esterni.

## GitHub Pages

The published static files are tracked in `docs/` on branch `UNI`. In the repository's **Settings → Pages**, keep **Deploy from a branch**, branch **UNI**, folder **/docs**.

To publish an update from the project directory:

```sh
npm run build:pages
git add docs
git commit -m "Update GitHub Pages site"
git push origin UNI
```

The `build:pages` command rebuilds `docs/` with relative asset URLs. The `.nojekyll` marker is copied from `public/` so GitHub serves the compiled HTML, CSS, JavaScript and local fonts directly. The `docs/` directory is generated output: edit the source in `src/`, then rebuild it.

Expected site URL: [Statistics Homeworks](https://likingaxis.github.io/STATISTICS/).

## Homework 3 — assignment coverage and reproduction

The supplied assignment is titled **Homework 2**. This site calls it **Homework 3** because it follows the two existing chapters. No submission date for the new chapter has been supplied. The original Homework 1 asks for private-to-public scalar multiplication on the modulo-17 toy curve; Homework 2 asks for the Ethereum wallet pipeline. Neither original task requires message encryption. Homework 3 builds on these foundations using **textbook EC-ElGamal on real secp256k1**, restricting only the recipient's private scalar to **1…4096**. This is the encryption construction chosen for this experiment; it is not presented as a previously implemented requirement.

| Assignment requirement                                            | Implementation                                                                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encrypt and decrypt a simple message using the toy ECC scheme     | Byte-wise EC-ElGamal; a public codebook maps byte b to (b+1)G; encryption sends (R,C)=(rG,M+rQ); decryption recovers M=C−dR                                      |
| Explain main steps and the keys                                   | Key-role table; actual first-byte values for M, r, R, C and both shared masks; all ciphertext pairs inspectable/exportable                                       |
| Caesar encryption and decryption of the same message              | Shared input, shifts 0…25, case and non-ASCII/non-letter preservation; exact round trip                                                                          |
| Compare procedures, key spaces and statistical properties         | Comparison table, letter distributions, invariant entropy/index of coincidence, coordinate-byte histogram with structural prefixes excluded                      |
| Build a corpus-based statistical key-recovery algorithm           | Measured training letter counts, smoothed probabilities, all 26 candidate decryptions ranked by a χ² distance score                                              |
| Test different ciphertext lengths and discuss limitations         | 5, 10, 20, 40, 80, 160, 320 and 640 letters; selectable 50/100/200/500 trials per length; success counts, rates, model-based Wilson intervals and true-key ranks |
| Attack the restricted ECC key space                               | Incremental exhaustive search using only Q and the known interval; exact verification dG=Q; decrypt the current packet with the recovered scalar                 |
| Explain differences between attacks and full-size ECC feasibility | Language redundancy versus enumerable keys; message-length dependence; full scalar space versus generic square-root attacks; distinct design weaknesses          |
| Optional alternatives                                             | Trigram scoring, most-frequent-letter baseline, baby-step giant-step, and an actual malleability demonstration                                                   |

### Encryption protocol: ec-elgamal-byte-v1

The implementation uses **noble-curves 1.9.7** for real secp256k1 arithmetic. It samples a fresh full-range ephemeral scalar from 1…n−1 for every byte by rejection-sampling 32 CSPRNG bytes. The reproducibility seed used for Caesar experiments is never used for ECC secrets. Up to 256 UTF-8 bytes are supported. All 256 possible byte values have distinct codebook points. Compressed SEC 1 points occupy 33 bytes; the exceptional identity C=O uses the explicit marker `00`, while identity Q/R inputs are rejected. The ciphertext histogram uses only the 32 x-coordinate bytes of each nonidentity point, in 16 high-nibble bins; compressed prefixes are excluded.

This unauthenticated construction is educational. A full-size recipient scalar would not fix its malleability, byte-wise expansion, unsafe randomness reuse or implementation limitations. The tampering example changes C to C+G, demonstrating an algebraic change that requires no knowledge of d. No production-security claim or IND-CCA claim is made.

### Language protocol: caesar-v1

The bundled excerpts come from the **NLTK Gutenberg distribution** of public-domain novels: the first 200,000 narrative characters of Jane Austen's _Emma_ for training (154,364 A–Z letters), and the first 100,000 narrative characters of Lewis Carroll's _Alice's Adventures in Wonderland_ for evaluation (74,681 A–Z letters). Exact extraction boundaries, source URLs, source-file hashes and distributed-file hashes are in `public/corpora/manifest.json`. Downloading from Project Gutenberg directly was unavailable in the build environment; the manifest records the actual NLTK distribution archive used. The browser fetches only these local static files.

ASCII letters are normalized to uppercase; punctuation, whitespace and non-ASCII letters are removed for statistical modelling. Word boundaries are joined for trigram counts. A custom training corpus must have at least 1,000 A–Z letters. The test file remains unchanged, but a user must avoid supplying evaluation passages as custom training data.

Letter probabilities use smoothing `(count + 0.5)/(T + 13)`. Trigrams use additive 0.1 smoothing over all 26³ possible triples. χ² is a ranking score, not a formal test with reported p-values. Negative trigram log probability is an overlapping-triple heuristic, not a calibrated probability of the entire text. The optional frequency baseline maps the first most-frequent ciphertext letter to E. All methods enumerate 26 shifts. Score ties choose the lowest shift and are reported; the true key's rank uses its mid-rank among ties.

Default sampling seed: **20261021**; default trials: **100 per length**. The source documents the Mulberry32 generator. Rejection sampling chooses uniform start positions, with replacement, in the normalized test file and independent shifts from 0…25. Each method sees the same sampled ciphertexts. The exported rows contain the protocol version, seed, hashes of the exact UTF-8 corpus inputs, length, trial, start offset, true shift, method, prediction, success, number of best ties and true-key mid-rank. Overlapping passages are allowed. Wilson 95% intervals describe variability under the fixed-corpus binomial resampling model; they are not universal guarantees about English or evidence of independent language letters.

### Verification

The test suite covers all 26 Caesar shifts, Unicode round trips, entropy/IC invariance, model smoothing, no-letter inputs, short-text ties, corpus hashes, repeatable paired sampling, all 256 ECC byte values, identity encoding, exact ciphertext scalar relations against ethers, full-range random ephemeral keys, both recovery algorithms at interval boundaries, outside-range failure, and malleability with a full-size recipient key. Browser checks exercise the worker-based pipeline, the two key attacks, changed seed/trial count, actual CSV download, input errors, navigation, and mobile layout alongside the two earlier chapters.

Primary algorithm references: [SEC 1](https://www.secg.org/sec1-v2.pdf), [SEC 2](https://www.secg.org/sec2-v2.pdf), [Handbook of Applied Cryptography chapter 3](https://cacr.uwaterloo.ca/hac/about/chap3.pdf), [chapter 8](https://cacr.uwaterloo.ca/hac/about/chap8.pdf), and [noble-curves](https://github.com/paulmillr/noble-curves/tree/1.9.7). The implementation and prose are original; no student reference code is imported.
