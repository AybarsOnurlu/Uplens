const query = new URLSearchParams(location.search);
const listeners = [];
const scenario = query.get('scenario') || 'empty';
const now = Date.now();
const analysis = {
  jobId: '~01UPLENSDEMO',
  jobTitle: 'Senior Full-Stack Engineer for SaaS Dashboard',
  jobUrl: 'https://www.upwork.com/jobs/~01UPLENSDEMO',
  overallScore: 78,
  scoreLabel: 'decent',
  analyzedAt: now,
  redFlags: [
    {
      severity: 'medium',
      title: 'High competition',
      description: 'The listing already has 50+ proposals.',
      category: 'competition'
    }
  ],
  greenFlags: [
    {
      title: 'Payment verified',
      description: 'The client has a verified payment method.'
    },
    {
      title: 'Strong client history',
      description: 'The client has spent more than $10K.'
    }
  ],
  budgetAnalysis: {
    score: 82,
    label: 'Good Budget',
    details: ['Hourly range: $55–$75', 'Meets your $40 minimum']
  },
  clientAnalysis: {
    score: 92,
    label: 'Very Trusted',
    details: ['Payment method verified', '$25K+ total spend', '92% hire rate', '4.9/5 rating']
  },
  qualityAnalysis: { score: 80, label: 'Good Quality', details: [] },
  skillMatch: {
    matched: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    unmatched: ['AWS'],
    matchPercentage: 80,
    hasUserSkills: true
  },
  rawData: {
    id: '~01UPLENSDEMO',
    title: 'Senior Full-Stack Engineer for SaaS Dashboard',
    description: 'Build and maintain a TypeScript SaaS dashboard with React, Node.js, and PostgreSQL.',
    budget: { type: 'hourly', min: 55, max: 75 },
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS']
  }
};

const aiAnalysis = {
  ...analysis,
  overallScore: 72,
  aiSummary: '• Strong match for TypeScript, React, and Node.js.\n• Budget and client history look credible.\n• Confirm AWS ownership and weekly availability before applying.'
};

const history = [
  analysis,
  { ...analysis, jobId: '~02UPLENSDEMO', jobTitle: 'React Performance Specialist', overallScore: 86, scoreLabel: 'good', analyzedAt: now - 3600000 },
  { ...analysis, jobId: '~03UPLENSDEMO', jobTitle: 'Node.js API Integration', overallScore: 69, scoreLabel: 'decent', analyzedAt: now - 7200000 },
  { ...analysis, jobId: '~04UPLENSDEMO', jobTitle: 'Quick Website Fix', overallScore: 41, scoreLabel: 'caution', analyzedAt: now - 10800000 }
];

const state = {
  userProfile: {
    skills: scenario === 'settings' ? ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'] : [],
    minimumHourlyRate: scenario === 'settings' ? 40 : 25,
    minimumFixedBudget: scenario === 'settings' ? 500 : 100,
    theme: query.get('theme') || 'light',
    openAIApiKey: '',
    aiAnalysisMode: 'manual',
    apiProvider: 'auto',
    apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
    apiModel: ''
  },
  settings: {
    language: query.get('lang') || 'en',
    hasSeenTour: query.get('seen') === '1',
    maxHistoryItems: 100
  },
  analysisHistory: scenario === 'history' ? history : (scenario === 'analysis' || scenario === 'ai' ? [scenario === 'ai' ? aiAnalysis : analysis] : []),
  lastAnalysis: scenario === 'analysis' ? analysis : (scenario === 'ai' ? aiAnalysis : null)
};

globalThis.__UPLENS_TEST_STATE__ = state;

function normalizeKeys(keys) {
  if (keys == null) return Object.keys(state);
  if (Array.isArray(keys)) return keys;
  if (typeof keys === 'string') return [keys];
  return Object.keys(keys);
}

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        return Object.fromEntries(normalizeKeys(keys).filter((key) => key in state).map((key) => [key, state[key]]));
      },
      async set(values) {
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: state[key], newValue: value };
          state[key] = value;
        }
        listeners.forEach((listener) => listener(changes, 'local'));
      },
      async remove(keys) {
        for (const key of normalizeKeys(keys)) delete state[key];
      }
    },
    onChanged: {
      addListener(listener) { listeners.push(listener); }
    }
  },
  runtime: {
    lastError: null,
    async sendMessage() { return { success: true }; }
  },
  tabs: {
    query(_query, callback) { callback?.([]); return Promise.resolve([]); },
    sendMessage() { return Promise.resolve({ success: true }); }
  },
  permissions: {
    async contains() { return true; },
    async request() { return true; }
  }
};
