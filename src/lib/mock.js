// Deterministic mock data. Replaced by real backend responses when VITE_API_URL is set (see api.js).

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(42);
const pick = (arr, rand = r) => arr[Math.floor(rand() * arr.length)];
const between = (a, b, rand = r) => a + (b - a) * rand();

export const CATEGORIES = ['Sci-Fi', 'Drama', 'Comedy', 'Thriller', 'Documentary', 'Animation', 'Romance', 'Action'];
export const SEGMENTS = ['Power user', 'Casual', 'New user', 'Lapsed'];
export const SOURCES = { metadata: 'Metadata', trending: 'Trending', als: 'ALS' };

const W1 = ['Silent', 'Crimson', 'Last', 'Broken', 'Hidden', 'Electric', 'Paper', 'Midnight', 'Iron', 'Hollow', 'Burning', 'Distant', 'Neon', 'Quiet', 'Glass', 'Wild', 'Final', 'Northern', 'Savage', 'Gentle'];
const W2 = ['Harbor', 'Signal', 'Garden', 'Empire', 'Orbit', 'Winter', 'Machine', 'Letters', 'River', 'Protocol', 'Kingdom', 'Frontier', 'Mirror', 'Season', 'Echo', 'Station', 'Voyage', 'Archive', 'Circus', 'Horizon'];

export const ITEMS = Array.from({ length: 480 }, (_, i) => {
  const popularity = Math.pow(r(), 2.2);
  return {
    id: `I${2000 + i}`,
    title: `${pick(W1)} ${pick(W2)}`,
    category: pick(CATEGORIES),
    year: Math.floor(between(1998, 2026)),
    popularity,
    avgRating: +between(2.6, 4.8).toFixed(2),
  };
});
const itemById = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const getItem = (id) => itemById[id];

const FIRST = ['Aanya', 'Marcus', 'Lena', 'Rohan', 'Sofia', 'Kenji', 'Imani', 'Diego', 'Priya', 'Tomas', 'Yara', 'Felix', 'Noor', 'Callum', 'Mei', 'Arjun', 'Elena', 'Jonas', 'Zara', 'Omar'];
const LAST = ['Shah', 'Okafor', 'Brandt', 'Mehta', 'Rossi', 'Tanaka', 'Mensah', 'Alvarez', 'Nair', 'Novak', 'Haddad', 'Weber', 'Karim', 'Reid', 'Zhou', 'Iyer', 'Petrova', 'Lund', 'Khan', 'Farouk'];

const FEATURES = ['als_affinity', 'category_match', 'recency_boost', 'trend_velocity', 'item_popularity', 'avg_rating', 'user_activity', 'cooccurrence'];

