import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<number>();

export function withTenant<T>(accountId: number, callback: () => T) {
  return storage.run(accountId, callback);
}

export function setTenant(accountId: number) {
  storage.enterWith(accountId);
}

export function currentTenantId() {
  return storage.getStore();
}
