import "server-only";

import { requirePermission } from "@/server/auth/auth";

export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  medicineView: "medicine.view",
  medicineCreate: "medicine.create",
  medicineUpdate: "medicine.update",
  medicineDelete: "medicine.delete",
  salesView: "sales.view",
  salesCreate: "sales.create",
  purchaseView: "purchase.view",
  purchaseCreate: "purchase.create",
  inventoryView: "inventory.view",
  inventoryAdjust: "inventory.adjust",
  customersView: "customers.view",
  suppliersView: "suppliers.view",
  reportsView: "reports.view",
  settingsManage: "settings.manage",
  usersManage: "users.manage",
} as const;

export { requirePermission };
