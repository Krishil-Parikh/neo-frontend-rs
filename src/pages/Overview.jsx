import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { useConsole } from '../lib/store.jsx';
import { CATEGORY_MIX, DAILY, STAGES, USERS } from '../lib/mock.js';
import { Badge, C, Card, ChartTip, Legend, Stat, StatusBadge, ago } from '../components/ui.jsx';

const axis = { stroke: '#9a9a9a', fontSize: 12, tickLine: false };

export default function Overview() {
  const { jobs, models, runs } = useConsole();
  const nav = useNavigate();
  const als = models.find((m) => m.kind === 'als' && m.active);
  const lgb = models.find((m) => m.kind === 'lgb' && m.active);
  const lastRun = jobs.find((j) => j.kind === 'pipeline' && j.status === 'done');
  const today = DAILY[DAILY.length - 1];
  const total = DAILY.reduce((a, d) => a + d.metadata + d.trending + d.als, 0);

  return (
    <>
      <div className="grid g4">
        <Stat hot label="Users with recommendations" value={USERS.length} delta={`${runs.length ? 'Updated just now' : 'From the last stored run'}`} />
        <Stat label="Recommendation requests, 30 days" value={total.toLocaleString()} delta="+12.4% vs previous 30 days" up />
        <Stat label="Median serve latency" value={`${today.latency} ms`} delta="Down from 215 ms a month ago" />
        <Stat label="Click-through rate" value={`${(today.ctr * 100).toFixed(1)}%`} delta="+0.9 pts in 30 days" up />
      </div>

      <Card dark title="Pipeline" sub={lastRun ? `Last full run finished ${ago(lastRun.endedAt)}` : 'Open Pipeline runs to start one'} actions={<Link to="/pipeline" className="btn sm" style={{ color: '#000' }}>Open pipeline</Link>}>
        <div className="ribbon" style={{ background: '#111' }}>
          {STAGES.map((s, i) => (
            <button key={s.id} className={`rib done ${i > 0 && STAGES[i - 1].group !== s.group ? 'group-sep' : ''}`} style={{ background: '#1f1f1f' }} onClick={() => nav('/pipeline')}>
              <b>{s.label}</b><span>{s.group}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid g-21">
        <Card title="Recommendations served by source" sub="Which engine supplied the final top 5, per day">
          <Legend items={[['ALS', C.red], ['Metadata', C.ink], ['Trending', C.mid]]} />
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={DAILY}>
              <CartesianGrid vertical={false} stroke={C.line} />
              <XAxis dataKey="day" {...axis} interval={4} />
              <YAxis {...axis} />
              <Tooltip content={<ChartTip />} />
              <Area dataKey="als" name="ALS" stackId="1" stroke={C.red} fill={C.red} fillOpacity={0.9} isAnimationActive={false} />
              <Area dataKey="metadata" name="Metadata" stackId="1" stroke={C.ink} fill={C.ink} fillOpacity={0.92} isAnimationActive={false} />
              <Area dataKey="trending" name="Trending" stackId="1" stroke={C.mid} fill={C.mid} fillOpacity={0.6} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Active models" sub="Loaded from disk by each pipeline run">
          {[als, lgb].map((m) => (
            <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row spread"><b className="mono">{m.id}</b><Badge kind="red">Active</Badge></div>
              <div className="muted" style={{ marginTop: 4 }}>{m.kind === 'als' ? 'ALS matrix factorization' : 'LambdaMART re-ranker'} · trained {ago(m.trainedAt)}</div>
              <div className="row" style={{ marginTop: 8, gap: 18 }}>
                <span>NDCG@5 <b className="num">{m.metrics.ndcg.toFixed(3)}</b></span>
                {m.metrics.recall && <span>Recall@20 <b className="num">{m.metrics.recall.toFixed(3)}</b></span>}
                {m.metrics.map && <span>MAP <b className="num">{m.metrics.map.toFixed(3)}</b></span>}
              </div>
            </div>
          ))}
          <Link to="/training" className="btn dark" style={{ marginTop: 14, textDecoration: 'none' }}>Train or switch models</Link>
        </Card>
      </div>

      <div className="grid g3">
        <Card title="Serve latency" sub="Median milliseconds per request">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={DAILY}>
              <CartesianGrid vertical={false} stroke={C.line} />
              <XAxis dataKey="day" {...axis} interval={7} />
              <YAxis {...axis} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTip fmt={(v) => v + ' ms'} />} />
              <Line dataKey="latency" name="Latency" stroke={C.ink} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Click-through rate" sub="Share of recommendations clicked">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={DAILY}>
              <CartesianGrid vertical={false} stroke={C.line} />
              <XAxis dataKey="day" {...axis} interval={7} />
              <YAxis {...axis} domain={['auto', 'auto']} tickFormatter={(v) => (v * 100).toFixed(1) + '%'} />
              <Tooltip content={<ChartTip fmt={(v) => (v * 100).toFixed(2) + '%'} />} />
              <Line dataKey="ctr" name="CTR" stroke={C.red} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Taste vs. what we recommend" sub="Category share across all users">
          <Legend items={[['Watched', C.ink], ['Recommended', C.red]]} />
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={CATEGORY_MIX} margin={{ right: 4 }}>
              <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10 }} angle={-40} textAnchor="end" height={64} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
              <Bar isAnimationActive={false} dataKey="history" name="Watched" fill={C.ink} radius={[3, 3, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="recs" name="Recommended" fill={C.red} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card flush title="Recent jobs" sub="Training and pipeline runs from this session">
        <table className="t">
          <thead><tr><th>Job</th><th>Type</th><th>Started</th><th>Status</th><th className="right">Progress</th></tr></thead>
          <tbody>
            {jobs.length === 0 && <tr><td colSpan={5} className="muted" style={{ padding: 24 }}>No jobs yet. Start a training or pipeline run and it will be listed here.</td></tr>}
            {jobs.slice(0, 8).map((j) => (
              <tr key={j.id}><td><b className="mono">{j.id}</b></td><td>{j.title}</td><td>{ago(j.startedAt)}</td><td><StatusBadge status={j.status} /></td><td className="right num">{j.progress}%</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
