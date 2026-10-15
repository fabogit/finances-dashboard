---
description: Procedura standard per la gestione delle migrazioni Prisma, il reset del database e il seeding in ambiente locale con Docker.
---

# Database Migration & Development Workflow

Questa guida definisce la procedura standard per gestire le modifiche allo schema di Prisma, l'applicazione delle migrazioni, e il ripopolamento del database (seeding) in locale.

---

## 📋 Prerequisiti

- Container Docker con Postgres (`fn-postgres`) **online e in salute**
- File `.env.local` configurato in `backend-core/` con `DATABASE_URL` corretto

> [!IMPORTANT]
> Tutte le operazioni di migrazione e seeding richiedono che il container Docker con Postgres (`fn-postgres`) sia online e in salute.

> [!NOTE]
> Tutti i comandi si eseguono dalla directory `backend-core/`. L'agente deve specificare `Cwd: backend-core/` nel parametro del tool `run_command`.

Per verificare lo stato dei container:
```fish
docker ps
```
Se il container `fn-postgres` non è in esecuzione, avvia l'ambiente:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run docker:up
```

---

## 🛠️ Skill da Consultare

* [prisma-cli](../skills/prisma-cli/SKILL.md) — Comandi CLI Prisma (migrate, generate, db push, seed)
* [prisma-client-api](../skills/prisma-client-api/SKILL.md) — Modifiche al modello e impatto sulle query
* [backend-core-ops](../skills/backend-core-ops/SKILL.md) — Gestione container Docker e script di progetto

---

## 📦 Procedura

### 1. Modifica del file schema.prisma

Apporta le modifiche necessarie al file [schema.prisma](../../backend-core/prisma/schema.prisma) (es. aggiunta di campi, tabelle o indici).

### 2. Generazione e Applicazione della Migrazione

Per creare una nuova migrazione SQL e applicarla al database locale di sviluppo:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run prisma:migrate
```
*Ti verrà richiesto di inserire un nome per la migrazione.* Questo comando creerà la cartella SQL in `prisma/migrations/` e aggiornerà il database locale.

> [!TIP]
> Per creare la migrazione senza applicarla immediatamente (ad esempio, se vuoi ispezionare il codice SQL generato prima di eseguirlo):
> ```fish
> pnpm prisma migrate dev --create-only
> ```

### 3. Push rapido (Prototipazione)

Per spingere le modifiche allo schema senza creare una migrazione (utile per prototipazione rapida):
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run prisma:push
```

### 4. Ripopolamento del Database (Seeding)

All'avvio del container Docker il seed viene eseguito in automatico. Se hai bisogno di ri-eseguire il seed manualmente in locale per aggiornare i dati di sviluppo:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run prisma:seed
```

---

## 🔄 Prototipazione Rapida e Hard Reset (Database Wiping)

Dato che siamo in fase di sviluppo locale e prototipazione, è possibile distruggere completamente il database e ricrearlo da zero con tutte le migrazioni e i dati di seed applicati:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run prisma:reset
```
*Questo comando eliminerà tutti i dati presenti nel database locale, riapplicherà tutte le migrazioni in ordine cronologico ed eseguirà il seed finale.*

---

## 🧪 Validazione

Dopo aver applicato una migrazione, è fondamentale assicurarsi che venga eseguita correttamente anche nell'ambiente di test temporaneo. Esegui i test end-to-end (che creano un container PostgreSQL pulito su una porta dedicata, applicano le migrazioni da zero e verificano le API):
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:e2e:docker
```
Se tutti i test passano, la migrazione è considerata valida e pronta per essere committata nel controllo versione.

---

## ❓ Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `P3009` - migrate found failed migrations | Una migrazione precedente è fallita e ha lasciato stato sporco | `pnpm run prisma:reset` per ripartire da zero (ambiente locale) |
| `P3006` - migration applied to shadow database failed | SQL invalido nella migrazione generata | Ispezionare il file `.sql` in `prisma/migrations/`, correggere e ri-eseguire |
| `P3014` - could not create shadow database | Permessi insufficienti sul DB o porta non raggiungibile | Verificare che `fn-postgres` sia running e che `DATABASE_URL` sia corretto |
| Porta 5432 già occupata | Un altro processo Postgres è in esecuzione | `docker ps` per trovare il container in conflitto, `docker stop <id>` |
| Seed fallito con errore di FK | Ordine di inserimento errato | Verificare che `prisma/seed.ts` inserisca le entità padre prima delle figlie |
| `prisma generate` non trova il schema | Cwd errato | Assicurarsi di essere in `backend-core/` dove risiede `prisma/schema.prisma` |
