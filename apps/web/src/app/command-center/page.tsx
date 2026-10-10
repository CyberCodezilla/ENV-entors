'use client';

import React, { useMemo, useState } from 'react';
type GlyphProps = { size?: number; style?: React.CSSProperties };
const glyph = (mark: string) => function Glyph({ size = 16, style }: GlyphProps) { return <span aria-hidden="true" style={{ display: 'inline-block', width: size, fontSize: size, lineHeight: 1, textAlign: 'center', ...style }}>{mark}</span>; };
const Activity = glyph('â—‰'); const AlertTriangle = glyph('â–³'); const ArrowDownRight = glyph('â†˜'); const ArrowUpRight = glyph('â†—');
const CheckCircle2 = glyph('âœ“'); const Clock3 = glyph('â—·'); const CloudRain = glyph('â˜‚'); const Flame = glyph('â™¨');
const GitBranch = glyph('â‘‚'); const MapPin = glyph('âŒ–'); const ShieldCheck = glyph('â¬¡'); const Siren = glyph('!');
const WifiOff = glyph('Ã—'); const Zap = glyph('âš¡');

type ScenarioId = 'cloudburst' | 'heat' | 'blocked-road' | 'compound';
type Scenario = { id: ScenarioId; title: string; description: string; rainfallMm: number; apparentTempC: number; blockedRoads: number; unavailableShelters: number; exposedPeople: number; };

const scenarios: Scenario[] = [
  { id: 'cloudburst', title: 'Sudden cloudburst', description: 'Intense rainfall and waterlogging near low-lying road segments.', rainfallMm: 32, apparentTempC: 29, blockedRoads: 2, unavailableShelters: 0, exposedPeople: 1800 },
  { id: 'heat', title: 'Extreme heat', description: 'Heat stress increases while cooling capacity is constrained.', rainfallMm: 0, apparentTempC: 42, blockedRoads: 0, unavailableShelters: 1, exposedPeople: 2400 },
  { id: 'blocked-road', title: 'Blocked road', description: 'A key road segment is unavailable; access must be reassessed.', rainfallMm: 8, apparentTempC: 34, blockedRoads: 1, unavailableShelters: 0, exposedPeople: 950 },
  { id: 'compound', title: 'Compound emergency', description: 'Residual flooding overlaps with extreme heat and reduced shelter capacity.', rainfallMm: 18, apparentTempC: 39, blockedRoads: 3, unavailableShelters: 1, exposedPeople: 3100 },
];

function assess(s: Scenario, failMl: boolean) {
  const flood = Math.min(100, Math.round(s.rainfallMm * 2.4 + s.blockedRoads * 12));
  const heat = Math.min(100, Math.max(0, Math.round((s.apparentTempC - 22) * 4.4)));
  const combined = Math.min(100, Math.round(flood * 0.55 + heat * 0.45 + s.unavailableShelters * 8));
  const level = combined >= 75 ? 'CRITICAL' : combined >= 55 ? 'HIGH' : combined >= 30 ? 'MODERATE' : 'LOW';
  const actions = [
    { title: 'Verify blocked segments and refresh route status', reason: `${s.blockedRoads} blocked-road assumption(s) are included; verification prevents stale routes from being treated as available.`, priority: 1 },
    { title: s.apparentTempC >= 36 ? 'Prioritize exposed people and cooling access' : 'Prioritize low-lying areas and drainage access', reason: s.apparentTempC >= 36 ? `Apparent temperature is ${s.apparentTempC}Â°C in this simulation.` : `Rainfall input is ${s.rainfallMm} mm in this simulation.`, priority: 2 },
    { title: 'Request human review before issuing public guidance', reason: 'Scenario inputs are simulated and do not confirm real road or shelter status.', priority: 3 },
  ];
  return { flood, heat, combined, level, actions, degraded: failMl, engine: failMl ? 'Deterministic rules (ML unavailable)' : 'Deterministic rules + optional ML advisory slot' };
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="cc-metric"><div className="cc-muted">{label}</div><div className="cc-value">{value}</div><div className="cc-hint">{hint}</div></div>;
}

