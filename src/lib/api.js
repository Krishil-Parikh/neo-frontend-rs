// Backend adapter. With no VITE_API_URL the console runs on the simulated backend in store.jsx.
// With VITE_API_URL set, these calls hit the real service. Expected contract (adjust to your backend):
//
//   POST /train/als        {factors, reg, iterations, alpha}  -> {job_id}
//   POST /train/lgb        {leaves, lr, rounds}               -> {job_id}
//   POST /pipeline/run     {users}                            -> {job_id}
//   GET  /jobs/:id         -> {status, progress, logs:[{level,src,msg,t}], series:[...],
//                              stages:{[stageId]:{status,durationMs,metrics,chart}}, model_id}
//   GET  /models           -> [{id, kind, active, trainedAt, metrics, params}]
//   POST /models/:id/activate
//   GET  /users            -> [{id, name, segment, history:[...], recs:[...]}]

export const API_URL = import.meta.env.VITE_API_URL || '';

async function http(path, opts = {}) {
  const res = await fetch(API_URL + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} failed: ${res.status}`);
  return res.json();
}

function poll(remoteId, h) {
  let seen = 0;
  const timer = setInterval(async () => {
    try {
      const d = await http(`/jobs/${remoteId}`);
      (d.logs || []).slice(seen).forEach((l) => h.log(h.id, l.src || 'backend', l.level || 'INFO', l.msg));
      seen = (d.logs || []).length;
      h.patch(h.id, (j) => ({ ...j, progress: d.progress ?? j.progress, series: d.series ?? j.series, stages: d.stages ? { ...j.stages, ...d.stages } : j.stages, current: d.current ?? j.current, modelId: d.model_id ?? j.modelId }));
      if (d.status === 'done' || d.status === 'failed') {
        clearInterval(timer);
        h.finish(h.id, d.status);
      }
    } catch (e) {
      h.log(h.id, 'console', 'ERROR', e.message);
      clearInterval(timer);
      h.finish(h.id, 'failed');
    }
  }, 1000);
}

export const api = {
  async startTraining(kind, params, h) {
    try {
      const { job_id } = await http(`/train/${kind}`, { method: 'POST', body: JSON.stringify(params) });
      poll(job_id, h);
    } catch (e) {
      h.log(h.id, 'console', 'ERROR', e.message);
      h.finish(h.id, 'failed');
    }
  },
  async startPipeline(opts, h) {
    try {
      const { job_id } = await http('/pipeline/run', { method: 'POST', body: JSON.stringify(opts) });
      poll(job_id, h);
    } catch (e) {
      h.log(h.id, 'console', 'ERROR', e.message);
      h.finish(h.id, 'failed');
    }
  },
};
