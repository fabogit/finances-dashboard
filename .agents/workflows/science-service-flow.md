---
description: Procedura standard per lo sviluppo, il test e l'audit del modulo Python/FastAPI (backend-science) e della sua integrazione con NestJS.
---

# Science Service Development Workflow

Questo workflow definisce la procedura per lavorare sul servizio Python/FastAPI (`backend-science`), che gestisce la pulizia dati, la categorizzazione AI, il forecasting e le proiezioni dei savings goals.

---

## 📋 Prerequisiti

- Python virtual environment attivo (tramite `direnv` in `backend-science/`)
- Se `direnv` non è configurato, eseguire `direnv allow` nella directory `backend-science/`
- Dipendenze Python installate: `pip install -r requirements.txt`
- Per l'integrazione con NestJS: container Docker avviati (vedi [start-backend.md](start-backend.md))

> [!NOTE]
> I comandi Python si eseguono dalla directory `backend-science/`. I comandi NestJS dalla directory `backend-core/`. L'agente deve specificare il `Cwd` appropriato nel parametro del tool `run_command`.

---

## 🛠️ Skill da Consultare

* [fastapi](../skills/fastapi/SKILL.md) — Best practices FastAPI, modelli Pydantic, routing
* [pandas-pro](../skills/pandas-pro/SKILL.md) — Operazioni DataFrame, pulizia dati, aggregazioni
* [backend-core-ops](../skills/backend-core-ops/SKILL.md) — Gestione container Docker
* [backend-core-dev](../skills/backend-core-dev/SKILL.md) — Pattern del proxy NestJS (`ScienceService`)

---

## 📦 Procedura

### 1. Architettura del Servizio

Il servizio Python è strutturato come segue:

```
backend-science/
├── src/
│   ├── main.py              # Entry point FastAPI, definizione router e endpoint
│   ├── modules/
│   │   ├── processor.py      # Pulizia dati: normalizzazione date, importi, descrizioni
│   │   ├── forecaster.py     # Previsioni a 3 mesi: aggregazione, trend, regressione
│   │   ├── rules.py          # Mapping regole di categorizzazione (keyword → category)
│   │   └── util/             # Utility condivise
│   └── __init__.py
├── tests/                    # Suite pytest
├── requirements.txt
└── .envrc                    # direnv config (attiva venv + PYTHONPATH)
```

### 2. Aggiungere un Nuovo Endpoint FastAPI

1. **Definire il modello Pydantic** (input/output) in `main.py` o in un file dedicato
2. **Implementare la logica** nel modulo appropriato (`modules/`)
3. **Aggiungere la rotta** in `main.py`
4. **Scrivere i test** in `tests/`
5. **Aggiornare il proxy NestJS** nel modulo `science` di `backend-core` (`src/modules/science/`)

### 3. Comunicazione NestJS → FastAPI (Proxy Pattern)

Il `ScienceService` in NestJS funge da proxy resiliente:

- Utilizza `HttpService` (Axios) per le chiamate HTTP verso `SCIENCE_SERVICE_URL`
- Implementa un **fallback**: se il servizio Python non risponde, l'operazione non fallisce ma restituisce uno stato degradato (`science: failed`)
- I DTO di input/output devono essere allineati tra i modelli Pydantic Python e le classi TypeScript

> [!IMPORTANT]
> Ogni modifica agli endpoint Python o ai modelli Pydantic richiede un aggiornamento corrispondente dei DTO TypeScript in `backend-core/src/modules/science/`.

### 4. Gestione delle Dipendenze Python

Per aggiungere una nuova dipendenza:
> *Esegui dalla directory `backend-science/` (con venv attivo):*
```fish
pip install <package>
pip freeze > requirements.txt
```

> [!WARNING]
> Verificare che `requirements.txt` non contenga dipendenze specifiche della piattaforma (es. path assoluti). Pulire manualmente se necessario.

### 5. Endpoint Esposti

| Endpoint | Descrizione | Input | Output |
|----------|-------------|-------|--------|
| `POST /process` | Pulizia e categorizzazione transazioni | Array di `RawTransaction` | Array di `ProcessedTransactionDto` |
| `POST /forecast` | Previsione cash flow a 3 mesi | Storico transazioni + `std_deviation_threshold` | Forecast per Income, Expenses, Cash Flow |
| `POST /goals/projection` | Stima ETA obiettivo di risparmio | Transazioni storiche + target/current amount | `estimated_date`, `monthly_avg`, `confidence` |

---

## 🧪 Validazione

### Test Python
> *Esegui dalla directory `backend-science/`:*
```fish
pytest
```

Per output verboso:
```fish
pytest -v
```

Per coverage:
```fish
pytest --cov=src
```

### Test di Integrazione (via NestJS)

Verificare che il proxy funzioni correttamente:
> *Esegui dalla directory `backend-core/`:*
```fish
pnpm run test:e2e:docker
```

### Verifica Swagger

Con il servizio avviato, controllare la documentazione interattiva:
- **FastAPI Swagger**: http://localhost:8000/docs
- **FastAPI ReDoc**: http://localhost:8000/redoc

---

## ❓ Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `ModuleNotFoundError` | `PYTHONPATH` non configurato | Eseguire `direnv allow` oppure `set -x PYTHONPATH src` in fish |
| `direnv` non si attiva | `.envrc` non approvato | `direnv allow` nella directory `backend-science/` |
| Import circolari in Python | Moduli che si importano reciprocamente | Ristrutturare con import lazy o funzioni factory |
| NestJS non raggiunge Python | Container non avviato o URL errato | Verificare `SCIENCE_SERVICE_URL` in `.env.compose` (default: `http://backend-science:8000`) |
| Pydantic validation error | DTO disallineato tra Python e NestJS | Confrontare i modelli Pydantic con i DTO TypeScript in `src/modules/science/` |
| `pip freeze` include pacchetti di sistema | venv non attivo durante il freeze | Assicurarsi che il venv sia attivo prima di fare `pip freeze` |
| Pandas `SettingWithCopyWarning` | Modifica su slice di DataFrame | Usare `.loc[]` o `.copy()` per evitare il warning |
