import { describe, expect, it } from "vitest";
import {
  clearTaskJobQueueForTests,
  enqueueTaskJob,
  getRunningTaskJobCount
} from "@/lib/jobs/task-runner";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("task runner", () => {
  it("does not enqueue the same task action twice while it is running", async () => {
    clearTaskJobQueueForTests();
    const gate = deferred();
    const calls: string[] = [];

    const first = enqueueTaskJob("task-1", "outline", async (taskId, action) => {
      calls.push(`${taskId}:${action}`);
      await gate.promise;
    });
    const second = enqueueTaskJob("task-1", "outline", async (taskId, action) => {
      calls.push(`${taskId}:${action}:duplicate`);
    });

    expect(first.alreadyQueued).toBe(false);
    expect(second.alreadyQueued).toBe(true);
    expect(getRunningTaskJobCount()).toBe(1);

    gate.resolve();
    await first.promise;

    expect(calls).toEqual(["task-1:outline"]);
    expect(getRunningTaskJobCount()).toBe(0);
  });
});
