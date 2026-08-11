const STORAGE_KEY = "metaverse-creator.cockpit.api-base";

export function getApiBase(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "http://127.0.0.1:8787";
}

export function setApiBase(value: string): void {
  localStorage.setItem(STORAGE_KEY, value.replace(/\/$/, ""));
}
