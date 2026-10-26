import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { CATEGORIES, FEATURE_LABEL, FEATURES, SOURCES, USERS, getItem, getUser } from '../lib/mock.js';
import { Badge, C, Card, ChartTip, Empty, Legend, Stat } from '../components/ui.jsx';

const axis = { stroke: '#9a9a9a', fontSize: 12, tickLine: false };

const Stars = ({ n }) => <span className="stars" aria-label={`${n} of 5`}>{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;

export default function UserDetail() {
  const { userId } = useParams();
  const nav = useNavigate();
  const user = getUser(userId);
  const [hover, setHover] = useState(null);
  const [open, setOpen] = useState(0);

  const idx = USERS.findIndex((u) => u.id === userId);
  const affinity = useMemo(() => {
    if (!user) return [];
    return CATEGORIES.map((c) => ({
      name: c,
      history: user.history.filter((h) => getItem(h.itemId).category === c).length,
      recs: user.recs.filter((r) => getItem(r.itemId).category === c).length * 3,
    }));
  }, [user]);

  if (!user) return <Card><Empty title="User not found">That ID is not in the current recommendations.</Empty></Card>;

  const timeline = user.history.map((h) => ({ x: -h.daysAgo, y: h.rating, name: getItem(h.itemId).title, cat: getItem(h.itemId).category }));
  const anchorIds = new Set(user.recs.map((r) => r.anchorItemId).filter(Boolean));
  const hoverAnchor = hover != null ? user.recs.find((r) => r.itemId === hover)?.anchorItemId : null;
  const srcCount = (s) => user.recs.filter((r) => r.sources.includes(s)).length;
  const sel = user.recs[open];

  return (
    <>
      <div className="row spread">
        <Link to="/recommendations" className="btn ghost sm" style={{ textDecoration: 'none' }}><ArrowLeft size={14} />All users</Link>
        <div className="row">
          <button className="btn ghost sm" disabled={idx <= 0} onClick={() => nav(`/recommendations/${USERS[idx - 1].id}`)}><ChevronLeft size={14} />Previous user</button>
          <button className="btn ghost sm" disabled={idx >= USERS.length - 1} onClick={() => nav(`/recommendations/${USERS[idx + 1].id}`)}>Next user<ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="grid g4">
        <div className="stat hot"><div className="label">{user.id}</div><div className="value" style={{ fontSize: 26 }}>{user.name}</div><div className="delta">{user.segment}</div></div>
        <Stat label="Items in history" value={user.history.length} delta={`Avg rating ${(user.history.reduce((a, h) => a + h.rating, 0) / user.history.length).toFixed(1)}`} />
        <Stat label="Candidates considered" value={user.candidateCount} delta={`${user.pooledCount} after dedupe → 5 shown`} />
        <Stat label="Sources in the final 5" value={`${srcCount('als')} / ${srcCount('metadata')} / ${srcCount('trending')}`} delta="ALS / Metadata / Trending" />
      </div>

      <div className="split">
        <Card flush title="What they watched" sub={`${user.history.length} items, newest first. Highlighted rows are the evidence behind a recommendation.`}>
          <div style={{ maxHeight: 640, overflow: 'auto', marginTop: 12 }}>
            {user.history.map((h) => {
              const it = getItem(h.itemId);
              const hl = hoverAnchor === h.itemId;
              return (
                <div key={h.itemId} className={`hist-item ${hl ? 'hl' : ''}`}>
                  <div className="when num">{h.daysAgo === 0 ? 'today' : `${h.daysAgo}d`}</div>
                  <div>
                    <div className="t">{it.title} {anchorIds.has(h.itemId) && <Badge kind="soft">Used as evidence</Badge>}</div>
                    <div className="meta"><span className={`cat-tag ${user.favs.includes(it.category) ? 'fav' : ''}`}>{it.category}</span> · {it.year} · watched {h.watchPct}%</div>
                  </div>
                  <Stars n={h.rating} />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="split-mid" aria-hidden><ArrowRight size={30} /></div>

        <Card flush title="What we recommended" sub="Final top 5 from the LambdaMART re-ranker. Hover a card to see the history it relies on.">
          {user.recs.map((r, i) => {
            const it = getItem(r.itemId);
            const anchor = r.anchorItemId && getItem(r.anchorItemId);
            const maxC = Math.max(...Object.values(r.contributions));
            const moved = r.preRank - r.rank;
            return (
              <div className="rec" key={r.itemId} onMouseEnter={() => setHover(r.itemId)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.itemId)}>
                <div className="rec-top">
                  <div className="rank">{r.rank}</div>
                  <div>
                    <h4>{it.title}</h4>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span className="cat-tag">{it.category}</span><span className="muted">{it.year}</span>
                      {r.sources.map((s) => <span key={s} className={`src-pill ${s}`}>{SOURCES[s]}</span>)}
                      {moved !== 0 && <Badge kind={moved > 0 ? 'soft' : ''}><TrendingUp size={11} style={{ transform: moved < 0 ? 'scaleY(-1)' : 'none' }} />{moved > 0 ? `Moved up ${moved}` : `Moved down ${-moved}`} in re-rank</Badge>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}><div className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24 }}>{r.score.toFixed(2)}</div><div className="muted" style={{ fontSize: 12 }}>re-rank score</div></div>
                </div>
                <p className="why"><b>Why: </b>{r.explanation}{anchor && <> <button onClick={() => setHover(r.itemId)}>See “{anchor.title}”</button></>}</p>
                <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setOpen(open === i ? -1 : i)}>{open === i ? 'Hide' : 'Show'} feature contributions</button>
                {open === i && (
                  <div style={{ marginTop: 10 }}>
                    {FEATURES.map((f) => ({ f, v: r.contributions[f] })).sort((a, b) => b.v - a.v).map(({ f, v }, k) => (
                      <div key={f} className={`bar-row ${k < 3 ? 'top' : ''}`}><span>{FEATURE_LABEL[f]}</span><div className="track"><i style={{ width: `${(v / maxC) * 100}%` }} /></div><span className="num right">{v.toFixed(2)}</span></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      <div className="grid g3">
        <Card title="Taste vs. recommendations" sub="History by category against the 5 picks (scaled)">
          <Legend items={[['History', C.ink], ['Recommended', C.red]]} />
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={affinity} outerRadius="72%">
              <PolarGrid stroke={C.line} />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: C.ink }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar name="History" dataKey="history" stroke={C.ink} fill={C.ink} fillOpacity={0.22} strokeWidth={2} isAnimationActive={false} />
              <Radar name="Recommended" dataKey="recs" stroke={C.red} fill={C.red} fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
              <Tooltip content={<ChartTip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Rating history" sub="When they rated things, and how highly">
          <ResponsiveContainer width="100%" height={286}>
            <ScatterChart margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke={C.line} />
              <XAxis type="number" dataKey="x" name="Days ago" {...axis} tickFormatter={(v) => `${-v}d`} />
              <YAxis type="number" dataKey="y" name="Rating" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
              <ZAxis range={[70, 70]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => active && payload?.length ? <div className="tt"><b>{payload[0].payload.name}</b><div><span>Category</span><span>{payload[0].payload.cat}</span></div><div><span>Rating</span><span>{payload[0].payload.y}/5</span></div></div> : null} />
              <Scatter data={timeline} fill={C.red} stroke="#fff" isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
        <Card title={`Why #${sel?.rank ?? '–'} ranked there`} sub={sel ? getItem(sel.itemId).title : 'Open a recommendation’s contributions'}>
          {sel ? (
            <ResponsiveContainer width="100%" height={286}>
              <BarChart layout="vertical" data={FEATURES.map((f) => ({ name: FEATURE_LABEL[f], value: +sel.contributions[f].toFixed(3) })).sort((a, b) => b.value - a.value)} margin={{ right: 14 }}>
                <CartesianGrid horizontal={false} stroke={C.line} />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" width={104} {...axis} stroke={C.ink} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
                <Bar isAnimationActive={false} dataKey="value" name="Contribution" fill={C.ink} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty title="No recommendation selected">Use “Show feature contributions” on a card.</Empty>}
        </Card>
      </div>
    </>
  );
}
