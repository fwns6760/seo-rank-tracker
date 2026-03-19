import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { createExecutionId } from "@/lib/logging";
import {
  getCloudRunManualRun,
  listCloudRunManualRuns,
  startCloudRunManualRun,
} from "@/lib/manual-runs/cloud-run";
import type {
  ManualRunRecord,
  ManualRunMode,
  ManualRunRequest,
} from "@/lib/manual-runs/types";

const MAX_LOG_LINES = 40;
const STORE_KEY = "__seo_rank_tracker_manual_runs__";

type ManualRunStore = Map<string, ManualRunRecord>;

export class ManualRunValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualRunValidationError";
  }
}

function getStore() {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ManualRunStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = new Map<string, ManualRunRecord>();
  }

  return globalStore[STORE_KEY];
}

function isIsoDate(value: string | undefined) {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getManualRunMode(): ManualRunMode {
  return process.env.MANUAL_RUN_MODE?.trim() === "cloud_run_job"
    ? "cloud_run_job"
    : "local_process";
}

function resolvePythonExecutable() {
  const venvPython = path.join(process.cwd(), ".venv", "bin", "python");

  if (existsSync(venvPython)) {
    return venvPython;
  }

  return "python3";
}

function resolveFetchGscLauncher() {
  const launcher = path.join(process.cwd(), "scripts", "run-fetch-gsc.sh");

  if (existsSync(launcher)) {
    return {
      command: "sh",
      args: [launcher],
    };
  }

  return {
    command: resolvePythonExecutable(),
    args: ["-m", "jobs.fetch_gsc.main"],
  };
}

function parseJsonLogLine(line: string) {
  try {
    return JSON.parse(line) as { message?: string; status?: string };
  } catch {
    return null;
  }
}

function appendLogLine(record: ManualRunRecord, key: "stdout" | "stderr", line: string) {
  if (!line.trim()) {
    return;
  }

  const target = record[key];
  target.push(line);

  if (target.length > MAX_LOG_LINES) {
    target.splice(0, target.length - MAX_LOG_LINES);
  }

  const parsed = parseJsonLogLine(line);

  if (parsed?.message) {
    record.statusMessage = parsed.message;
  }

  if (parsed?.status) {
    record.resultStatus = parsed.status;
  }
}

function finalizeStatus(exitCode: number | null) {
  return exitCode === 0 ? "completed" : "failed";
}

function getJobCommand(request: ManualRunRequest, executionId: string) {
  const launcher = resolveFetchGscLauncher();
  const args = [...launcher.args];

  if (request.startDate) {
    args.push("--start-date", request.startDate);
  }

  if (request.endDate) {
    args.push("--end-date", request.endDate);
  }

  if (request.skipBigQueryWrite) {
    args.push("--skip-bigquery-write");
  }

  return {
    command: launcher.command,
    args,
    env: {
      ...process.env,
      EXECUTION_ID: executionId,
    },
  };
}

export function validateManualRunRequest(request: ManualRunRequest) {
  if (request.jobName !== "fetch_gsc") {
    throw new ManualRunValidationError(
      `Unsupported manual run job: ${request.jobName}`,
    );
  }

  if (!isIsoDate(request.startDate) || !isIsoDate(request.endDate)) {
    throw new ManualRunValidationError(
      "startDate and endDate must use YYYY-MM-DD format",
    );
  }

  if (
    request.startDate &&
    request.endDate &&
    request.startDate.localeCompare(request.endDate) > 0
  ) {
    throw new ManualRunValidationError(
      "startDate must be on or before endDate",
    );
  }
}

function cloneRecord(record: ManualRunRecord) {
  return {
    ...record,
    stdout: [...record.stdout],
    stderr: [...record.stderr],
    input: { ...record.input },
  };
}

/**
 * Starts a local background process for a supported manual job.
 */
export async function startManualRun(request: ManualRunRequest) {
  validateManualRunRequest(request);

  if (getManualRunMode() === "cloud_run_job") {
    return startCloudRunManualRun(request);
  }

  const executionId = createExecutionId(request.jobName);
  const store = getStore();
  const { command, args, env } = getJobCommand(request, executionId);
  const record: ManualRunRecord = {
    executionId,
    jobName: request.jobName,
    mode: "local_process",
    status: "queued",
    statusMessage: "Manual run queued",
    startedAt: new Date().toISOString(),
    stdout: [],
    stderr: [],
    args: [command, ...args],
    input: {
      startDate: request.startDate,
      endDate: request.endDate,
      skipBigQueryWrite: request.skipBigQueryWrite ?? false,
    },
  };

  store.set(executionId, record);

  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  record.status = "running";
  record.statusMessage = "Manual run started";
  record.pid = child.pid ?? undefined;

  child.stdout?.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    lines.forEach((line: string) => appendLogLine(record, "stdout", line));
  });

  child.stderr?.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    lines.forEach((line: string) => appendLogLine(record, "stderr", line));
  });

  child.on("error", (error) => {
    record.status = "failed";
    record.finishedAt = new Date().toISOString();
    record.statusMessage = error.message;
    appendLogLine(record, "stderr", error.stack ?? error.message);
  });

  child.on("close", (exitCode) => {
    record.exitCode = exitCode;
    record.finishedAt = new Date().toISOString();
    record.status = finalizeStatus(exitCode);

    if (record.status === "completed") {
      record.statusMessage =
        record.resultStatus === "completed_with_warnings"
          ? "Manual run completed with warnings"
          : "Manual run completed successfully";
    } else if (!record.statusMessage) {
      record.statusMessage = "Manual run failed";
    }
  });

  return cloneRecord(record);
}

/**
 * Returns one tracked manual run by execution id.
 */
export async function getManualRun(executionId: string) {
  if (getManualRunMode() === "cloud_run_job") {
    return getCloudRunManualRun(executionId);
  }

  const record = getStore().get(executionId);

  return record ? cloneRecord(record) : null;
}

/**
 * Returns the most recent tracked manual runs.
 */
export async function listManualRuns(limit = 10) {
  if (getManualRunMode() === "cloud_run_job") {
    return listCloudRunManualRuns(limit);
  }

  return [...getStore().values()]
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit)
    .map(cloneRecord);
}
