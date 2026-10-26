import React from 'react';
import { API_URL } from '../lib/api.js';
import { Badge, Card } from '../components/ui.jsx';

export default function SettingsPage() {
  return (
    <div className="grid g2">
      <Card title="Backend connection" sub="Where this console sends its requests" actions={API_URL ? <Badge kind="black">Live</Badge> : <Badge kind="soft">Demo mode</Badge>}>
        <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
          <div><div className="k">API base URL</div><div className="v mono" style={{ fontSize: 15 }}>{API_URL || 'Not set. Using simulated backend.'}</div></div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>To connect your pipeline, create <span className="mono">.env.local</span> in the project root and restart the dev server:</p>
        <pre className="console" style={{ borderRadius: 3, margin: 0 }}>VITE_API_URL=http://localhost:8000</pre>
      </Card>
      <Card title="Endpoints the console expects" sub="Defined in src/lib/api.js. Adjust the paths there to match your backend.">
        <table className="t">
          <tbody>
            {[
              ['POST', '/train/als', 'Start ALS training'],
              ['POST', '/train/lgb', 'Start LambdaMART training'],
              ['POST', '/pipeline/run', 'Start a pipeline run'],
              ['GET', '/jobs/:id', 'Status, logs, metrics, per-stage results'],
              ['GET', '/models', 'Saved model versions'],
              ['POST', '/models/:id/activate', 'Make a version active'],
              ['GET', '/users', 'Users, histories, recommendations'],
            ].map(([m, p, d]) => (
              <tr key={p}><td><Badge kind={m === 'GET' ? '' : 'black'}>{m}</Badge></td><td className="mono">{p}</td><td className="muted">{d}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
