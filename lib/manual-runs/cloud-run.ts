import { GoogleAuth } from "google-auth-library";

import type {
  ManualRunRecord,
  ManualRunRequest,
  ManualRunStatus,
} from "@/lib/manual-runs/types";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const RUN_API_BASE = "https://run.googleapis.com/v2";
const EXECUTION_NAME_PATTERN =
  /^projects\/[^/]+\/locations\/[^/]+\/jobs\/[^/]+\/executions\/[^/]+$/;

type CloudRunCondition = {
  message?: string;
  reason?: string;
  state?: string;
  status?: string;
  type?: string;
};

type CloudRunExecution = {
  cancelledCount?: number;
  completionTime?: string;
  conditions?: CloudRunCondition[];
  createTime?: string;
  failedCount?: number;
  name: string;
  reconciling?: boolean;
  runningCount?: number;
  startTime?: string;
  succeededCount?: number;
};

type CloudRunExecutionListResponse = {
  executions?: CloudRunExecution[];
};

type CloudRunOperation = {
  done?: boolean;
  error?: {
    message?: string;
  };
  metadata?: unknown;
  name: string;
  response?: unknown;
};

type ManualRunCloudRunConfig = {
  jobName: string;
  projectId: string;
  region: string;
};

function readEnv(key: string) {
  return process.env[key]?.trim() ?? "";
}

function getCloudRunConfig(): ManualRunCloudRunConfig {
  const projectId = readEnv("GOOGLE_CLOUD_PROJECT");
  const region = readEnv("MANUAL_RUN_CLOUD_RUN_REGION");
  const jobName = readEnv("MANUAL_RUN_FETCH_GSC_JOB_NAME");

  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT is required for Cloud Run manual runs");
  }

  if (!region) {
    throw new Error(
      "MANUAL_RUN_CLOUD_RUN_REGION is required for Cloud Run manual runs",
    );
  }

  if (!jobName) {
    throw new Error(
      "MANUAL_RUN_FETCH_GSC_JOB_NAME is required for Cloud Run manual runs",
    );
  }

  return {
    jobName,
    projectId,
    region,
  };
}

/**
 * Builds the logical fetch_gsc CLI args for Cloud Run job overrides.
 */
function buildCloudRunArgs(request: ManualRunRequest) {
  const args: string[] = [];

  if (request.startDate) {
    args.push("--start-date", request.startDate);
  }

  if (request.endDate) {
    args.push("--end-date", request.endDate);
  }

  if (request.skipBigQueryWrite) {
    args.push("--skip-bigquery-write");
  }

  return args;
}

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: [CLOUD_PLATFORM_SCOPE],
  });
  const token = await auth.getAccessToken();

  if (!token) {
    throw new Error("Failed to resolve Google Cloud access token");
  }

  return token;
}

async function fetchGoogleJson<T>(url: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Cloud Run API request failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return (await response.json()) as T;
}

function extractExecutionName(value: unknown): string | null {
  if (typeof value === "string" && EXECUTION_NAME_PATTERN.test(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = extractExecutionName(entry);

      if (match) {
        return match;
      }
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  for (const entry of Object.values(value)) {
    const match = extractExecutionName(entry);

    if (match) {
      return match;
    }
  }

  return null;
}

async function waitForExecutionName(operationName: string) {
  const operationUrl = `${RUN_API_BASE}/${operationName}`;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const operation = await fetchGoogleJson<CloudRunOperation>(operationUrl);

    if (operation.done && operation.error?.message) {
      throw new Error(operation.error.message);
    }

    const executionName =
      extractExecutionName(operation.response) ??
      extractExecutionName(operation.metadata);

    if (executionName) {
      return executionName;
    }

    if (attempt < 11) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }
  }

  return null;
}

function getExecutionIdFromName(name: string) {
  return name.split("/").at(-1) ?? name;
}

