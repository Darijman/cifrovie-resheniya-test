export interface Item {
  id: string;
}

export const allItems: Item[] = Array.from({ length: 1_000_000 }, (_, i) => ({
  id: String(i + 1),
}));

export const selectedItems: Item[] = [];
