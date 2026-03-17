import { createExecutionId } from "@/lib/logging/execution-id";
import {
  getDefaultSeverity,
  writeStructuredLog,
} from "@/lib/logging/structured-logger";
import type {
  JobCounters,
  JobErrorLogInput,
  JobExecutionLogInput,
  JobLoggerContext,
  JobStepLogInput,
  LogRecord,
  StructuredLogEntry,
} from "@/lib/logging/types";

type JobLoggerOptions = {
  executionId?: string;
  jobName: string;
  targetSite: string;
  startedAt?: Date;
};

function getIsoString(value?: Date | string) {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : value;
}

function buildCounters(counters?: JobCounters) {
  return {
    fetched_rows: counters?.fetched_rows ?? 0,
    inserted_rows: counters?.inserted_rows ?? 0,
    updated_rows: counters?.updated_rows ?? 0,
    skipped_rows: counters?.skipped_rows ?? 0,
    error_count: counters?.error_count ?? 0,
  };
}

function mergeExtraFields(
  baseEntry: StructuredLogEntry,
  extra?: LogRecord,
): StructuredLogEntry {
  if (!extra) {
    return baseEntry;
  }

  return {
    ...baseEntry,
    ...extra,
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorType: error.name,
      errorMessage: error.message,
      stacktrace: error.stack,
    };
  }

  return {
    errorType: "UnknownError",
    errorMessage: String(error),
    stacktrace: undefined,
  };
}

/**
 * Creates a reusable logging context for one job execution.
 */
export function createJobLoggerContext({
  executionId,
  jobName,
  targetSite,
  startedAt,
}: JobLoggerOptions): JobLoggerContext {
  const jobStartedAt = getIsoString(startedAt);

  return {
    executionId: executionId ?? createExecutionId(jobName),
    jobName,
    targetSite,
    startedAt: jobStartedAt,
  };
}

/**
 * Builds and writes a job-level structured log entry.
 */
export function logJobExecution(
  context: JobLoggerContext,
  input: JobExecutionLogInput,
) {
  const finishedAt = getIsoString(input.finishedAt);
  const entry = mergeExtraFields(
    {
      severity: input.severity ?? getDefaultSeverity(input.status),
      timestamp: new Date().toISOString(),
      execution_id: context.executionId,
      job_name: context.jobName,
      target_site: context.targetSite,
      started_at: context.startedAt,
      finished_at: finishedAt,
      duration_ms: input.durationMs,
      status: input.status,
      message: input.message,
      ...buildCounters(input),
    },
    input.extra,
  );

  writeStructuredLog(entry);

  return entry;
}

/**
 * Builds and writes a step-level structured log entry.
 */
export function logJobStep(context: JobLoggerContext, input: JobStepLogInput) {
  const entry = mergeExtraFields(
    {
      severity: input.severity ?? getDefaultSeverity(input.stepStatus),
      timestamp: new Date().toISOString(),
      execution_id: context.executionId,
      job_name: context.jobName,
      target_site: context.targetSite,
      started_at: context.startedAt,
      message: input.message,
      step: input.step,
      step_status: input.stepStatus,
      input_summary: input.inputSummary,
      output_summary: input.outputSummary,
      retry_count: input.retryCount ?? 0,
    },
    input.extra,
  );

  writeStructuredLog(entry);

  return entry;
}

/**
 * Builds and writes an error log entry with normalized error metadata.
 */
export function logJobError(
  context: JobLoggerContext,
  error: unknown,
  input: JobErrorLogInput,
) {
  const serializedError = serializeError(error);
  const entry = mergeExtraFields(
    {
      severity: input.severity ?? (input.recoverable ? "WARNING" : "ERROR"),
      timestamp: new Date().toISOString(),
      execution_id: context.executionId,
      job_name: context.jobName,
      target_site: context.targetSite,
      started_at: context.startedAt,
      status: input.recoverable ? "completed_with_warnings" : "failed",
      message: input.message,
      failed_step: input.failedStep,
      recoverable: input.recoverable,
      error_type: input.errorType ?? serializedError.errorType,
      error_message: input.errorMessage ?? serializedError.errorMessage,
      stacktrace: input.stacktrace ?? serializedError.stacktrace,
      ...buildCounters(input),
    },
    input.extra,
  );

  writeStructuredLog(entry);

  return entry;
}

/**
 * Creates a small helper object for jobs that need shared context and duration handling.
 */
export function createJobLogger(options: JobLoggerOptions) {
  const context = createJobLoggerContext(options);
  const startedAtMs = new Date(context.startedAt).getTime();
  const defaultDurationMs = Number.isNaN(startedAtMs)
    ? undefined
    : Math.max(0, Date.now() - startedAtMs);

  return {
    context,
    executionId: context.executionId,
    logExecution(input: JobExecutionLogInput) {
      return logJobExecution(context, {
        ...input,
        durationMs: input.durationMs ?? defaultDurationMs,
      });
    },
    logStep(input: JobStepLogInput) {
      return logJobStep(context, input);
    },
    logError(error: unknown, input: JobErrorLogInput) {
      return logJobError(context, error, input);
    },
  };
}