function buildCloudRunStatus(execution: CloudRunExecution): ManualRunStatus {
  if ((execution.failedCount ?? 0) > 0 || (execution.cancelledCount ?? 0) > 0) {
    return "failed";
  }

  const completedCondition = execution.conditions?.find(
    (condition) => condition.type === "Completed",
  );

  if (
    completedCondition?.status === "False" ||
    completedCondition?.state === "CONDITION_FAILED"
  ) {
    return "failed";
  }

  if (
    execution.completionTime ||
    completedCondition?.status === "True" ||
    ((execution.succeededCount ?? 0) > 0 && (execution.runningCount ?? 0) === 0)
  ) {
    return "completed";
  }

  if (!execution.startTime && (execution.runningCount ?? 0) === 0) {
    return "queued";
  }

  return "running";
}

function buildCloudRunStatusMessage(
  execution: CloudRunExecution,
  status: ManualRunStatus,
) {
  const completedCondition = execution.conditions?.find(
    (condition) => condition.type === "Completed",
  );

  if (completedCondition?.message) {
    return completedCondition.message;
  }

  if (status === "failed") {
    return "Cloud Run job execution failed";
  }

  if (status === "completed") {
    return "Cloud Run job execution completed";
  }

  if (status === "queued") {
    return "Cloud Run job execution queued";
  }

  if ((execution.runningCount ?? 0) > 0) {
    return "Cloud Run job execution is running";
  }

  return "Cloud Run job execution queued";
}

function toManualRunRecord(
  execution: CloudRunExecution,
  request?: ManualRunRequest,
): ManualRunRecord {
  const status = buildCloudRunStatus(execution);

  return {
    executionId: getExecutionIdFromName(execution.name),
    jobName: "fetch_gsc",
    mode: "cloud_run_job",
    status,
    statusMessage: buildCloudRunStatusMessage(execution, status),
    startedAt: execution.startTime ?? execution.createTime ?? new Date().toISOString(),
    finishedAt: execution.completionTime,
    cloudRunExecutionName: execution.name,
    stdout: [],
    stderr: [],
    args: request ? buildCloudRunArgs(request) : [],
    input: {
      startDate: request?.startDate,
      endDate: request?.endDate,
      skipBigQueryWrite: request?.skipBigQueryWrite ?? false,
    },
  };
}

async function getExecutionById(executionId: string) {
  const config = getCloudRunConfig();

  return fetchGoogleJson<CloudRunExecution>(
    `${RUN_API_BASE}/projects/${config.projectId}/locations/${config.region}/jobs/${config.jobName}/executions/${executionId}`,
  );
}

/**
 * Starts the configured fetch_gsc Cloud Run job and returns the created execution.
 */
export async function startCloudRunManualRun(request: ManualRunRequest) {
  const config = getCloudRunConfig();
  const args = buildCloudRunArgs(request);
  const requestBody =
    args.length > 0
      ? {
          overrides: {
            containerOverrides: [
              {
                args,
              },
            ],
          },
        }
      : {};
  const operation = await fetchGoogleJson<CloudRunOperation>(
    `${RUN_API_BASE}/projects/${config.projectId}/locations/${config.region}/jobs/${config.jobName}:run`,
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
  );
  const executionName = await waitForExecutionName(operation.name);

  if (!executionName) {
    throw new Error("Cloud Run job execution started but no execution name was returned");
  }

  const execution = await fetchGoogleJson<CloudRunExecution>(
    `${RUN_API_BASE}/${executionName}`,
  );

  return toManualRunRecord(execution, request);
}

/**
 * Reads one fetch_gsc Cloud Run execution by execution id.
 */
export async function getCloudRunManualRun(executionId: string) {
  const execution = await getExecutionById(executionId);

  return toManualRunRecord(execution);
}

/**
 * Lists recent fetch_gsc Cloud Run executions.
 */
export async function listCloudRunManualRuns(limit = 10) {
  const config = getCloudRunConfig();
  const payload = await fetchGoogleJson<CloudRunExecutionListResponse>(
    `${RUN_API_BASE}/projects/${config.projectId}/locations/${config.region}/jobs/${config.jobName}/executions?pageSize=${limit}`,
  );

  return (payload.executions ?? []).map((execution) => toManualRunRecord(execution));
}
