import React from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Boxes, Cpu, Database, GitBranch, LayoutDashboard, ScrollText, Settings as Cog, Users, Layers } from 'lucide-react';
import { useConsole } from './lib/store.jsx';
import { Badge } from './components/ui.jsx';
import Overview from './pages/Overview.jsx';
import Training from './pages/Training.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Recommendations from './pages/Recommendations.jsx';
import UserDetail from './pages/UserDetail.jsx';
import Engines from './pages/Engines.jsx';
import DataFeatures from './pages/DataFeatures.jsx';
import Logs from './pages/Logs.jsx';
import SettingsPage from './pages/Settings.jsx';

const NAV = [
  ['Monitor', [['/', 'Overview', LayoutDashboard], ['/pipeline', 'Pipeline runs', GitBranch], ['/logs', 'Logs', ScrollText]]],
  ['Models', [['/training', 'Model training', Cpu], ['/engines', 'Candidate engines', Layers], ['/data', 'Data and features', Database]]],
  ['Results', [['/recommendations', 'Recommendations', Users]]],
  ['System', [['/settings', 'Settings', Cog]]],
];

const TITLES = {
  '/': ['Overview', 'Health of the recommendation system at a glance'],
  '/pipeline': ['Pipeline runs', 'Run the full pipeline and inspect every stage'],
  '/logs': ['Logs', 'Everything the system has reported'],
  '/training': ['Model training', 'Train the ALS and LambdaMART models, manage versions'],
  '/engines': ['Candidate engines', 'Compare the three sources feeding the re-ranker'],
  '/data': ['Data and features', 'Cleaning, merging and the feature store'],
  '/recommendations': ['Recommendations', 'Pick a user to see why they got what they got'],
  '/settings': ['Settings', 'Backend connection and defaults'],
};

export default function App() {
  const { jobs, demo } = useConsole();
  const loc = useLocation();
  const running = jobs.filter((j) => j.status === 'running');
  const key = loc.pathname.startsWith('/recommendations') ? '/recommendations' : loc.pathname;
  const [title, sub] = TITLES[key] || ['', ''];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark"><i className="brand-dot" /><h1>NEO RECS</h1></div>
          <p>Recommender admin console</p>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map(([group, items]) => (
            <React.Fragment key={group}>
              <div className="nav-group">{group}</div>
              {items.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} end={to === '/'}>
                  <Icon size={17} />{label}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="side-foot">
          <div className="live">{running.length ? <><i className="pulse" />{running.length} job{running.length > 1 ? 's' : ''} running</> : <><Activity size={14} />Idle</>}</div>
          {demo ? 'Demo data (simulated backend)' : 'Live backend connected'}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h2>{title}</h2>
            <div className="sub">{sub}</div>
          </div>
          <div className="top-right">
            {demo ? <Badge kind="soft">Demo mode</Badge> : <Badge kind="black">Live</Badge>}
            {running.map((j) => <Badge key={j.id} kind="red"><i className="pulse" style={{ background: '#fff' }} />{j.kind === 'pipeline' ? 'Pipeline' : j.kind === 'als' ? 'ALS' : 'LightGBM'} {j.progress}%</Badge>)}
          </div>
        </header>
        <main className="page">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/training" element={<Training />} />
            <Route path="/engines" element={<Engines />} />
            <Route path="/data" element={<DataFeatures />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/recommendations/:userId" element={<UserDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
