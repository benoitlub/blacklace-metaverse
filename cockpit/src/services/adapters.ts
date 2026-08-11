import { apiFetch } from "./http";

export type DataSource = "mock" | "api";

export type DashboardData = {
  worlds: number;
  scenes: number;
  bridge: "connected" | "disconnected";
  generations: number;
};

const mockDashboard: DashboardData = {
  worlds: 4,
  scenes: 4,
  bridge: "connected",
  generations: 14,
};

export async function getDashboard(useApi: boolean): Promise<{ data: DashboardData; source: DataSource }> {
  if (!useApi) return { data: mockDashboard, source: "mock" };

  return { data: await apiFetch<DashboardData>("/metrics"), source: "api" };
}

export async function getHealth(useApi: boolean): Promise<{ ok: boolean; detail: string }> {
  if (!useApi) return { ok: true, detail: "Mock API" };

  try {
    await apiFetch("/health");
    return { ok: true, detail: "API reachable" };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Unreachable" };
  }
}
