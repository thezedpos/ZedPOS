import Dexie, { type EntityTable } from 'dexie';

// Offline sale transaction schema
export interface OfflineSale {
  id?: number;
  barcode: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  timestamp: number;
  customerId?: string;
  isCredit: boolean;
  // JSON stringified transaction body for RPC call
  transactionBody: string;
  synced: boolean;
}

// IndexedDB Database
export class ZambiaPOSDB extends Dexie {
  offlineSales!: EntityTable<OfflineSale, 'id'>;

  constructor() {
    super('ZambiaPOSDB');
    
    this.version(1).stores({
      offlineSales: '++id, barcode, timestamp, synced, customerId',
    });
  }
}

export const db = new ZambiaPOSDB();

// Helper functions for offline sales
export const offlineSaleHelpers = {
  // Add a sale to offline storage
  async addSale(sale: Omit<OfflineSale, 'id' | 'synced'>): Promise<number> {
    // We added "as number" here to fix the error
    return (await db.offlineSales.add({
      ...sale,
      synced: false,
    })) as number;
  },

  // Get all unsynced sales
  async getUnsyncedSales(): Promise<OfflineSale[]> {
    // .filter works better for true/false values
return await db.offlineSales.filter(sale => sale.synced === false).toArray();
  },

  // Mark sale as synced
  async markSynced(id: number): Promise<void> {
    await db.offlineSales.update(id, { synced: true });
  },

  // Delete synced sales older than 7 days
  async cleanupOldSynced(): Promise<number> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return await db.offlineSales
      .where('timestamp')
      .below(sevenDaysAgo)
      .and((sale) => sale.synced)
      .delete();
  },

  // Get all offline sales (for debugging/admin)
  async getAllSales(): Promise<OfflineSale[]> {
    return await db.offlineSales.toArray();
  },
};