export default function CommandCenterPage() {
  const [selected, setSelected] = useState<ScenarioId>('cloudburst');
  const [failureMode, setFailureMode] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; title: string; time: string; level: string; persisted?: boolean }>>([]);
  const [running, setRunning] = useState(false);
  const [backendState, setBackendState] = useState<'checking'|'connected'|'offline'>('checking');
  const [serverResult, setServerResult] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const scenario = scenarios.find(s => s.id === selected) ?? scenarios[0];
  const before = useMemo(() => assess({ ...scenario, rainfallMm: Math.max(0, scenario.rainfallMm * 0.35), apparentTempC: Math.max(22, scenario.apparentTempC - 5), blockedRoads: 0, unavailableShelters: 0 }, false), [scenario]);
  type Action = { priority: number; title: string; reason: string };
  type Assessment = { flood: number; heat: number; combined: number; level: string; actions: Action[]; degraded: boolean; engine: string };
  const after = useMemo<Assessment>(() => {
    if (serverResult?.indices) return { flood: serverResult.indices.flood, heat: serverResult.indices.heat, combined: serverResult.indices.composite, level: serverResult.indices.level, actions: (serverResult.recommendations ?? []).map((a: any) => ({ priority: a.priority, title: a.action, reason: a.rationale })), degraded: !!serverResult.degraded, engine: serverResult.engine };
    return assess(scenario, failureMode);
  }, [scenario, failureMode, serverResult]);

  async function runScenario() {
    setRunning(true); setNotice('');
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const payload = { scenarioId: scenario.id, rainfallMm: scenario.rainfallMm, apparentTempC: scenario.apparentTempC, blockedRoads: scenario.blockedRoads, unavailableShelters: scenario.unavailableShelters, exposedPeople: scenario.exposedPeople, forceDegraded: failureMode };
    try {
      if (!baseUrl) throw new Error('API base URL is not configured');
      const response = await fetch(`${baseUrl}/scenarios/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`Scenario API returned ${response.status}`);
      const data = await response.json(); setServerResult(data); setBackendState('connected');
      const entry = { id: data.traceId, title: scenario.title, time: new Date(data.generatedAt).toLocaleTimeString(), level: data.indices?.level ?? after.level, persisted: data.audit?.persisted === true };
      setHistory(prev => [entry, ...prev.filter(item => item.id !== entry.id)].slice(0, 8));
      setNotice(`Backend scenario assessed. ${entry.persisted ? 'Audit record persisted.' : 'Audit persistence unavailable; this result is not durably recorded.'} Human review required.`);
    } catch (error) {
      setBackendState('offline'); setServerResult(null);
      const entry = { id: `local-${Date.now()}`, title: scenario.title, time: new Date().toLocaleTimeString(), level: after.level, persisted: false };
      setHistory(prev => [entry, ...prev].slice(0, 8));
      setNotice(`Backend unavailable (${error instanceof Error ? error.message : 'unknown error'}). Local deterministic fallback used; no durable audit was written.`);
    } finally { setRunning(false); }
  }

  React.useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    if (!baseUrl) { setBackendState('offline'); return; }
    fetch(`${baseUrl}/health`).then(r => { if (!r.ok) throw new Error('health check failed'); setBackendState('connected'); }).catch(() => setBackendState('offline'));
    fetch(`${baseUrl}/scenarios/history`).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      const rows = Array.isArray(data.runs) ? data.runs : [];
      setHistory(rows.map((row: any) => ({ id: row.runId, title: row.scenarioId, time: new Date(row.generatedAt).toLocaleTimeString(), level: row.indices?.level ?? 'RECORDED', persisted: true })));
    }).catch(() => undefined);
  }, []);

  return (
    <main className="cc-shell">
      <style jsx global>{`
        .cc-shell{min-height:100vh;background:#07111e;color:#eaf2ff;padding:24px;font-family:Arial,system-ui,sans-serif}
        .cc-wrap{max-width:1180px;margin:0 auto}.cc-top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px}
        .cc-brand{display:flex;align-items:center;gap:12px}.cc-logo{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0e9f9a,#f59e0b);color:#06111c}
        .cc-eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5eead4;font-weight:800}.cc-title{font-size:clamp(24px,4vw,38px);line-height:1.1;margin:5px 0}.cc-sub{color:#9bb0c9;font-size:14px;max-width:720px;line-height:1.5}
        .cc-pill{border:1px solid #31516a;background:#102437;color:#bcebe7;border-radius:999px;padding:8px 12px;font-size:12px;display:flex;gap:7px;align-items:center}
        .cc-grid{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px}.cc-card{border:1px solid #233a50;background:#0c1a2a;border-radius:16px;padding:18px;box-shadow:0 14px 35px #0002}
        .cc-card h2{font-size:15px;margin:0 0 14px}.cc-muted{color:#9bb0c9;font-size:12px}.cc-select{display:flex;flex-direction:column;gap:8px}
        .cc-option{background:#0a1624;border:1px solid #2a4055;color:#eaf2ff;border-radius:12px;padding:12px;text-align:left;cursor:pointer}
        .cc-option[aria-pressed=true]{border-color:#2dd4bf;background:#0d2a34;box-shadow:inset 3px 0 #2dd4bf}.cc-option strong{display:block;font-size:13px;margin-bottom:5px}.cc-option span{font-size:12px;line-height:1.4;color:#9bb0c9;display:block}
        .cc-btn{width:100%;border:0;border-radius:10px;background:#2dd4bf;color:#042027;font-weight:800;padding:12px;margin-top:14px;cursor:pointer}.cc-btn:disabled{opacity:.6;cursor:wait}
        .cc-secondary{width:100%;border:1px solid #365168;border-radius:10px;background:#102437;color:#d9e9f9;padding:10px;margin-top:8px;cursor:pointer}
        .cc-main-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cc-metric{background:#0a1624;border:1px solid #233a50;border-radius:12px;padding:13px}.cc-value{font-size:25px;font-weight:800;margin:7px 0}.cc-hint{font-size:11px;color:#8da7c2;line-height:1.4}
        .cc-risk{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.06em;background:#48220e;color:#fdba74;border:1px solid #854d0e}
        .cc-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.cc-compare-box{border:1px solid #233a50;background:#0a1624;border-radius:12px;padding:14px}.cc-bar{height:8px;border-radius:999px;background:#172b3d;overflow:hidden;margin:9px 0}.cc-bar span{height:100%;display:block;border-radius:999px;background:linear-gradient(90deg,#2dd4bf,#f59e0b,#fb7185)}
        .cc-list{display:flex;flex-direction:column;gap:10px}.cc-action{display:flex;gap:10px;border:1px solid #233a50;background:#0a1624;border-radius:12px;padding:12px}.cc-num{flex:0 0 28px;height:28px;display:grid;place-items:center;background:#123d45;color:#5eead4;border-radius:8px;font-weight:800}
        .cc-alert{display:flex;gap:8px;align-items:flex-start;background:#2b2111;border:1px solid #77521a;color:#f9d49a;border-radius:10px;padding:11px;font-size:12px;line-height:1.5;margin:14px 0}
        .cc-audit{font-family:ui-monospace,monospace;font-size:11px;color:#9bb0c9;line-height:1.8}.cc-footer{color:#7890a8;font-size:11px;margin:18px 0 4px;line-height:1.5}
        @media(max-width:850px){.cc-grid{grid-template-columns:1fr}.cc-main-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cc-shell{padding:14px}.cc-compare{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <div className="cc-wrap">
        <header className="cc-top">
          <div className="cc-brand">
            <div className="cc-logo"><ShieldCheck size={25}/></div>
            <div><div className="cc-eyebrow">ENV-entors Â· Innovation Lab</div><h1 className="cc-title">Disaster Response Command Center</h1><div className="cc-sub">Explore how a hazard changes exposure and response priorities. This additive module does not replace the existing HeatFlood Guardian map or route analysis.</div></div>
          </div>
          <div className="cc-pill"><Activity size={15}/> SIMULATION MODE Â· NOT LIVE GUIDANCE Â· API {backendState.toUpperCase()}</div>
        </header>

        <div className="cc-grid">
          <aside className="cc-card">
            <h2><GitBranch size={16} style={{display:'inline',verticalAlign:'-3px',marginRight:7}}/>Scenario controls</h2>
            <div className="cc-select">
              {scenarios.map(s => <button key={s.id} className="cc-option" aria-pressed={selected===s.id} onClick={()=>{setSelected(s.id);setNotice('');setServerResult(null)}}><strong>{s.title}</strong><span>{s.description}</span></button>)}
            </div>
            <button className="cc-btn" onClick={runScenario} disabled={running} aria-busy={running}><Zap size={15} style={{display:'inline',verticalAlign:'-3px',marginRight:6}}/>{running ? 'Assessingâ€¦' : 'Run scenario assessment'}</button>
            <button className="cc-secondary" onClick={()=>{setFailureMode(v=>!v);setServerResult(null)}}>{failureMode ? 'Disable failure injection' : 'Simulate ML advisory outage'}</button>
            {failureMode && <div className="cc-alert"><WifiOff size={16}/>ML advisory is marked unavailable. The deterministic scenario engine continues and flags the degraded mode.</div>}
            {notice && <div className="cc-alert" role="status"><CheckCircle2 size={16}/>{notice}</div>}
            <div className="cc-footer">Scenario parameters are synthetic and are not observations from an emergency authority.</div>
          </aside>

          <section className="cc-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
              <div><div className="cc-eyebrow">Impact assessment</div><h2 style={{fontSize:21,margin:'5px 0'}}>{scenario.title}</h2><div className="cc-muted">{scenario.description}</div></div>
              <span className="cc-risk">{after.level} SIMULATED RISK</span>
            </div>

            <div className="cc-main-grid" style={{marginTop:16}}>
              <Metric label="Flood index" value={`${after.flood}/100`} hint={`${scenario.rainfallMm} mm/h scenario input`}/>
              <Metric label="Heat index" value={`${after.heat}/100`} hint={`${scenario.apparentTempC}Â°C apparent-temp input`}/>
              <Metric label="Exposed people" value={scenario.exposedPeople.toLocaleString()} hint="Synthetic planning estimate"/>
              <Metric label="Blocked roads" value={`${scenario.blockedRoads}`} hint="Assumed for this scenario"/>
            </div>

            <div className="cc-compare">
              <div className="cc-compare-box"><div className="cc-muted">Baseline composite index</div><div className="cc-value">{before.combined}/100</div><div className="cc-bar"><span style={{width:`${before.combined}%`}}/></div><div className="cc-hint">Baseline is a synthetic comparison, not a measured current state.</div></div>
              <div className="cc-compare-box"><div className="cc-muted">Scenario composite index</div><div className="cc-value">{after.combined}/100</div><div className="cc-bar"><span style={{width:`${after.combined}%`}}/></div><div className="cc-hint">{after.combined >= before.combined ? <ArrowUpRight size={13} style={{display:'inline',verticalAlign:'-2px'}}/> : <ArrowDownRight size={13} style={{display:'inline',verticalAlign:'-2px'}}/>} {Math.abs(after.combined-before.combined)} point difference from baseline</div></div>
            </div>

            <div className="cc-alert"><AlertTriangle size={16}/><div><strong>Human review required.</strong> Road closures, shelter capacity, population estimates, and hazard values are simulated. Do not use this output for real-world routing, dispatch, or public safety instructions.</div></div>

            <h2 style={{marginTop:20}}><Siren size={16} style={{display:'inline',verticalAlign:'-3px',marginRight:7}}/>Ranked response brief</h2>
            <div className="cc-list">
              {after.actions.map(a => <div className="cc-action" key={a.priority}><div className="cc-num">{a.priority}</div><div><strong style={{fontSize:13}}>{a.title}</strong><div className="cc-muted" style={{marginTop:5,lineHeight:1.5}}>{a.reason}</div></div></div>)}
            </div>

            <h2 style={{marginTop:20}}><ShieldCheck size={16} style={{display:'inline',verticalAlign:'-3px',marginRight:7}}/>Evidence, uncertainty & provenance</h2>
            <div className="cc-compare">
              <div className="cc-compare-box"><div className="cc-muted">Input provenance</div><div className="cc-audit">Rainfall: synthetic scenario input<br/>Apparent temperature: synthetic input<br/>Road closures: simulated assumptions<br/>Exposure count: illustrative estimate</div></div>
              <div className="cc-compare-box"><div className="cc-muted">Processing trace</div><div className="cc-audit">Engine: {serverResult?.engine ?? after.engine}<br/>Scenario ID: {scenario.id}<br/>Generated: {serverResult?.generatedAt ?? 'local simulation'}<br/>Trace ID: {serverResult?.traceId ?? 'local-only'}<br/>Audit persisted: {serverResult?.audit?.persisted ? 'yes' : 'no'}</div></div>
            </div>
            {after.degraded && <div className="cc-alert"><WifiOff size={16}/>Degraded mode demonstrated: ML advisory is unavailable. This page's deterministic simulator still produces a clearly labelled response brief.</div>}
          </section>
        </div>

        <section className="cc-card" style={{marginTop:16}}>
          <h2><Clock3 size={16} style={{display:'inline',verticalAlign:'-3px',marginRight:7}}/>Session audit history</h2>
          {history.length===0 ? <div className="cc-muted">No recorded scenarios found. Run a scenario to create a record when the backend is available.</div> : <div className="cc-list">{history.map(h=><div className="cc-action" key={h.id}><div className="cc-num"><Clock3 size={14}/></div><div><strong style={{fontSize:13}}>{h.title}</strong><div className="cc-muted">{h.time} Â· {h.level} Â· {h.id}</div></div></div>)}</div>}
          <div className="cc-footer">Only entries marked persisted were saved to DynamoDB. Local fallback entries exist in browser memory only and are not durable audit records.</div>
        </section>
        <div className="cc-footer" style={{textAlign:'center'}}>ENV-entors Innovation Add-on Â· Existing route analysis and replay theater remain unchanged.</div>
      </div>
    </main>
  );
}

