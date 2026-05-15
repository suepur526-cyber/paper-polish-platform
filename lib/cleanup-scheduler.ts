import { cleanupExpiredPickupCodes } from "@/lib/cleanup";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const globalForCleanup = globalThis as unknown as {
  cleanupScheduler?: NodeJS.Timeout;
  cleanupStarted?: boolean;
};

export function startCleanupScheduler() {
  if (globalForCleanup.cleanupStarted) return;
  globalForCleanup.cleanupStarted = true;

  void cleanupExpiredPickupCodes().catch(() => undefined);
  globalForCleanup.cleanupScheduler = setInterval(() => {
    void cleanupExpiredPickupCodes().catch(() => undefined);
  }, CLEANUP_INTERVAL_MS);
}

export function stopCleanupSchedulerForTests() {
  if (globalForCleanup.cleanupScheduler) {
    clearInterval(globalForCleanup.cleanupScheduler);
  }
  globalForCleanup.cleanupScheduler = undefined;
  globalForCleanup.cleanupStarted = false;
}
