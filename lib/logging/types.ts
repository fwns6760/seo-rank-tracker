export type LogSeverity = "INFO" | "WARNING" | "ERROR";

export type JobRunStatus =
  | "started"
  | "running"
  | "completed"
  | "completed_with_warnings"
  | "failed";

export type StepStatus =
  | "started"
  | "success"
  | "warning"
  | "failed"
  | "skipped"
  | "retrying";

export type LogRecordValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

export type LogRecord = Record<string, LogRecordValue>;

export type JobCounters = {
  fetched_rows?: number;
  inserted_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  error_count?: number;
};

export type JobLoggerContext = {
  executionId: string;
  jobName: string;
  targetSite: string;
  startedAt: string;
};

export type JobExecutionLogInput = JobCounters & {
  severity?: LogSeverity;
  finishedAt?: string;
  status: JobRunStatus;
  message: string;
  durationMs?: number;
  extra?: LogRecord;
};

export type JobStepLogInput = {
  severity?: LogSeverity;
  step: string;
  stepStatus: StepStatus;
  message: string;
  inputSummary?: LogRecordValue;
  outputSummary?: LogRecordValue;
  retryCount?: number;
  extra?: LogRecord;
};

export type JobErrorLogInput = JobCounters & {
  severity?: Extract<LogSeverity, "ERROR" | "WARNING">;
  message: string;
  failedStep: string;
  recoverable: boolean;
  errorType?: string;
  errorMessage?: string;
  stacktrace?: string;
  extra?: LogRecord;
};

export type StructuredLogEntry = JobCounters &
  LogRecord & {
    severity: LogSeverity;
    timestamp: string;
    execution_id: string;
    job_name: string;
    target_site: string;
    started_at?: string;
    finished_at?: string;
    duration_ms?: number;
    status?: JobRunStatus;
    message: string;
    step?: string;
    step_status?: StepStatus;
    input_summary?: LogRecordValue;
    output_summary?: LogRecordValue;
    retry_count?: number;
    error_type?: string;
    error_message?: string;
    stacktrace?: string;
    failed_step?: string;
    recoverable?: boolean;
  };

