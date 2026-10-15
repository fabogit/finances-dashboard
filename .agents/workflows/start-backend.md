---
description: Start the backend-core project and its dependencies using Docker Compose.
---

# Start Backend Workflow

Procedura standard per avviare l'ambiente di sviluppo completo (NestJS + Python + PostgreSQL) tramite Docker Compose.

---

## 📋 Prerequisiti

- Docker e Docker Compose installati e funzionanti
- File `.env.compose` presente nella root del progetto (`fn/`) con le configurazioni di database e porte
- `pnpm` disponibile (attivato via `corepack` e `fnm` in shell `fish`)

> [!NOTE]
> Tutti i comandi per `backend-core` si eseguono dalla directory `backend-core/`. Per `backend-science` dalla directory `backend-science/`. L'agente deve specificare il `Cwd` appropriato nel parametro del tool `run_command`.

---

## 🛠️ Skill da Consultare

* [backend-core-ops](../skills/backend-core-ops/SKILL.md) — Gestione container Docker, script di progetto, configurazione ambiente

---

## 📦 Procedura

### 1. Verifica delle Variabili d'Ambiente

Assicurarsi che `.env.compose` esista nella root directory e contenga le configurazioni necessarie per database e porte.

### 2. Avvio dei Servizi Docker

> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run docker:up
```

### 3. Verifica dello Stato

Attendere che i container siano in salute:
```fish
docker ps
```
- `fn-core` — porta 3000 (NestJS API)
- `fn-science` — porta 8000 (FastAPI Python)
- `fn-postgres` — healthy (PostgreSQL)

### 4. Accesso ai Log

Se qualcosa fallisce, controllare i log:
```fish
docker logs -f fn-core
```

---

## 🐍 Esecuzione Locale del Servizio Python (Alternativa)

Per sviluppo locale più rapido, debug o esecuzione fuori Docker:

### 1. Navigare nella directory

> *Dalla directory `backend-science/` (`direnv` attiva automaticamente il virtual environment):*

### 2. Installare le dipendenze (se necessario)
```fish
pip install -r requirements.txt
```

### 3. Avviare il server FastAPI

Se `direnv` è abilitato (eseguire `direnv allow` se richiesto), il `PYTHONPATH` è configurato automaticamente:
```fish
uvicorn src.main:app --reload --port 8000
```
Se `direnv` non è attivo:
```fish
env PYTHONPATH=src uvicorn src.main:app --reload --port 8000
```

---

## 🧪 Validazione

Dopo l'avvio, verificare che le API siano raggiungibili:
- **NestJS Swagger**: http://localhost:3000/api
- **FastAPI Swagger**: http://localhost:8000/docs
- **Health check**: `curl http://localhost:3000/api` dovrebbe restituire la pagina Swagger

---

## ❓ Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Porta 3000 già in uso | Un altro processo NestJS è in esecuzione | `lsof -i :3000` per trovare il PID, `kill <PID>` |
| Porta 8000 già in uso | Un altro processo uvicorn/FastAPI è in esecuzione | `lsof -i :8000` per trovare il PID, `kill <PID>` |
| `fn-core` restarta in loop | Errore di connessione al DB o migrazione mancante | `docker logs fn-core` per diagnostica; verificare `.env.compose` |
| `fn-science` non si avvia | Dipendenza Python mancante | `docker logs fn-science`; verificare `requirements.txt` |
| `fn-postgres` non diventa healthy | Volume corrotto o porta 5432 occupata | `docker-compose down -v` per rimuovere volumi, poi riavviare |
| `direnv` non attivo | `.envrc` non approvato | Eseguire `direnv allow` nella directory `backend-science/` |
| `fnm`/`corepack` non trovati | Shell non è `fish` o `fnm` non installato | Verificare `.antigravityrules` — la shell deve essere `fish` con `fnm` configurato |
