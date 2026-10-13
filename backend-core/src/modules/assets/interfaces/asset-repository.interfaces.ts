import { Asset, AssetHistory, Prisma } from '@prisma/client';

/**
 * Represents an Asset model enriched with its historical balance snapshots.
 */
export interface AssetWithHistory extends Asset {
  history: AssetHistory[];
}

/**
 * Result structure of the asset balance reconciliation process.
 */
export interface RecalculateBalanceResult {
  asset: Asset;
  baseBalance: Prisma.Decimal;
  transactionsSum: Prisma.Decimal;
  newBalance: Prisma.Decimal;
  basedOnSnapshotDate: Date;
}
