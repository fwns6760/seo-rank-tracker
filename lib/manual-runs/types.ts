export type ManualRunJobName = "fetch_gsc";

export type ManualRunStatus = "queued" | "running" | "completed" | "failed";
export type ManualRunMode = "local_process" | "cloud_run_job";

export type ManualRunRequest = {
  jobName: ManualRunJobName;
  startDate?: string;
  endDate?: string;
  skipBigQueryWrite?: boolean;
};

export type ManualRunRecord = {
  executionId: string;
  jobName: ManualRunJobName;
  mode: ManualRunMode;
  status: ManualRunStatus;
  statusMessage: string;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  pid?: number;
  resultStatus?: string;
  cloudRunExecutionName?: string;
  stdout: string[];
  stderr: string[];
  args: string[];
  input: {
    startDate?: string;
    endDate?: string;
    skipBigQueryWrite: boolean;
  };
};
