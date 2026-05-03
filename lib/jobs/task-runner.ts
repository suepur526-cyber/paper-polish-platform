export type TaskJobAction = "outline" | "rewrite" | "export";

export type TaskJobHandler = (taskId: string, action: TaskJobAction) => Promise<void>;

export type EnqueueTaskJobResult = {
  alreadyQueued: boolean;
  promise: Promise<void>;
};

const runningJobs = new Map<string, Promise<void>>();

export function enqueueTaskJob(
  taskId: string,
  action: TaskJobAction,
  handler: TaskJobHandler
): EnqueueTaskJobResult {
  const key = getTaskJobKey(taskId, action);
  const existing = runningJobs.get(key);
  if (existing) {
    return { alreadyQueued: true, promise: existing };
  }

  const promise = new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      handler(taskId, action).then(resolve, reject);
    }, 0);
  }).finally(() => {
    runningJobs.delete(key);
  });
  runningJobs.set(key, promise);
  void promise.catch(() => undefined);

  return { alreadyQueued: false, promise };
}

export function getRunningTaskJobCount() {
  return runningJobs.size;
}

export function clearTaskJobQueueForTests() {
  runningJobs.clear();
}

function getTaskJobKey(taskId: string, action: TaskJobAction) {
  return `${taskId}:${action}`;
}
