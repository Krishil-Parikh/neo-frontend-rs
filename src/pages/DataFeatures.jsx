import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FEATURES, FEATURE_LABEL, makeStageResult, rng } from '../lib/mock.js';
import { C, Card, ChartTip, Stat } from '../components/ui.jsx';
import StageChart from '../components/StageChart.jsx';

const axis = { stroke: '#9a9a9a', fontSize: 12, tickLine: false };
const rand = rng(5);
const clean = makeStageResult('clean', rand, { users: 64 });
const merge = makeStageResult('merge', rand, { users: 64 });
const eng = makeStageResult('engineer', rand, { users: 64 });
const agg = makeStageResult('aggregate', rand, { users: 64 });

const missing = FEATURES.map((f) => ({ name: FEATURE_LABEL[f], raw: Math.round(rand() * 9000), imputed: 0 }));
const monthly = Array.from({ length: 12 }, (_, i) => ({ m: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i], a: Math.round(60 + i * 5 + rand() * 20) * 1000, b: Math.round(30 + i * 3 + rand() * 12) * 1000 }));

export default function DataFeatures() {
  return (
    <>
      <div className="grid g4">
        <Stat hot label="Dataset A: interactions" value="1.28M" delta="rows ingested" />
        <Stat label="Dataset B: item catalog" value="48.2k" delta="rows ingested" />
        <Stat label="Rows kept after cleaning" value="97.6%" delta="30,628 dropped" />
        <Stat label="Join match rate" value="99.2%" delta="item_id" />
      </div>

      <div className="grid g2">
        <Card title="Interactions over time" sub="Volume per month in each dataset">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly}>
              <CartesianGrid vertical={false} stroke={C.line} />
              <XAxis dataKey="m" {...axis} />
              <YAxis {...axis} tickFormatter={(v) => v / 1000 + 'k'} />
              <Tooltip content={<ChartTip />} />
              <Area dataKey="a" name="Dataset A" stroke={C.red} fill={C.red} fillOpacity={0.85} isAnimationActive={false} />
              <Area dataKey="b" name="Dataset B" stroke={C.ink} fill={C.ink} fillOpacity={0.9} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Cleaning report" sub={clean.chart.title}>
          <StageChart spec={clean.chart} />
        </Card>
      </div>

      <div className="grid g3">
        <Card title="Merge outcome" sub="Interactions joined to item metadata"><StageChart spec={merge.chart} /></Card>
        <Card title="Interactions per user" sub="Distribution after aggregation"><StageChart spec={agg.chart} /></Card>
        <Card title="Missing values per feature" sub="Raw vs. after imputation">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={missing} layout="vertical" margin={{ right: 12 }}>
              <CartesianGrid horizontal={false} stroke={C.line} />
              <XAxis type="number" {...axis} />
              <YAxis type="category" dataKey="name" width={100} {...axis} stroke={C.ink} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#f4f4f4' }} />
              <Bar isAnimationActive={false} dataKey="raw" name="Missing (raw)" fill={C.red} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Engineered feature correlation" sub="Features fed to the LambdaMART re-ranker. Strong pairs may be redundant.">
        <StageChart spec={eng.chart} />
      </Card>
    </>
  );
}
