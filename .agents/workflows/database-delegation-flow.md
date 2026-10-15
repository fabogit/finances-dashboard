---
description: Guida e procedura standard per identificare e migrare logiche di elaborazione dati in-memory dei servizi NestJS a livello di database (PostgreSQL/Prisma).
---

# Database Delegation & Optimization Workflow

Questo workflow definisce la procedura standard per ottimizzare le performance del backend migrando logiche di calcolo, aggregazione, raggruppamento e filtraggio in-memory dai servizi NestJS direttamente al database PostgreSQL tramite query ottimizzate o Prisma Client.

---

## 📋 Prerequisiti

- Container Docker avviati e in salute, con `fn-postgres` raggiungibile
- Migrazioni Prisma applicate (vedi [database-migration-flow.md](database-migration-flow.md))
- Familiarità con l'architettura Repository Pattern del progetto

> [!NOTE]
> Tutti i comandi si eseguono dalla directory `backend-core/`. L'agente deve specificare `Cwd: backend-core/` nel parametro del tool `run_command`.

---

## 🛠️ Skill da Consultare

* [prisma-client-api](../skills/prisma-client-api/SKILL.md) — Query complesse, filtri, `groupBy`, transazioni `$transaction`
* [postgresql-optimization](../skills/postgresql-optimization/SKILL.md) — Ottimizzazione query SQL, indici, CTE, `JSONB`, funzioni window
* [typescript-magician](../skills/typescript-magician/SKILL.md) — Tipizzazione corretta dei risultati raw SQL e `Prisma.Decimal`
* [backend-core-dev](../skills/backend-core-dev/SKILL.md) — Pattern Repository, DTO, Swagger decorators

---

## 📦 Procedura

### Fase 1: Identificazione (Audit del Codice)

Analizza i servizi ed i repository della codebase per individuare "code smell" di elaborazione dati inefficiente in-memory.

#### Indicatori di logica delegabile al database:
1. **Cicli di Raggruppamento/Aggregazione**: Uso di `Map`, `forEach`, `reduce`, o cicli `for...of` per calcolare somme, conteggi o medie basate su date o altri attributi (es. raggruppamento mensile).
2. **Filtraggio post-query**: Array restituiti da query DB filtrati in NestJS usando `.filter()` (es. controlli di valore, controllo su relazioni).
3. **Ordinamento post-query**: Array ordinati in memoria con `.sort()` invece di sfruttare l'indice del database.
4. **Manipolazione delle Date per Raggruppamento**: Utilizzo di metodi come `date.toISOString().slice(0, 7)` o `date.getFullYear()` per creare chiavi di raggruppamento temporali.

---

### Fase 2: Valutazione della Soluzione (Prisma vs Raw SQL)

Valuta quale sia lo strumento migliore per la delega in base alla complessità:

| Scenario | Strumento Consigliato | Rationale |
| :--- | :--- | :--- |
| Aggregazioni semplici su campi fissi (`sum`, `avg`, `count`, `groupBy`) | **Prisma standard API** | Sfrutta la type-safety nativa senza scrivere SQL manuale. |
| Aggregazioni basate su componenti di date (es. per mese/anno) o funzioni DB | **`Prisma.$queryRaw` con `TO_CHAR` o `DATE_TRUNC`** | Prisma non supporta nativamente il raggruppamento su funzioni di espressione o parti di date. |
| Query con filtri di ricerca dinamici e join complesse | **`Prisma.$queryRaw` + `Prisma.sql` / `Prisma.join`** | Permette di comporre la query WHERE in modo flessibile mantenendo la sicurezza delle query parametrizzate. |
| Calcoli ricorsivi o gerarchie complesse a più livelli | **PostgreSQL Common Table Expressions (CTE)** | Ottimizza le performance su alberi (es. categorie padri/figli) evitando query N+1. |

---

### Fase 3: Progettazione e Sicurezza SQL

Quando si implementa una query raw SQL (`$queryRaw`), attenersi alle seguenti regole di sicurezza e stabilità:

> [!CAUTION]
> **Prevenzione SQL Injection**: Non concatenare mai stringhe o usare stringhe template standard Javascript/Typescript per comporre query. Usa sempre il tag `Prisma.sql` per parametrizzare i valori di input.
>
> *   **Corretto**: `` prisma.$queryRaw`SELECT * FROM "User" WHERE id = ${id}` ``
> *   **Errato**: `prisma.$queryRawUnsafe("SELECT * FROM \"User\" WHERE id = " + id)`

#### Gestione dei Valori Nulli e Precisione
- Usa **`COALESCE`** per assicurarti che funzioni di aggregazione come `SUM` o `AVG` restituiscano `0` (o un valore di default coerente) anziché `null` quando non ci sono corrispondenze:
  ```sql
  COALESCE(SUM(t."amount"), 0) AS "total"
  ```
- Per i campi monetari (`Decimal` in Prisma/PostgreSQL), tieni presente che `$queryRaw` restituirà istanze di `Prisma.Decimal`. Nel servizio, convertile in `number` usando `.toNumber()` o `parseFloat(val.toFixed(2))`.

---

### Fase 4: Implementazione

Segui la separazione delle responsabilità (Separation of Concerns):

1. **Repository (Data Access)**:
   - Definisce il metodo per eseguire l'aggregazione o il filtraggio (es. `getMonthlyTrendsAggregated(filters)`).
   - Costruisce la query SQL dinamica tramite `Prisma.sql` e `Prisma.join` per i filtri opzionali.
   - Esegue la query tramite `this.prisma.$queryRaw`.
2. **Service (Business Logic)**:
   - Chiama il metodo del repository passando i filtri validati.
   - Converte i dati grezzi restituiti dal database nel DTO di risposta richiesto (es. formattazione decimali, arrotondamenti).
   - Gestisce la logica di business di alto livello.

---

## 🧪 Validazione

Ogni migrazione di logica verso il database richiede l'adeguamento dei test.

### 1. Unit Test del Servizio
Aggiorna gli unit test in `*.service.spec.ts`:
- Sostituisci il mock del vecchio metodo di fetch dettagliato con il mock del nuovo metodo aggregato del repository.
- Verifica che il servizio mappi correttamente i risultati aggregati restituiti dal mock (comprese le istanze `Prisma.Decimal`).

### 2. Unit Test del Repository
Crea o aggiorna i test in `*.repository.spec.ts` per testare la corretta costruzione della query SQL dinamica:
- Mocka `$queryRaw` di Prisma per intercettare la chiamata.
- Verifica che la chiamata avvenga con i parametri corretti in base ai filtri passati.

### 3. Test E2E / Integrazione
Esegui la suite di test E2E per garantire che il comportamento delle API rimanga inalterato (nessuna regressione):
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:e2e:docker
```

---

## ❓ Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `$queryRaw` restituisce `BigInt` invece di `number` | PostgreSQL `COUNT(*)` restituisce `bigint` | Usare `COUNT(*)::int` nel SQL oppure convertire con `Number()` nel servizio |
| Nomi tabella non trovati | Nomi non quotati nel SQL raw | Usare sempre doppi apici: `"EnrichedTransaction"` (case-sensitive in PG) |
| `Prisma.Decimal` non serializzabile | JSON.stringify non supporta Decimal nativamente | Usare `.toNumber()` nel mapping del servizio prima di restituire il DTO |
| Risultato `null` su aggregazione senza righe | `SUM` su set vuoto restituisce `null` | Wrappare con `COALESCE(SUM(...), 0)` |
| Errore `Prisma.join` su array vuoto | `IN ()` è SQL invalido | Gestire il caso `filters.length === 0` prima di costruire la query |
