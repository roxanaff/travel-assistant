export type PackingCategory =
  | "DocumentsAndMoney"
  | "Toiletries"
  | "Clothing"
  | "Electronics"
  | "Health"
  | "Other";

export type PackingItem = {
  id: string;
  tripId: string;
  name: string;
  category: PackingCategory | null;
  quantity: number;
  isPacked: boolean;
  sortOrder: number;
  createdAtUtc: string;
};

export type PackingItemForm = {
  name: string;
  category: "" | PackingCategory;
  quantity: string;
};

/** Returns a fresh form object for a new checklist item. */
export const createEmptyPackingItemForm = (): PackingItemForm => ({
  name: "",
  category: "",
  quantity: "",
});

export const packingCategories: Array<{
  value: PackingCategory;
  label: string;
}> = [
  { value: "DocumentsAndMoney", label: "Documents & money" },
  { value: "Toiletries", label: "Toiletries" },
  { value: "Clothing", label: "Clothing" },
  { value: "Electronics", label: "Electronics" },
  { value: "Health", label: "Health" },
  { value: "Other", label: "Other" },
];
