# Statistics Homeworks — Luca Gugliotta

**Author:** Luca Gugliotta · **Student ID:** 2149056

**Programme:** Sapienza · Cybersecurity

**Course:** Statistics (10628637 · STAT-01/A · ENG)

**Instructor:** Tommaso Gastaldi

**Homework 1 & Homework 2 date:** October 15, 2026 (homework date; not labelled as a deadline).

Un unico sito didattico per gli Homework 1 e 2 di Statistica. Testi dell'applicazione in inglese; istruzioni di utilizzo in italiano. Implementazione originale in HTML, CSS e JavaScript, senza backend.

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

| File            | Responsabilità                                                                           |
| --------------- | ---------------------------------------------------------------------------------------- |
| `src/math.js`   | Campo finito, punti, identità `null`, due algoritmi, ordine, dataset statistico          |
| `src/crypto.js` | Pipeline con ethers, Keccak, confronto SHA3, protocollo sperimentale, validazione EIP-55 |
| `src/main.js`   | Navigazione, testi, SVG, controlli, tabelle, esportazioni                                |
| `src/style.css` | Stile responsivo, focus tastiera, reduced motion, font locali                            |
| `tests/`        | Test di algebra, statistica e vettori crittografici                                      |
| `public/fonts/` | Font DM Sans e Libre Caslon Display con licenze SIL OFL                                  |

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