function buildUser(idx) {
  const rand = rng(1000 + idx);
  const segment = pick(SEGMENTS, rand);
  const favs = [pick(CATEGORIES, rand), pick(CATEGORIES, rand), pick(CATEGORIES, rand)];
  const n = segment === 'New user' ? 4 + Math.floor(rand() * 4) : segment === 'Power user' ? 24 + Math.floor(rand() * 14) : 10 + Math.floor(rand() * 10);
  const seen = new Set();
  const history = [];
  for (let k = 0; k < n; k++) {
    const pool = rand() < 0.72 ? ITEMS.filter((i) => favs.includes(i.category)) : ITEMS;
    const it = pick(pool, rand);
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 240);
    history.push({
      itemId: it.id,
      rating: Math.max(1, Math.min(5, Math.round(it.avgRating + (favs.includes(it.category) ? 0.6 : -0.4) + (rand() - 0.5) * 1.6))),
      daysAgo,
      watchPct: Math.round(between(35, 100, rand)),
    });
  }
  history.sort((a, b) => a.daysAgo - b.daysAgo);

  // candidates from three engines, then rerank
  const cands = [];
  const add = (source, pool, scoreFn) => {
    for (let k = 0; k < 8; k++) {
      const it = pick(pool, rand);
      if (seen.has(it.id)) continue;
      cands.push({ itemId: it.id, source, rawScore: scoreFn(it) });
    }
  };
  add('metadata', ITEMS.filter((i) => favs.includes(i.category)), (it) => 0.55 + rand() * 0.4 + (it.category === favs[0] ? 0.05 : 0));
  add('trending', [...ITEMS].sort((a, b) => b.popularity - a.popularity).slice(0, 80), (it) => 0.4 + it.popularity * 0.6);
  add('als', ITEMS, (it) => 0.35 + rand() * 0.6 + (favs.includes(it.category) ? 0.1 : 0));

  const byId = new Map();
  cands.forEach((c) => {
    const cur = byId.get(c.itemId);
    if (cur) {
      cur.sources.push(c.source);
      cur.rawScores[c.source] = c.rawScore;
    } else byId.set(c.itemId, { itemId: c.itemId, sources: [c.source], rawScores: { [c.source]: c.rawScore } });
  });
  const pooled = [...byId.values()].map((c) => {
    const it = itemById[c.itemId];
    const contributions = {
      als_affinity: c.rawScores.als ? c.rawScores.als * 0.9 : rand() * 0.2,
      category_match: favs.includes(it.category) ? 0.55 + rand() * 0.3 : rand() * 0.2,
      recency_boost: (it.year - 1998) / 28 * 0.5,
      trend_velocity: c.rawScores.trending ? c.rawScores.trending * 0.7 : it.popularity * 0.2,
      item_popularity: it.popularity * 0.5,
      avg_rating: (it.avgRating - 2.6) / 2.2 * 0.5,
      user_activity: segment === 'Power user' ? 0.25 : 0.1,
      cooccurrence: rand() * 0.4,
    };
    const score = Object.values(contributions).reduce((a, b) => a + b, 0) / 2.8;
    return { ...c, contributions, score };
  });
  pooled.sort((a, b) => b.score - a.score);
  const top = pooled.slice(0, 5).map((c, rank) => {
    const it = itemById[c.itemId];
    const sorted = Object.entries(c.contributions).sort((a, b) => b[1] - a[1]);
    const anchor = history.find((h) => itemById[h.itemId].category === it.category && h.rating >= 4) || history.find((h) => itemById[h.itemId].category === it.category);
    return {
      rank: rank + 1,
      ...c,
      preRank: pooled.length - pooled.indexOf(c) > 0 ? [...pooled].sort((a, b) => Math.max(...Object.values(b.rawScores)) - Math.max(...Object.values(a.rawScores))).indexOf(c) + 1 : rank + 1,
      anchorItemId: anchor ? anchor.itemId : null,
      topFeatures: sorted.slice(0, 3).map(([k]) => k),
      explanation: explain(it, c, sorted, anchor, favs),
    };
  });
  const name = `${pick(FIRST, rand)} ${pick(LAST, rand)}`;
  return {
    id: `U${1001 + idx}`,
    name,
    segment,
    favs,
    history,
    recs: top,
    candidateCount: cands.length,
    pooledCount: pooled.length,
    generatedAt: Date.now() - Math.floor(rand() * 3600e3),
  };
}

function explain(it, c, sorted, anchor, favs) {
  const parts = [];
  if (anchor) parts.push(`You rated "${itemById[anchor.itemId].title}" ${anchor.rating}/5, and this is another ${it.category.toLowerCase()} title`);
  else if (favs.includes(it.category)) parts.push(`${it.category} is one of your most-watched categories`);
  const lead = sorted[0][0];
  const phrase = {
    als_affinity: 'viewers with a similar taste profile (ALS) rated it highly',
    category_match: 'it matches your strongest category preferences',
    recency_boost: 'it is a recent release',
    trend_velocity: 'it is trending right now',
    item_popularity: 'it is broadly popular on the platform',
    avg_rating: 'it has a high average rating',
    user_activity: 'it suits your viewing frequency',
    cooccurrence: 'people who watched your history also watched it',
  }[lead];
  parts.push(phrase);
  return parts.join('; ') + '.';
}

export const USERS = Array.from({ length: 64 }, (_, i) => buildUser(i));
export const getUser = (id) => USERS.find((u) => u.id === id);
export { FEATURES };
export const FEATURE_LABEL = {
  als_affinity: 'ALS affinity',
  category_match: 'Category match',
  recency_boost: 'Recency boost',
  trend_velocity: 'Trend velocity',
  item_popularity: 'Item popularity',
  avg_rating: 'Average rating',
  user_activity: 'User activity',
  cooccurrence: 'Co-occurrence',
};

// ---------------- pipeline stage definitions ----------------

