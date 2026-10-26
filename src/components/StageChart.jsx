import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C, ChartTip, Legend } from './ui.jsx';

const axis = { stroke: '#9a9a9a', fontSize: 12, tickLine: false };
const compact = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v);

export default function StageChart({ spec, height = 260 }) {
  if (!spec) return null;
  const { kind, data } = spec;

  if (kind === 'bars' || kind === 'funnel' || kind === 'features') {
    const highlight = kind === 'features' ? 0 : kind === 'funnel' ? data.length - 1 : -1;
    return (
      <ResponsiveContainer width="100%" height={kind === 'bars' ? 200 : height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} stroke={C.line} />
          <XAxis type="number" {...axis} tickFormatter={compact} />
          <YAxis type="category" dataKey="name" width={130} {...axis} stroke={C.ink} />
          <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
          <Bar isAnimationActive={false} dataKey="value" name="Value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((d, i) => <Cell key={d.name} fill={i === highlight ? C.red : C.ink} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === 'beforeAfter') {
    return (
      <>
        <Legend items={[['Found', C.red], ['Remaining after fix', C.ink]]} />
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} stroke={C.line} />
            <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10.5 }} />
            <YAxis {...axis} tickFormatter={compact} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
            <Bar isAnimationActive={false} dataKey="before" name="Found" fill={C.red} radius={[4, 4, 0, 0]} barSize={26} />
            <Bar isAnimationActive={false} dataKey="after" name="Remaining" fill={C.ink} radius={[4, 4, 0, 0]} barSize={26} minPointSize={3} />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (kind === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" stroke="#fff" strokeWidth={3} paddingAngle={1}>
            {data.map((d, i) => <Cell key={d.name} fill={i === 0 ? C.ink : C.red} />)}
          </Pie>
          <RLegend verticalAlign="bottom" iconType="square" />
          <Tooltip content={<ChartTip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (kind === 'hist') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ left: 0, right: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={C.line} />
          <XAxis dataKey="bin" {...axis} />
          <YAxis {...axis} />
          <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
          <Bar isAnimationActive={false} dataKey="count" name="Count" fill={C.red} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === 'corr') {
    const n = data.length;
    return (
      <div>
        <div className="heat" style={{ gridTemplateColumns: `110px repeat(${n}, 1fr)` }}>
          <div />
          {data[0].cells.map((c) => <div key={c.x} className="muted" style={{ fontSize: 10.5 }}>{c.x.split(' ')[0]}</div>)}
          {data.map((row) => (
            <React.Fragment key={row.name}>
              <div style={{ textAlign: 'right', paddingRight: 8, color: C.ink }}>{row.name}</div>
              {row.cells.map((c) => {
                const a = Math.min(1, Math.abs(c.v));
                const neg = c.v < 0;
                return <div key={c.x} title={`${row.name} × ${c.x}: ${c.v}`} style={{ background: neg ? `rgba(18,18,18,${a * 0.85})` : `rgba(214,19,27,${a})`, color: a > 0.5 ? '#fff' : C.ink }}>{c.v.toFixed(2)}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
        <Legend items={[['Positive correlation', C.red], ['Negative correlation', C.ink]]} />
      </div>
    );
  }
  return null;
}
