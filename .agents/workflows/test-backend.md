---
description: Run unit and E2E tests for the backend-core project.
---

# Test Backend Workflow

Procedura standard per l'esecuzione dei test unitari, di integrazione e di copertura per i moduli NestJS e Python del progetto.

---

## 📋 Prerequisiti

- Per i **test unitari**: nessun prerequisito infrastrutturale (i test usano mock).
- Per i **test E2E**: il container Docker di test PostgreSQL verrà avviato automaticamente dallo script sulla porta **5433**. Assicurarsi che nessun altro processo occupi quella porta.
- File `.env.test` configurato in `backend-core/` con le variabili per il database di test.
- Per i **test Python**: virtual environment attivo (tramite `direnv` in `backend-science/`).

> [!NOTE]
> Tutti i comandi per `backend-core` si eseguono dalla directory `backend-core/`. Per `backend-science` dalla directory `backend-science/`. L'agente deve specificare il `Cwd` appropriato nel parametro del tool `run_command`.

---

## 🛠️ Skill da Consultare

* [backend-core-ops](../skills/backend-core-ops/SKILL.md) — Script di test e gestione container
* [verification-before-completion](../skills/verification-before-completion/SKILL.md) — Checklist di verifica prima di dichiarare il lavoro completato

---

## 📦 Procedura

### 1. Test Unitari (Jest)

Eseguono i test di tutti i moduli con mock delle dipendenze:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm test
```

### 2. Test Singolo File

Per eseguire solo i test di un modulo specifico:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm test -- --testPathPattern=transactions
```

### 3. Test Singolo Describe/It

Per eseguire un singolo test case per nome:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm test -- -t "should calculate balance correctly"
```

### 4. Watch Mode (Sviluppo Iterativo)

Per rieseguire i test automaticamente ad ogni modifica ai file:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:watch
```

### 5. Coverage Report

Per generare un report di copertura del codice:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:cov
```
Il report verrà salvato nella directory `coverage/`.

### 6. Test E2E (End-to-End)

Avvia automaticamente un container PostgreSQL di test, applica le migrazioni, esegue i test e poi smonta il container:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:e2e:docker
```

> [!NOTE]
> I test E2E usano `.env.test` per la configurazione e si connettono a un container PostgreSQL dedicato sulla porta **5433** per default.

### 7. Test Python (Science Service)

> *Esegui dalla directory `backend-science/` (con `direnv` attivo):*
```fish
pytest
```

Per eseguire con output verboso:
```fish
pytest -v
```

Per eseguire un singolo file di test:
```fish
pytest tests/test_processor.py
```

---

## 🧪 Validazione

Prima di dichiarare il lavoro completato, la checklist completa è:

1. ✅ `pnpm test` — tutti i test unitari verdi (da `backend-core/`)
2. ✅ `pnpm run test:e2e:docker` — tutti i test E2E verdi (da `backend-core/`)
3. ✅ `pnpm run lint` — nessun errore di linting (da `backend-core/`)
4. ✅ `pytest` — tutti i test Python verdi (da `backend-science/`, se modifiche al servizio Python)

---

## ❓ Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Porta 5433 già occupata | Container di test precedente non smontato | `docker ps` → `docker rm -f <container_id>` del container sulla porta 5433 |
| Test E2E appesi (hang) | Handle aperti (DB connection, HTTP) | Lo script usa già `--detectOpenHandles`; verificare che i cleanup `afterAll` chiudano le connessioni |
| `Cannot find module` nei test | Cache di Jest corrotta | `pnpm test -- --clearCache` poi rieseguire |
| Test falliscono dopo migrazione | Mock dei repository non aggiornati | Aggiornare i mock in `*.spec.ts` per riflettere i nuovi metodi/signature del repository |
| `ECONNREFUSED` nei test E2E | Container DB di test non pronto | Verificare che `pnpm run db:test:up` completi prima dei test; lo script `test:e2e:docker` gestisce questo automaticamente |
| `direnv` non carica l'env Python | `.envrc` non approvato | Eseguire `direnv allow` nella directory `backend-science/` |
| Jest non trova i file `.spec.ts` | `rootDir` o `testRegex` errato | Verificare la configurazione Jest in `package.json` — `rootDir: "src"`, `testRegex: ".*\\.spec\\.ts$"` |
