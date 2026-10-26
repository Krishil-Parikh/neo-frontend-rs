import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { SEGMENTS, USERS, getItem } from '../lib/mock.js';
import { Badge, Card, Empty, Seg, ago } from '../components/ui.jsx';

export default function Recommendations() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState('All');
  const rows = useMemo(
    () => USERS.filter((u) => (seg === 'All' || u.segment === seg) && (u.name + u.id).toLowerCase().includes(q.toLowerCase())),
    [q, seg]
  );
  return (
    <Card
      flush
      title="All users"
      sub={`${rows.length} of ${USERS.length} users. Click a row to compare history with recommendations.`}
      actions={
        <>
          <Seg value={seg} onChange={setSeg} options={['All', ...SEGMENTS]} />
          <label className="search"><Search size={15} /><input placeholder="Search name or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></label>
        </>
      }
    >
      <div style={{ maxHeight: 'calc(100vh - 230px)', overflow: 'auto', marginTop: 14 }}>
        <table className="t">
          <thead>
            <tr><th>User</th><th>Segment</th><th className="right">History</th><th>Top categories</th><th>Top recommendation</th><th>Generated</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="clickable" tabIndex={0} onClick={() => nav(`/recommendations/${u.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/recommendations/${u.id}`)}>
                <td><b>{u.name}</b><div className="muted mono" style={{ fontSize: 12 }}>{u.id}</div></td>
                <td><Badge kind={u.segment === 'Power user' ? 'black' : u.segment === 'New user' ? 'soft' : ''}>{u.segment}</Badge></td>
                <td className="right num">{u.history.length}</td>
                <td><div className="row" style={{ gap: 4 }}>{[...new Set(u.favs)].map((f) => <span className="cat-tag" key={f}>{f}</span>)}</div></td>
                <td>{getItem(u.recs[0].itemId).title}<div className="muted" style={{ fontSize: 12 }}>score {u.recs[0].score.toFixed(2)}</div></td>
                <td className="muted">{ago(u.generatedAt)}</td>
                <td className="right"><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty title="No users match">Clear the search or choose another segment.</Empty>}
      </div>
    </Card>
  );
}
