export const STORAGE_ISSUE_EVENT = "renting-radar:storage-issue";

export interface StorageIssue {
  action: "read" | "write" | "remove";
  message: string;
}
let queuedIssue: StorageIssue | null = null;

function reportStorageIssue(issue: StorageIssue) {
  queuedIssue = issue;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<StorageIssue>(STORAGE_ISSUE_EVENT, { detail: issue }));
  }
}

export function consumeStorageIssue() {
  const issue = queuedIssue;
  queuedIssue = null;
  return issue;
}

export function readStorageJson(key: string): unknown | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return undefined;
    }
    return JSON.parse(rawValue) as unknown;
  } catch {
    reportStorageIssue({
      action: "read",
      message: "本地数据无法读取，已保留原数据。你可以稍后导出或清理本地数据后重试。",
    });
    return undefined;
  }
}

export function writeStorageJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    reportStorageIssue({
      action: "write",
      message: "更改未能保存到此设备。请检查浏览器存储空间或隐私设置后重试。",
    });
    return false;
  }
}

export function removeStorageItem(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    reportStorageIssue({
      action: "remove",
      message: "本地数据未能删除。请检查浏览器存储权限后重试。",
    });
    return false;
  }
}
