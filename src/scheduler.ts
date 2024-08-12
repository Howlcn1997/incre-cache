import {
  BATCH_INTERVAL,
  BATCH_MAX_INTERVAL,
  BATCH_MAX_SIZE,
} from "./constants";
// type Query = any;

interface QueryTask<T> {
  symbol: Symbol;
  query: T;
  resolve: SchedulerResolve;
}

type SchedulerResolve = (queryResult: any) => void;

type ListenerTask<T> = Omit<QueryTask<T>, "resolve">;

type QueryQueue<T> = [T, SchedulerResolve];

enum Priority {
  HIGH = 0,
  MEDIUM = 1,
  LOW = 2,
}

interface SchedulerConfig {
  batchMaxInterval: number;
  batchMaxSize: number;
}

interface SchedulerOptions extends Partial<SchedulerConfig> {}

const defaultOptions: SchedulerConfig = {
  batchMaxInterval: BATCH_MAX_INTERVAL,
  batchMaxSize: BATCH_MAX_SIZE,
};

let getCurrentTime: () => number | DOMHighResTimeStamp;
const hasPerformanceNow =
  typeof performance === "object" && typeof performance.now === "function";

if (hasPerformanceNow) {
  getCurrentTime = () => performance.now();
} else {
  const initialTime = Date.now();
  getCurrentTime = () => Date.now() - initialTime;
}

class Scheduler<T extends any> {
  config: SchedulerConfig;

  private queryQueue: QueryQueue<T>[] = [];

  private queryPending = new Map<Symbol, QueryTask<T>>();

  private listeners: ((tasks: ListenerTask<T>[]) => any)[] = [];

  private startTime: number = 0;

  private scheduleTimer: NodeJS.Timeout | undefined;

  constructor(options?: SchedulerOptions) {
    this.config = Object.assign({}, defaultOptions, options);
  }

  private packQueryTasks(queryQueue: QueryQueue<T>[]): QueryTask<T>[] {
    return queryQueue.map(([query, resolve]) => {
      const symbol = Symbol("query-task");
      return { symbol, query, resolve };
    });
  }

  schedule(query: T, priority?: Priority) {
    if (this.startTime === 0) {
      this.startTime = getCurrentTime();
    }

    const promise = new Promise((resolve) => {
      this.queryQueue.push([query, resolve]);
    });

    const now = getCurrentTime();
    const batchMaxInterval = this.config.batchMaxInterval;

    clearTimeout(this.scheduleTimer);

    const diffTime = now - this.startTime;
    // 当积压任务超过最大容忍数量时且超过时间切片时长时，立即发布任务
    const isImmediatelyPublish =
      this.queryQueue.length >= this.config.batchMaxSize &&
      diffTime >= BATCH_INTERVAL;

    // 当积压任务超过最大容忍时长时，立即发布任务
    const isOverMaxInterval = diffTime > batchMaxInterval;

    if (isImmediatelyPublish || isOverMaxInterval) {
      publish(this);
    } else {
      this.scheduleTimer = setTimeout(() => publish(this), BATCH_INTERVAL);
    }
    return promise;

    function publish(self: Scheduler<T>) {
      const pendingQueryTasks = self.packQueryTasks(self.queryQueue);

      const listenerQueryTasks: ListenerTask<T>[] = [];

      pendingQueryTasks.forEach((task) => {
        self.queryPending.set(task.symbol, task);
        listenerQueryTasks.push({ symbol: task.symbol, query: task.query });
      });

      self.listeners.forEach((listener) => listener(listenerQueryTasks));

      self.queryQueue = [];
      self.startTime = getCurrentTime();
    }
  }

  listen(listener: (tasks: ListenerTask<T>[]) => any) {
    this.listeners.push(listener);
  }

  commit(symbol: Symbol, result: any) {
    const task = this.queryPending.get(symbol);
    if (task) {
      this.queryPending.delete(symbol);
      try {
        task.resolve(result);
      } catch (error) {
        console.error(error);
      }
    }
  }

  commits(tasksResult: { symbol: Symbol; result: any }[]): void {
    tasksResult.forEach(({ symbol, result }) => {
      this.commit(symbol, result);
    });
  }
}

export default Scheduler;
