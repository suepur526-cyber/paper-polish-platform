import { startCleanupScheduler } from "@/lib/cleanup-scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    startCleanupScheduler();
  }
}
