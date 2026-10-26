import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PARAMS, INITIAL_MODELS, STAGES, USERS, makeStageResult, rng } from './mock.js';
import { API_URL, api } from './api.js';

const Ctx = createContext(null);
export const useConsole = () => useContext(Ctx);

let seq = 1;
const nid = (p) => `${p}-${String(seq++).padStart(3, '0')}`;
const fmtVer = (kind, models) => {
  const n = models.filter((m) => m.kind === kind).length;
  return kind === 'als' ? `als-v1.1.${n}` : `lgb-v2.3.${n}`;
};

export function ConsoleProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([
    { id: 'l0', t: Date.now() - 5000, level: 'INFO', src: 'system', msg: API_URL ? `Connected to backend ${API_URL}` : 'Running in demo mode (simulated backend). Set VITE_API_URL to connect a real one.' },
  ]);
  const [models, setModels] = useState(INITIAL_MODELS);
  const [runs, setRuns] = useState([]);
  const timers = useRef(new Map());
  const modelsRef = useRef(models);
  modelsRef.current = models;

  const log = useCallback((jobId, src, level, msg) => {
    const entry = { id: nid('l'), t: Date.now(), level, src, msg, jobId };
    setLogs((l) => [...l.slice(-1500), entry]);
    setJobs((js) => js.map((j) => (j.id === jobId ? { ...j, logs: [...j.logs, entry] } : j)));
  }, []);

  const patch = useCallback((jobId, fn) => setJobs((js) => js.map((j) => (j.id === jobId ? fn(j) : j))), []);

  const later = (jobId, ms, fn) => {
    const t = setTimeout(fn, ms);
    const set = timers.current.get(jobId) || new Set();
    set.add(t);
    timers.current.set(jobId, set);
  };

  const finish = useCallback((jobId, status = 'done') => {
    patch(jobId, (j) => ({ ...j, status, progress: status === 'done' ? 100 : j.progress, endedAt: Date.now() }));
  }, [patch]);

  const cancel = useCallback((jobId) => {
    (timers.current.get(jobId) || []).forEach(clearTimeout);
    timers.current.delete(jobId);
    log(jobId, 'system', 'WARN', 'Job cancelled by admin');
    finish(jobId, 'cancelled');
  }, [finish, log]);

  // ---------- training ----------
  const startTraining = useCallback(async (kind, params) => {
    const id = nid(kind);
    const title = kind === 'als' ? 'ALS matrix factorization training' : 'LightGBM LambdaMART training';
    const job = { id, kind, title, status: 'running', progress: 0, startedAt: Date.now(), params, series: [], logs: [] };
    setJobs((js) => [job, ...js]);
    const src = kind === 'als' ? 'train.als' : 'train.lgb';
    if (API_URL) return api.startTraining(kind, params, { id, patch, log, finish, setModels });

    const rand = rng(Date.now() % 100000);
    const total = kind === 'als' ? params.iterations : Math.round(params.rounds / 20);
    log(id, src, 'INFO', `Loading feature store fs-412 (1,244,990 interactions, 47,320 items)`);
    log(id, src, 'INFO', kind === 'als' ? `Building sparse user-item matrix, confidence alpha=${params.alpha}` : `Building ranking groups (query = user), ${params.leaves} leaves, lr=${params.lr}`);
    let step = 0;
    const tick = () => {
      step += 1;
      const p = step / total;
      let point;
      if (kind === 'als') {
        point = { step, loss: +(1.9 * Math.exp(-2.6 * p) + 0.42 + rand() * 0.012).toFixed(4), rmse: +(1.25 * Math.exp(-1.6 * p) + 0.88 + rand() * 0.006).toFixed(4), ndcg: +(0.32 * (1 - Math.exp(-3.4 * p)) + 0.02 + rand() * 0.004).toFixed(4) };
        log(id, src, 'INFO', `iter ${String(step).padStart(2, '0')}/${total}  loss=${point.loss}  rmse=${point.rmse}  ndcg@5=${point.ndcg}`);
      } else {
        point = { step: step * 20, train: +(0.48 * (1 - Math.exp(-3 * p)) + 0.1 + rand() * 0.004).toFixed(4), valid: +(0.43 * (1 - Math.exp(-3.4 * p)) + 0.07 + rand() * 0.006 - (p > 0.8 ? (p - 0.8) * 0.02 : 0)).toFixed(4) };
        log(id, src, 'INFO', `[${point.step}] train ndcg@5=${point.train}  valid ndcg@5=${point.valid}`);
      }
      patch(id, (j) => ({ ...j, progress: Math.round(p * 100), series: [...j.series, point] }));
      if (step < total) later(id, 520 + rand() * 260, tick);
      else {
        const last = point;
        later(id, 500, () => {
          const m = modelsRef.current;
          const version = fmtVer(kind, m);
          const metrics = kind === 'als' ? { ndcg: +last.ndcg, recall: +(last.ndcg * 0.68).toFixed(3), rmse: +last.rmse } : { ndcg: +last.valid, map: +(last.valid * 0.82).toFixed(3) };
          log(id, src, 'INFO', `Early-stop check passed. Evaluating on hold-out split…`);
          log(id, src, 'INFO', `Saved ${version} to model registry (${kind === 'als' ? 'factors.npz' : 'ranker.txt'})`);
          setModels((ms) => [...ms, { id: version, kind, trainedAt: Date.now(), active: false, durationS: Math.round((Date.now() - job.startedAt) / 1000), metrics, params }]);
          patch(id, (j) => ({ ...j, modelId: version }));
          finish(id, 'done');
        });
      }
    };
    later(id, 900, tick);
  }, [finish, log, patch]);

  // ---------- pipeline ----------
  const startPipeline = useCallback(async (opts = {}) => {
    const id = nid('run');
    const users = opts.users || USERS.length;
    const stages = Object.fromEntries(STAGES.map((s) => [s.id, { status: 'pending' }]));
    const job = { id, kind: 'pipeline', title: 'Recommendation pipeline run', status: 'running', progress: 0, startedAt: Date.now(), params: { users }, stages, current: null, logs: [], series: [] };
    setJobs((js) => [job, ...js]);
    if (API_URL) return api.startPipeline(opts, { id, patch, log, finish, setRuns });

    const rand = rng(Date.now() % 100000);
    const act = modelsRef.current;
    const ctx = { users, alsVersion: act.find((m) => m.kind === 'als' && m.active)?.id || 'none', lgbVersion: act.find((m) => m.kind === 'lgb' && m.active)?.id || 'none' };
    log(id, 'pipeline', 'INFO', `Run ${id} started for ${users} users. ALS=${ctx.alsVersion}, ranker=${ctx.lgbVersion} (loaded from disk, no retraining)`);
    let i = 0;
    const runStage = () => {
      const s = STAGES[i];
      const t0 = Date.now();
      patch(id, (j) => ({ ...j, current: s.id, stages: { ...j.stages, [s.id]: { status: 'running', startedAt: t0 } } }));
      log(id, `stage.${s.id}`, 'INFO', `${s.label}: started`);
      const dur = 1100 + rand() * 1500;
      later(id, dur * 0.5, () => log(id, `stage.${s.id}`, 'DEBUG', s.blurb + '…'));
      later(id, dur, () => {
        const res = makeStageResult(s.id, rand, ctx);
        const metricLine = Object.entries(res.metrics).slice(0, 3).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toLocaleString() : v}`).join('  ');
        log(id, `stage.${s.id}`, s.id === 'clean' ? 'WARN' : 'INFO', `${s.label}: done in ${(dur / 1000).toFixed(2)}s  ${metricLine}`);
        patch(id, (j) => ({ ...j, progress: Math.round(((i + 1) / STAGES.length) * 100), stages: { ...j.stages, [s.id]: { status: 'done', startedAt: t0, durationMs: Math.round(dur), ...res } } }));
        i += 1;
        if (i < STAGES.length) runStage();
        else {
          log(id, 'pipeline', 'INFO', `Run complete. ${users} users scored, top-5 with explanations written to recommendations store.`);
          setRuns((rs) => [{ id, at: Date.now(), users, durationS: Math.round((Date.now() - job.startedAt) / 1000), als: ctx.alsVersion, lgb: ctx.lgbVersion }, ...rs]);
          finish(id, 'done');
        }
      });
    };
    later(id, 500, runStage);
  }, [finish, log, patch]);

  const activate = useCallback((modelId) => {
    setModels((ms) => {
      const kind = ms.find((m) => m.id === modelId)?.kind;
      return ms.map((m) => (m.kind === kind ? { ...m, active: m.id === modelId } : m));
    });
    setLogs((l) => [...l, { id: nid('l'), t: Date.now(), level: 'INFO', src: 'registry', msg: `Promoted ${modelId} to active` }]);
  }, []);

  useEffect(() => () => timers.current.forEach((set) => set.forEach(clearTimeout)), []);

  const value = useMemo(() => ({ jobs, logs, models, runs, startTraining, startPipeline, cancel, activate, defaults: DEFAULT_PARAMS, demo: !API_URL }), [jobs, logs, models, runs, startTraining, startPipeline, cancel, activate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
