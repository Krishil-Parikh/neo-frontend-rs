import React, { useEffect, useMemo, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { useConsole } from '../lib/store.jsx';
import { STAGES, USERS } from '../lib/mock.js';
import { Badge, Card, Empty, Field, LogConsole, Progress, StatusBadge, ago } from '../components/ui.jsx';
import StageChart from '../components/StageChart.jsx';

export default function Pipeline() {
  const { jobs, models, startPipeline, cancel } = useConsole();
  const runsJobs = jobs.filter((j) => j.kind === 'pipeline');
  const [runId, setRunId] = useState(null);
  const [stageId, setStageId] = useState('ingest');
  const [users, setUsers] = useState(USERS.length);
  const job = runsJobs.find((j) => j.id === runId) || runsJobs[0];
  const running = runsJobs.some((j) => j.status === 'running');

  // follow the running stage unless the admin picked one manually
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (job?.current && !pinned) setStageId(job.current);
  }, [job?.current, pinned]);

  const stage = job?.stages?.[stageId];
  const def = STAGES.find((s) => s.id === stageId);
  const lines = useMemo(() => (job ? job.logs.filter((l) => l.src === `stage.${stageId}` || (l.src === 'pipeline' && false)) : []), [job, stageId]);
  const als = models.find((m) => m.kind === 'als' && m.active);
  const lgb = models.find((m) => m.kind === 'lgb' && m.active);

  return (
    <>
      <div className="hero-banner">
        <div>
          <h3>Run the full recommendation pipeline</h3>
          <p>Uses the saved ALS model ({als?.id}) and ranker ({lgb?.id}). Nothing is retrained during a run. Every stage reports its own metrics and logs.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <Field label="Users to score">
              <input type="number" min={1} max={USERS.length} value={users} onChange={(e) => setUsers(Math.max(1, Math.min(USERS.length, +e.target.value || 1)))} style={{ width: 120, background: '#fff' }} />
            </Field>
          </div>
        </div>
        {running ? (
          <button className="btn lg" onClick={() => cancel(runsJobs.find((j) => j.status === 'running').id)}><Square size={16} />Cancel run</button>
        ) : (
          <button className="btn primary lg" onClick={() => { setPinned(false); setRunId(null); startPipeline({ users }); }}><Play size={16} />Run pipeline</button>
        )}
      </div>

      {!job ? (
        <Card><Empty title="No runs yet">Press “Run pipeline” to watch each stage execute.</Empty></Card>
      ) : (
        <>
          <div className="ribbon" role="tablist" aria-label="Pipeline stages">
            {STAGES.map((s, i) => {
              const st = job.stages[s.id];
              const sepBefore = i > 0 && STAGES[i - 1].group !== s.group;
              return (
                <button key={s.id} role="tab" aria-selected={stageId === s.id} className={`rib ${st?.status || ''} ${stageId === s.id ? 'sel' : ''} ${sepBefore ? 'group-sep' : ''}`} onClick={() => { setStageId(s.id); setPinned(true); }}>
                  <b>{s.label}</b>
                  <span>{st?.status === 'done' ? `${(st.durationMs / 1000).toFixed(1)}s` : st?.status === 'running' ? 'running' : 'waiting'}</span>
                </button>
              );
            })}
          </div>

          <div className="grid g-12">
            <div className="grid" style={{ alignContent: 'start' }}>
              <Card title="This run" sub={`${job.id} · started ${ago(job.startedAt)}`} actions={<StatusBadge status={job.status} />}>
                <Progress value={job.progress} />
                <div className="row spread" style={{ marginTop: 8 }}><span className="muted">{job.progress}% of stages complete</span><span className="muted num">{job.params.users} users</span></div>
              </Card>
              <Card flush title="Run history" sub="Select a run to inspect it">
                <table className="t">
                  <tbody>
                    {runsJobs.map((j) => (
                      <tr key={j.id} className={`clickable ${j.id === job.id ? 'sel' : ''}`} onClick={() => { setRunId(j.id); setPinned(false); }}>
                        <td><b>{j.id}</b><div className="muted" style={{ fontSize: 12 }}>{ago(j.startedAt)}</div></td>
                        <td className="right"><StatusBadge status={j.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="grid" style={{ alignContent: 'start' }}>
              <Card title={def.label} sub={def.blurb} actions={stage?.status === 'done' ? <Badge><Clock size={12} />{(stage.durationMs / 1000).toFixed(2)}s</Badge> : <StatusBadge status={stage?.status} />}>
                {stage?.status === 'done' ? (
                  <div className="grid" style={{ gap: 18 }}>
                    <div className="kv">
                      {Object.entries(stage.metrics).map(([k, v]) => (
                        <div key={k}><div className="k">{k}</div><div className="v">{typeof v === 'number' ? v.toLocaleString() : v}</div></div>
                      ))}
                    </div>
                    {stage.chart && (
                      <div>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>{stage.chart.title}</h4>
                        <StageChart spec={stage.chart} />
                      </div>
                    )}
                  </div>
                ) : (
                  <Empty title={stage?.status === 'running' ? 'Stage is running' : 'Waiting for this stage'}>Metrics and charts appear here as soon as the stage finishes.</Empty>
                )}
              </Card>
              <Card flush title="Stage logs" sub={`Output from ${def.label.toLowerCase()} only`}>
                <LogConsole lines={lines} height={190} running={stage?.status === 'running'} empty="This stage has not logged anything yet." />
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
