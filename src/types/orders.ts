export type OrderItem = {
  id: string;
  amount: number;
  notes?: string | null;
  prepared: boolean;
  awaitingStockPickup?: boolean;
  canceled?: boolean;
  Product: { id: string; name: string; categoryId: string; Category?: { name: string } };
};

export type Order = {
  pendingStockAreas?: (string | null)[];
  awaitingStockPickup?: boolean;
  id: string;
  name?: string;
  created_at: string;
  Session: { mesa: { number: number; Category?: { name: string } } };
  items: OrderItem[];
};

export type GroupedOrder = {
  awaitingStockPickup?: boolean;
  id: string;
  name: string;
  created_at: string;
  Session: Order['Session'];
  items: OrderItem[];
  orderIds: string[];
  allPrepared?: boolean;
};