export const STAGES = [
  { id: 'ingest', label: 'Ingest', group: 'Data', blurb: 'Read both raw datasets' },
  { id: 'clean', label: 'Clean', group: 'Data', blurb: 'Fix nulls, duplicates, types' },
  { id: 'merge', label: 'Merge', group: 'Data', blurb: 'Join interactions with item metadata' },
  { id: 'aggregate', label: 'Feature aggregation', group: 'Features', blurb: 'User and item rollups' },
  { id: 'engineer', label: 'Feature engineering', group: 'Features', blurb: 'Derived model features' },
  { id: 'metadata', label: 'Metadata engine', group: 'Candidates', blurb: 'Content-based candidates' },
  { id: 'trending', label: 'Trending engine', group: 'Candidates', blurb: 'Popularity and freshness' },
  { id: 'als', label: 'ALS engine', group: 'Candidates', blurb: 'Matrix factorization (saved model)' },
  { id: 'pool', label: 'Pool and dedupe', group: 'Ranking', blurb: 'Merge candidate lists' },
  { id: 'rerank', label: 'Re-ranker', group: 'Ranking', blurb: 'LambdaMART top 5 + explanations' },
];

export function makeStageResult(stageId, rand, ctx) {
  const users = ctx.users;
  const hist = (n, base, spread) => Array.from({ length: n }, (_, i) => ({ bin: i, count: Math.round(base * Math.exp(-Math.pow((i - n * 0.4) / (n * 0.28), 2)) * (0.85 + rand() * 0.3) + spread * rand()) }));
  switch (stageId) {
    case 'ingest':
      return {
        metrics: { 'Interactions rows': 1284330, 'Catalog rows': 48210, 'Read time (s)': +between(1.8, 3.1, rand).toFixed(2), 'Schema checks passed': '14 / 14' },
        chart: { kind: 'bars', title: 'Rows by dataset', data: [{ name: 'Interactions', value: 1284330 }, { name: 'Catalog', value: 48210 }] },
      };
    case 'clean': {
      const issues = [
        { name: 'Null ratings', before: 18420, after: 0 },
        { name: 'Duplicate events', before: 9310, after: 0 },
        { name: 'Bad timestamps', before: 2204, after: 0 },
        { name: 'Orphan item IDs', before: 1177, after: 0 },
        { name: 'Out-of-range', before: 640, after: 0 },
      ];
      return { metrics: { 'Rows in': 1284330, 'Rows out': 1253702, 'Rows dropped': 30628, 'Retention': '97.6%' }, chart: { kind: 'beforeAfter', title: 'Data issues found and fixed', data: issues } };
    }
    case 'merge':
      return { metrics: { 'Join key': 'item_id', 'Match rate': '99.2%', 'Rows out': 1244990, 'Unmatched dropped': 8712 }, chart: { kind: 'donut', title: 'Join outcome', data: [{ name: 'Matched', value: 1244990 }, { name: 'Unmatched', value: 8712 }] } };
    case 'aggregate':
      return { metrics: { 'User rollups': users, 'Item rollups': 47320, 'Windows': '7d / 30d / 90d', 'Aggregation time (s)': +between(3, 5, rand).toFixed(2) }, chart: { kind: 'hist', title: 'Interactions per user', data: hist(16, 900, 60) } };
    case 'engineer':
      return { metrics: { 'Features created': 8, 'Missing after impute': 0, 'Scaling': 'Z-score + clip', 'Feature store version': 'fs-' + Math.floor(rand() * 900 + 100) }, chart: { kind: 'corr', title: 'Feature correlation', data: corrMatrix(rand) } };
    case 'metadata':
      return { metrics: { 'Candidates generated': users * 8, 'Users covered': users, 'Latency p95 (ms)': Math.round(between(60, 110, rand)), 'Avg score': +between(0.6, 0.78, rand).toFixed(3) }, chart: { kind: 'hist', title: 'Candidate score distribution', data: hist(14, 80, 6) } };
    case 'trending':
      return { metrics: { 'Candidates generated': users * 8, 'Trend window': '14 days', 'Latency p95 (ms)': Math.round(between(20, 60, rand)), 'Fresh items (<30d)': '38%' }, chart: { kind: 'hist', title: 'Candidate score distribution', data: hist(14, 70, 6) } };
    case 'als':
      return { metrics: { 'Model version': ctx.alsVersion, 'Candidates generated': users * 8, 'Latency p95 (ms)': Math.round(between(35, 90, rand)), 'Cold-start users': Math.round(users * 0.11) }, chart: { kind: 'hist', title: 'Candidate score distribution', data: hist(14, 90, 6) } };
    case 'pool': {
      const total = users * 24;
      return { metrics: { 'Candidates in': total, 'Duplicates removed': Math.round(total * 0.19), 'Candidates out': total - Math.round(total * 0.19), 'Multi-source items': '19%' }, chart: { kind: 'funnel', title: 'Candidate funnel', data: [{ name: 'Pooled (all engines)', value: total }, { name: 'Metadata', value: users * 8 }, { name: 'Trending', value: users * 8 }, { name: 'ALS', value: users * 8 }, { name: 'After dedupe', value: total - Math.round(total * 0.19) }] } };
    }
    case 'rerank':
      return { metrics: { 'Model version': ctx.lgbVersion, 'Users ranked': users, 'Output per user': 5, 'NDCG@5 (offline)': +between(0.41, 0.48, rand).toFixed(3) }, chart: { kind: 'features', title: 'Mean feature contribution', data: FEATURES.map((f) => ({ name: FEATURE_LABEL[f], value: +(USERS.reduce((a, u) => a + u.recs.reduce((x, rr) => x + rr.contributions[f], 0), 0) / (USERS.length * 5)).toFixed(3) })).sort((a, b) => b.value - a.value) } };
    default:
      return { metrics: {}, chart: null };
  }
}

