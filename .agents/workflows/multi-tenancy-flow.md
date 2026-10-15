---
description: Guida standard e procedure di sicurezza per lo sviluppo di funzionalità multi-tenant e l'isolamento dei dati (NestJS + Prisma).
---

# Multi-Tenancy & Data Isolation Workflow

Questa guida definisce la procedura standard per implementare, estendere e verificare la sicurezza dell'isolamento dei dati multi-utente all'interno del backend NestJS. Ogni sviluppatore (o sub-agente) deve seguire queste regole per evitare regressioni di sicurezza e leak di dati tra utenti.

---

## 🏗️ Architettura di Isolamento

Il sistema utilizza un modello di isolamento logico trasparente basato su:
1.  **`nestjs-cls` (AsyncLocalStorage)**: Cattura il `userId` dall'header JWT durante la richiesta HTTP e lo memorizza nel contesto asincrono della chiamata.
2.  **Prisma Client Extensions**: Intercetta ogni query generata dall'ORM e inietta automaticamente la clausola `where: { userId }` per tutti i modelli che hanno una relazione con l'utente.

---

## 📋 Regole di Sviluppo (Developer Guidelines)

### 1. Query Standard di Prisma
Quando scrivi query standard (es. `findMany`, `findUnique`, `update`, `delete`), **non inserire manualmente** il filtro `userId`. La Prisma Client Extension lo farà in automatico:

```typescript
// Strict English for code and comments

// ✅ CORRECT: The extension automatically appends where: { userId: currentUserId }
const userAssets = await this.prisma.asset.findMany();

// ❌ INCORRECT (Redundant and prone to sync issues):
const userId = this.cls.get('userId');
const userAssets = await this.prisma.asset.findMany({ where: { userId } });
```

### 2. Attenzione Critica: Query SQL Raw (`$queryRaw`)
Le Prisma Client Extensions **NON intercettano** e non modificano le query scritte tramite `$queryRaw` o `$executeRaw`. 
Se utilizzi SQL nativo, devi iniettare **manualmente** il filtro di isolamento recuperando il `userId` dal `ClsService`:

> [!CAUTION]
> Mancare l'iniezione del `userId` in una query `$queryRaw` espone l'applicazione a vulnerabilità gravissime di accesso ai dati di altri utenti.

```typescript
// Strict English for code and comments

// ✅ CORRECT: Explicitly fetch and interpolate userId in SQL queries
const userId = this.cls.get('userId');
if (!userId) {
  throw new UnauthorizedException('User context missing');
}

const rawResults = await this.prisma.$queryRaw<Asset[]>`
  SELECT * FROM "Asset" 
  WHERE "userId" = ${userId} 
  AND "balance" > 1000
`;
```

### 3. Bypass Temporaneo dell'Isolamento (System Actions)
Ci sono scenari (es. il seed iniziale del database o la fase di registrazione utente prima dell'emissione del JWT) in cui il contesto CLS è vuoto o in cui è necessario operare a livello di sistema globale.

Per bypassare l'estensione, occorre invocare la query in un blocco protetto o assicurarsi che la Prisma Extension riconosca le query di sistema (es. verificando se il modello interrogato è `User` o se un flag di bypass interno è attivo):

```typescript
// Strict English for code and comments

// Registration categories bootstrapping bypasses the user context check
// because the user is not logged in yet.
await this.cls.runWith({ userId: systemSeederId }, async () => {
  await this.prisma.category.createMany({
    data: defaultCategories.map(cat => ({ ...cat, userId: newUserId }))
  });
});
```

---

## 🧪 Strategia di Test e Verifica (Verification)

Qualsiasi modifica allo schema Prisma o ai moduli di autenticazione richiede la validazione tramite unit test del contesto di isolamento.

### Unit Test di Isolamento delle Query
Ogni nuova entità database deve avere un test associato che verifichi il corretto isolamento delle query. Esegui il test locale:

```fish
cd backend-core
pnpm test prisma-multi-tenant.extension.spec
```

Il test deve verificare che:
1.  Se il contesto `ClsService` contiene `userId = 'test-uuid'`, la query generata includa il filtro.
2.  Se il contesto è vuoto (es. cron job di sistema o seeder), la query venga eseguita senza sollevare eccezioni ma senza esporre dati utente (o bypassando in sicurezza).
