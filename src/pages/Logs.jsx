import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useConsole } from '../lib/store.jsx';
import { Card, LogConsole, Seg } from '../components/ui.jsx';

export default function Logs() {
  const { logs } = useConsole();
  const [level, setLevel] = useState('ALL');
  const [q, setQ] = useState('');
  const lines = useMemo(
    () => logs.filter((l) => (level === 'ALL' || l.level === level) && (l.msg + l.src).toLowerCase().includes(q.toLowerCase())),
    [logs, level, q]
  );
  const download = () => {
    const text = lines.map((l) => `${new Date(l.t).toISOString()} ${l.level} ${l.src} ${l.msg}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'neo-recs-logs.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Card
      flush
      title="System log"
      sub={`${lines.length} of ${logs.length} lines`}
      actions={
        <>
          <Seg value={level} onChange={setLevel} options={['ALL', 'INFO', 'DEBUG', 'WARN', 'ERROR']} />
          <label className="search"><Search size={15} /><input placeholder="Filter text or source" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter logs" /></label>
          <button className="btn sm" onClick={download}><Download size={14} />Download</button>
        </>
      }
    >
      <div style={{ marginTop: 14 }}>
        <LogConsole lines={lines} height="calc(100vh - 250px)" empty="No lines match. Run a pipeline or train a model to generate logs." />
      </div>
    </Card>
  );
}