function corrMatrix(rand) {
  const keys = FEATURES.slice(0, 6);
  return keys.map((a, i) => ({ name: FEATURE_LABEL[a], cells: keys.map((b, j) => ({ x: FEATURE_LABEL[b], v: i === j ? 1 : +(Math.sin((i + 1) * (j + 2)) * 0.5 + (rand() - 0.5) * 0.2).toFixed(2) })) }));
}

// ---------------- analytics series for overview ----------------

const ar = rng(7);
export const DAILY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 864e5);
  const base = 900 + i * 14 + ar() * 160;
  const m = base * (0.34 + ar() * 0.04);
  const t = base * (0.22 + ar() * 0.04);
  return { day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), metadata: Math.round(m), trending: Math.round(t), als: Math.round(base - m - t), latency: Math.round(180 + ar() * 60 - i * 1.2), ctr: +(0.071 + i * 0.0006 + ar() * 0.006).toFixed(4) };
});

export const CATEGORY_MIX = CATEGORIES.map((c) => ({
  name: c,
  history: USERS.reduce((a, u) => a + u.history.filter((h) => itemById[h.itemId].category === c).length, 0),
  recs: USERS.reduce((a, u) => a + u.recs.filter((x) => itemById[x.itemId].category === c).length, 0) * 9,
}));

// ---------------- model registry ----------------

export const INITIAL_MODELS = [
  { id: 'als-v1.0.3', kind: 'als', trainedAt: Date.now() - 12 * 864e5, active: false, durationS: 412, metrics: { ndcg: 0.318, recall: 0.211, rmse: 0.931 }, params: { factors: 64, reg: 0.05, iterations: 15, alpha: 20 } },
  { id: 'als-v1.0.4', kind: 'als', trainedAt: Date.now() - 4 * 864e5, active: true, durationS: 438, metrics: { ndcg: 0.337, recall: 0.229, rmse: 0.902 }, params: { factors: 96, reg: 0.04, iterations: 15, alpha: 25 } },
  { id: 'lgb-v2.1.0', kind: 'lgb', trainedAt: Date.now() - 20 * 864e5, active: false, durationS: 184, metrics: { ndcg: 0.402, map: 0.331 }, params: { leaves: 31, lr: 0.05, rounds: 300 } },
  { id: 'lgb-v2.2.0', kind: 'lgb', trainedAt: Date.now() - 6 * 864e5, active: true, durationS: 201, metrics: { ndcg: 0.431, map: 0.352 }, params: { leaves: 63, lr: 0.04, rounds: 400 } },
];

export const DEFAULT_PARAMS = {
  als: { factors: 96, reg: 0.04, iterations: 15, alpha: 25 },
  lgb: { leaves: 63, lr: 0.04, rounds: 400 },
};
