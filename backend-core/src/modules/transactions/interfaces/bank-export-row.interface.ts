/**
 * Structure of a raw row parsed from imported CSV/Excel bank export files.
 */
export interface BankExportRow {
  Data?: string | number;
  Operazione?: string;
  Dettagli?: string;
  'Conto o carta'?: string;
  Contabilizzazione?: string;
  Categoria?: string;
  'Categoria '?: string;
  Valuta?: string;
  Importo?: number | string;
}
