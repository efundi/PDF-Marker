import { AsyncResource } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import {sep} from 'path';
import {cpus} from 'os';
import {isNil} from 'lodash';
import {TaskDetails} from './web-worker/task-detail';

const kTaskInfo = Symbol('kTaskInfo');
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent');
type TaskCallback = (data, error) => void;
interface QueuedTask {
  task: TaskDetails;
  callback: TaskCallback;
}

class WorkerPoolTaskInfo<R> extends AsyncResource {
  private callback: TaskCallback;

  constructor(callback) {
    super('WorkerPoolTaskInfo');
    this.callback = callback;
  }

  done(err, result: R) {
    this.runInAsyncScope(this.callback, null, err, result);
    this.emitDestroy();  // `TaskInfo`s are used only once.
  }
}

export class WorkerPool extends EventEmitter {
  private static instance: WorkerPool;
  private numThreads: number;
  private workers: Worker[];
  private freeWorkers: Worker[];
  private tasks: QueuedTask[];

  private constructor() {
    super();
    this.numThreads = cpus().length;
    this.workers = [];
    this.freeWorkers = [];
    this.tasks = [];

    // Any time the kWorkerFreedEvent is emitted, dispatch
    // the next task pending in the queue, if any.
    this.on(kWorkerFreedEvent, () => {
      if (this.tasks.length > 0) {
        const { task, callback } = this.tasks.shift();
        this.runTask(task, callback);
      } else {
        // We can remove an idle worker
        this.removeIdleWorkers();
      }
    });
  }

  public static getInstance(): WorkerPool {
    if (isNil(WorkerPool.instance)) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }

  private removeIdleWorkers() {
    while (this.freeWorkers.length > 0) {
      const worker = this.freeWorkers.pop();
      this.workers.splice(this.workers.indexOf(worker), 1);
      worker.terminate();
    }
  }

  private addNewWorker() {

    const worker = new Worker(__dirname + sep + 'pdfm-web-worker.js');
    worker.on('message', (result) => {
      // In case of success: Call the callback that was passed to `runTask`,
      // remove the `TaskInfo` associated with the Worker, and mark it as free
      // again.
      worker[kTaskInfo].done(null, result);
      worker[kTaskInfo] = null;
      this.freeWorkers.push(worker);
      this.emit(kWorkerFreedEvent);
    });
    worker.on('error', (err) => {
      // In case of an uncaught exception: Call the callback that was passed to
      // `runTask` with the error.
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(err, null);
      } else {
        this.emit('error', err);
      }
      // Remove the worker from the list and start a new Worker to replace the
      // current one.
      this.workers.splice(this.workers.indexOf(worker), 1);
      this.addNewWorker();
    });
    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  private runTask(task: TaskDetails, callback: TaskCallback) {

    if (this.freeWorkers.length === 0 && this.workers.length < this.numThreads) {
      // We have space to add another worker
      this.addNewWorker();
    }

    if (this.freeWorkers.length === 0) {
      // No free threads, wait until a worker thread becomes free.
      this.tasks.push({ task, callback });
      return;
    }

    const worker = this.freeWorkers.pop();
    worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
    worker.postMessage(task);
  }

  queueTask<T extends TaskDetails>(task: T): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.runTask(task, (error, result) => {
        if (error) {
          if (error.message){
            reject(error.message);
          } else {
            reject(error);
          }
        } else {
          resolve(result);
        }
      });
    });
  }

  close() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}
