import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  Cable,
  Cpu,
  FolderOpen,
  Gauge,
  History,
  Layers3,
  Settings,
  Sparkles,
  Workflow,
} from "lucide-react";
import { getApiBase, setApiBase } from "./services/config";
import { getDashboard, getHealth, type DataSource } from "./services/adapters";

type Page = "dashboard" | "worlds" | "scenes" | "bridge" | "operations" | "ai" | "providers" | "settings";

const nav: Array<{ id: Page; label: string; icon: typeof Gauge }> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "worlds", label: "Worlds & Scenes", icon: Layers3 },
  { id: "scenes", label: "Scene Inspector", icon: Boxes },
  { id: "bridge", label: "Unity Bridge", icon: Cable },
  { id: "operations", label: "Operations", icon: History },
  { id: "ai", label: "AI / Generation", icon: Sparkles },
  { id: "providers", label: "Providers", icon: Workflow },
  { id: "settings", label: "Settings", icon: Settings },
];

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [useApi, setUseApi] = useState(false);
  const [source, setSource] = useState<DataSource>("mock");
  const [apiBase, setApiBaseState] = useState(getApiBase());
  const [health, setHealth] = useState("Mock API");
  const [metrics, setMetrics] = useState({ worlds: 4, scenes: 4, bridge: "connected", generations: 14 });

  useEffect(() => {
    getDashboard(useApi).then(({ data, source: nextSource }) => {
      setMetrics(data);
      setSource(nextSource);
    });
    getHealth(useApi).then((result) => setHealth(result.detail));
  }, [useApi]);

  const saveApi = () => {
    setApiBase(apiBase);
    void getHealth(true).then((result) => setHealth(result.detail));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">◉</div><div><strong>Metaverse Creator</strong><span>COCKPIT</span></div></div>
        <div className="nav-title">NAVIGATION</div>
        <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "nav-item active" : "nav-item"} onClick={() => setPage(id)}><Icon size={16} />{label}</button>)}</nav>
        <div className="source-card"><span className={source === "api" ? "status-dot live" : "status-dot"} />{source === "api" ? "LIVE API" : "MOCK DATA"}<small>{health}</small></div>
      </aside>

      <main className="main">
        <header className="topbar"><div><span className="eyebrow">METAVERSE CREATOR</span><h1>{nav.find((item) => item.id === page)?.label}</h1></div><div className="toolbar"><button className="mode" onClick={() => setUseApi((value) => !value)}>{useApi ? "LIVE API" : "MOCK DATA"}</button><button className="primary" onClick={() => setPage("scenes")}>Open library →</button></div></header>

        {page === "dashboard" && <Dashboard metrics={metrics} />}
        {page !== "dashboard" && page !== "settings" && <Workspace page={page} />}
        {page === "settings" && <SettingsPanel apiBase={apiBase} setApiBase={setApiBaseState} saveApi={saveApi} useApi={useApi} setUseApi={setUseApi} />}
      </main>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <section className="metric"><span className="eyebrow">{label}</span><strong>{value}</strong>{hint !== undefined && <small>{hint}</small>}</section>;
}

function Dashboard({ metrics }: { metrics: { worlds: number; scenes: number; bridge: string; generations: number } }) {
  return <div className="content"><div className="metrics"><MetricCard label="WORLDS" value={metrics.worlds} hint="Registered projects" /><MetricCard label="SCENES" value={metrics.scenes} hint="Across all worlds" /><MetricCard label="ENGINE BRIDGE" value={metrics.bridge.toUpperCase()} hint="Unity link state" /><MetricCard label="GENERATIONS TODAY" value={metrics.generations} hint="AI pipeline throughput" /></div><div className="grid"><section className="panel chart"><div className="panel-head"><span>ACTIVITY</span><Activity size={16} /></div><h2>Scene edits vs generations</h2><div className="chart-lines"><i /><i /><i /><i /></div></section><section className="panel"><div className="panel-head"><span>RECENT OPERATIONS</span><History size={16} /></div>{["scene.publish", "asset.import", "bridge.sync", "scene.bake.lighting", "world.build"].map((item, index) => <div className="operation" key={item}><span>{item}<small>{index % 2 ? "Expo Floor" : "Main Atrium"}</small></span><b className={index === 4 ? "bad" : index < 2 ? "warn" : "good"}>{index === 0 ? "RUNNING" : index === 1 ? "QUEUED" : index === 4 ? "FAILED" : "SUCCEEDED"}</b></div>)}</section></div></div>;
}

function Workspace({ page }: { page: Page }) {
  const data: Record<Exclude<Page, "dashboard" | "settings">, { title: string; description: string }> = {
    worlds: { title: "Worlds & Scenes", description: "Organize worlds and inspect their scene graph." },
    scenes: { title: "Scene Inspector", description: "Inspect and prepare operations against the active scene." },
    bridge: { title: "Unity Bridge", description: "Monitor the configurable Unity connection and protocol." },
    operations: { title: "Operations", description: "Review scene, asset and synchronization operations." },
    ai: { title: "AI / Generation", description: "Prepare creative intents for the configured generation pipeline." },
    providers: { title: "Providers", description: "External capabilities are adapters, not hard-coded vendors." },
  };
  const current = data[page as Exclude<Page, "dashboard" | "settings">];
  return <div className="content"><section className="hero panel"><Cpu size={24} /><div><h2>{current.title}</h2><p>{current.description}</p></div></section><section className="panel empty"><FolderOpen size={28} /><strong>Ready for live adapters</strong><span>Mock data stays isolated until the Hono API exposes the matching contract.</span></section></div>;
}

function SettingsPanel({ apiBase, setApiBase: setValue, saveApi, useApi, setUseApi }: { apiBase: string; setApiBase: (value: string) => void; saveApi: () => void; useApi: boolean; setUseApi: (value: boolean) => void }) {
  return <div className="content"><section className="panel settings"><span className="eyebrow">CONNECTION</span><h2>Backend API</h2><p>Configure the Hono endpoint without embedding secrets or providers in the UI.</p><label>API base URL<input value={apiBase} onChange={(event) => setValue(event.target.value)} /></label><div className="actions"><button className="primary" onClick={saveApi}>Save & test</button><button className="secondary" onClick={() => setUseApi(!useApi)}>{useApi ? "Use mock data" : "Use live API"}</button></div></section></div>;
}
