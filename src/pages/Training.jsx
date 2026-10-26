import React, { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { Play, Square, CheckCircle2 } from 'lucide-react';
import { useConsole } from '../lib/store.jsx';
import { Badge, C, Card, ChartTip, Empty, Field, Legend, LogConsole, Progress, StatusBadge, ago } from '../components/ui.jsx';

const axis = { stroke: '#9a9a9a', fontSize: 12, tickLine: false };

const FIELDS = {
  als: [['factors', 'Latent factors', 8, 256, 1], ['reg', 'Regularization', 0.001, 1, 0.001], ['iterations', 'Iterations', 1, 50, 1], ['alpha', 'Confidence alpha', 1, 100, 1]],
  lgb: [['leaves', 'Num leaves', 4, 256, 1], ['lr', 'Learning rate', 0.005, 0.3, 0.005], ['rounds', 'Boosting rounds', 20, 2000, 20]],
};

function TrainerCard({ kind, title, sub, selected, onSelect }) {
  const { jobs, models, startTraining, cancel, defaults } = useConsole();
  const [p, setP] = useState(defaults[kind]);
  const mine = jobs.filter((j) => j.kind === kind);
  const live = mine.find((j) => j.status === 'running');
  const active = models.find((m) => m.kind === kind && m.active);
  return (
    <Card title={title} sub={sub} actions={<Badge kind="black">Active {active?.id}</Badge>}>
      <div className="params">
        {FIELDS[kind].map(([k, label, min, max, step]) => (
          <Field key={k} label={label}>
            <input type="number" min={min} max={max} step={step} value={p[k]} disabled={!!live} onChange={(e) => setP({ ...p, [k]: +e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        {live ? (
          <button className="btn lg" onClick={() => cancel(live.id)}><Square size={15} />Stop training</button>
        ) : (
          <button className="btn primary lg" onClick={() => { startTraining(kind, p); }}><Play size={15} />Train {kind === 'als' ? 'ALS' : 'LightGBM'}</button>
        )}
        {mine[0] && <button className={`btn ghost ${selected === mine[0].id ? '' : ''}`} onClick={() => onSelect(mine[0].id)}>View latest job</button>}
      </div>
      {live && <div style={{ marginTop: 14 }}><Progress value={live.progress} /><div className="muted" style={{ marginTop: 6 }}>{live.progress}% · started {ago(live.startedAt)}</div></div>}
    </Card>
  );
}

export default function Training() {
  const { jobs, models, activate } = useConsole();
  const trainJobs = jobs.filter((j) => j.kind === 'als' || j.kind === 'lgb');
  const [sel, setSel] = useState(null);
  const job = trainJobs.find((j) => j.id === sel) || trainJobs[0];
  const sorted = [...models].sort((a, b) => b.trainedAt - a.trainedAt);
  const hist = (kind) => models.filter((m) => m.kind === kind).sort((a, b) => a.trainedAt - b.trainedAt).map((m, i) => ({ name: m.id.split('-v')[1], ndcg: m.metrics.ndcg }));
  const importance = [['als_affinity', 412], ['category_match', 318], ['trend_velocity', 244], ['recency_boost', 201], ['cooccurrence', 176], ['item_popularity', 140], ['avg_rating', 118], ['user_activity', 71]].map(([n, v]) => ({ name: n.replace('_', ' '), value: v }));

  return (
    <>
      <div className="grid g2">
        <TrainerCard kind="als" title="ALS matrix factorization" sub="Learns user and item embeddings from the interaction matrix. Saved to disk and reused by every pipeline run." selected={job?.id} onSelect={setSel} />
        <TrainerCard kind="lgb" title="LightGBM LambdaMART re-ranker" sub="Learns to order pooled candidates per user. Saved to disk and reused by every pipeline run." selected={job?.id} onSelect={setSel} />
      </div>

      <div className="grid g-21">
        <Card flush title="Training console" sub={job ? `${job.title} · ${job.id}` : 'No job yet'} actions={job && <StatusBadge status={job.status} />}>
          <LogConsole lines={job?.logs || []} height={340} running={job?.status === 'running'} />
        </Card>
        <Card title="Learning curve" sub={job?.kind === 'lgb' ? 'NDCG@5 by boosting round' : job ? 'Loss and NDCG@5 by iteration' : ''}>
          {!job || job.series.length === 0 ? <Empty title="Nothing to plot yet">Curves stream in as soon as training starts.</Empty> : job.kind === 'als' ? (
            <>
              <Legend items={[['Loss', C.red], ['RMSE', C.mid, true], ['NDCG@5 (right)', C.ink]]} />
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={job.series}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="step" {...axis} />
                  <YAxis yAxisId="l" {...axis} domain={['auto', 'auto']} />
                  <YAxis yAxisId="r" orientation="right" {...axis} />
                  <Tooltip content={<ChartTip />} />
                  <Line yAxisId="l" dataKey="loss" name="Loss" stroke={C.red} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line yAxisId="l" dataKey="rmse" name="RMSE" stroke={C.mid} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  <Line yAxisId="r" dataKey="ndcg" name="NDCG@5" stroke={C.ink} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <Legend items={[['Train', C.ink], ['Validation', C.red]]} />
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={job.series}>
                  <CartesianGrid vertical={false} stroke={C.line} />
                  <XAxis dataKey="step" {...axis} />
                  <YAxis {...axis} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} />
                  <Line dataKey="train" name="Train" stroke={C.ink} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line dataKey="valid" name="Validation" stroke={C.red} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>
      </div>

      <div className="grid g-21">
        <Card flush title="Model registry" sub="Promote any saved version to be the one pipeline runs load">
          <table className="t">
            <thead><tr><th>Version</th><th>Type</th><th>Trained</th><th className="right">NDCG@5</th><th className="right">Duration</th><th /></tr></thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td><b className="mono">{m.id}</b></td>
                  <td>{m.kind === 'als' ? 'ALS' : 'LambdaMART'}</td>
                  <td>{ago(m.trainedAt)}</td>
                  <td className="right num">{m.metrics.ndcg.toFixed(3)}</td>
                  <td className="right num">{m.durationS}s</td>
                  <td className="right">{m.active ? <Badge kind="red"><CheckCircle2 size={12} />Active</Badge> : <button className="btn sm" onClick={() => activate(m.id)}>Make active</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Re-ranker feature importance" sub="Split gain in the active LambdaMART model">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={importance} layout="vertical" margin={{ right: 16 }}>
                <CartesianGrid horizontal={false} stroke={C.line} />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" width={104} {...axis} stroke={C.ink} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
                <Bar isAnimationActive={false} dataKey="value" name="Gain" fill={C.ink} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <Card title="Quality across versions" sub="NDCG@5 of each saved model, oldest to newest">
        <Legend items={[['ALS', C.ink], ['LambdaMART', C.red]]} />
        <div className="grid g2">
          {['als', 'lgb'].map((k) => (
            <ResponsiveContainer key={k} width="100%" height={180}>
              <LineChart data={hist(k)} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} stroke={C.line} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTip />} />
                <Line dataKey="ndcg" name={k === 'als' ? 'ALS NDCG@5' : 'LambdaMART NDCG@5'} stroke={k === 'als' ? C.ink : C.red} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ))}
        </div>
      </Card>
    </>
  );
}
