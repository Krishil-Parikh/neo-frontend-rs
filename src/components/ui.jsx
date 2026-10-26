import React, { useEffect, useRef } from 'react';

export const C = { red: '#d6131b', deep: '#8e0b11', ink: '#121212', mid: '#7a7a7a', rose: '#ee9a9e', line: '#e2e2e2', pale: '#f9dcdd' };
export const SERIES = [C.red, C.ink, C.mid, C.rose, C.deep];

export function Card({ title, sub, actions, dark, flush, children, className = '' }) {
  return (
    <section className={`card ${dark ? 'dark' : ''} ${flush ? 'flush' : ''} ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p>{sub}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export const Stat = ({ label, value, delta, hot, up }) => (
  <div className={`stat ${hot ? 'hot' : ''}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {delta && <div className={`delta ${up ? 'up' : ''}`}>{delta}</div>}
  </div>
);

export const Badge = ({ kind = '', children }) => <span className={`badge ${kind}`}>{children}</span>;

export const StatusBadge = ({ status }) => {
  if (status === 'running') return <Badge kind="red"><i className="pulse" style={{ background: '#fff' }} />Running</Badge>;
  if (status === 'done') return <Badge kind="black">Done</Badge>;
  if (status === 'failed') return <Badge kind="outline-red">Failed</Badge>;
  if (status === 'cancelled') return <Badge>Cancelled</Badge>;
  return <Badge>Waiting</Badge>;
};

export const Progress = ({ value }) => (
  <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${value}%` }} /></div>
);

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export const Seg = ({ value, onChange, options }) => (
  <div className="seg" role="tablist">
    {options.map((o) => (
      <button key={o.value ?? o} role="tab" aria-selected={value === (o.value ?? o)} className={value === (o.value ?? o) ? 'on' : ''} onClick={() => onChange(o.value ?? o)}>
        {o.label ?? o}
      </button>
    ))}
  </div>
);

export const Empty = ({ title, children }) => (
  <div className="empty"><b>{title}</b>{children}</div>
);

export const Legend = ({ items }) => (
  <div className="legend">
    {items.map(([name, color, dash]) => (
      <span key={name}><i style={{ background: dash ? 'transparent' : color, border: dash ? `2px dashed ${color}` : 'none' }} />{name}</span>
    ))}
  </div>
);

export function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      {label !== undefined && <b>{label}</b>}
      {payload.map((p) => (
        <div key={p.dataKey + p.name}>
          <span>{p.name ?? p.dataKey}</span>
          <span className="num">{fmt ? fmt(p.value) : typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

const fmtTime = (t) => new Date(t).toLocaleTimeString('en-GB');

export function LogConsole({ lines, height = 320, running, empty = 'No log output yet. Start a job to see live logs.' }) {
  const ref = useRef(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines]);
  return (
    <div
      ref={ref}
      className="console"
      style={{ height }}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
      role="log"
      aria-live="off"
    >
      {lines.length === 0 && <span style={{ color: '#777' }}>{empty}</span>}
      {lines.map((l) => (
        <div className="ln" key={l.id}>
          <span className="ts">{fmtTime(l.t)}</span>
          <span className={`lv-${l.level}`}>{l.level}</span>
          <span className="src">{l.src}</span>
          <span className={`msg ${l.level === 'ERROR' ? 'err' : ''}`}>{l.msg}</span>
        </div>
      ))}
      {running && <span className="caret" />}
    </div>
  );
}

export const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
