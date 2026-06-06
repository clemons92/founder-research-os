import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Slice 3: Async research API
 * - POST /api/research -> { jobId } immediately (enqueue, no blocking compute)
 * - GET /api/research?jobId=... -> { status: 'pending'|'processing'|'completed'|'error', result?, error?, ... }
 * - Server persistence: JSON files in .reports/ (survives requests; pragmatic for Next.js/Railway)
 * - Hard rate limit: 5 job creations per IP per calendar day (UTC date key). Uses x-forwarded-for (Railway).
 *   Returns 429 when exceeded.
 * - REAL_RESEARCH (server env flag): default false (stub). Stub exercises FULL queue/poll/persist/rate-limit flow
 *   and returns realistic mock reports by reusing the prior scoring/rubric logic.
 *   When true (future), swap the generator for real MCP/agent calls here with minimal change.
 * - No changes to auth, Stripe, pricing, synthesis content, waitlist, or daily schedule.
 */

const REPORTS_DIR = path.join(process.cwd(), '.reports');

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

interface ResearchReport {
  idea: string;
  timestamp: string;
  score: number;
  rubric: Record<string, number>;
  matchedPatterns: string[];
  experiments: string[];
  summary: string;
  fullReport: string;
  sources: string[];
}

interface Job {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  idea: string;
  result?: ResearchReport;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// --- Rate limiting (hard 5/day/IP, calendar day, x-forwarded-for for Railway) ---
const DAILY_LIMIT = 5;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return ((req as any).ip as string | undefined) || 'unknown';
}

async function getDayKey(): Promise<string> {
  // UTC calendar day for "per calendar day" reset
  return new Date().toISOString().slice(0, 10);
}

async function checkAndIncrementRateLimit(ip: string): Promise<{ allowed: boolean; count: number }> {
  await ensureReportsDir();
  const dayKey = await getDayKey();
  const rateFile = path.join(REPORTS_DIR, `rate-${dayKey}.json`);
  let data: Record<string, number> = {};
  try {
    const raw = await fs.readFile(rateFile, 'utf8');
    data = JSON.parse(raw);
  } catch {
    // no file yet -> start empty
  }
  const current = data[ip] || 0;
  if (current >= DAILY_LIMIT) {
    return { allowed: false, count: current };
  }
  data[ip] = current + 1;
  await fs.writeFile(rateFile, JSON.stringify(data, null, 2));
  return { allowed: true, count: current + 1 };
}

// --- Job persistence (file-backed, survives requests) ---
async function writeJob(job: Job) {
  await ensureReportsDir();
  const file = path.join(REPORTS_DIR, `${job.jobId}.json`);
  await fs.writeFile(file, JSON.stringify(job, null, 2));
}

async function readJob(jobId: string): Promise<Job | null> {
  try {
    const file = path.join(REPORTS_DIR, `${jobId}.json`);
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as Job;
  } catch {
    return null;
  }
}

function generateJobId(): string {
  // Simple, no external deps
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Report generation (extracted for reuse in worker; stub produces realistic mocks) ---
const VERIFIED_CASES = [
  {
    name: "Elie Steinbock — Inbox Zero",
    revenue: "$10k+ MRR",
    key: "personal pain, extreme narrow focus, organic IH distribution, 'one thing really really well'",
    scoreBoostKeywords: ["email", "inbox", "productivity", "founders", "operators"]
  },
  {
    name: "Alex Nguyen — Feynman AI (notewave.app)",
    revenue: "$6k → $20k+ MRR",
    key: "solo founder, 20 days to first paying customer, 0.67% free→paid, built for own pain, original not clone, audio/PDF → structured outputs",
    scoreBoostKeywords: ["study", "notes", "audio", "learning", "students", "ai tool"]
  }
];

const BASE_RUBRIC = {
  "Pain/WTP (ICP)": 8,
  "Low CAC / Distribution": 9,
  "Railway + Lean Infra Fit": 9,
  "Agentic Differentiation": 9,
  "Speed to Validation/Revenue": 8,
  "Solo Feasibility": 9,
  "Competition Gap": 8,
  "Alignment with Real Cases": 9,
  "Excitement/Sustainability": 8,
  "Overall Risk": 8,
};

function generateStubReport(idea: string): ResearchReport {
  const lowerIdea = idea.toLowerCase();

  // Simulate parallel agents (web + X + cases) - preserved logic for realistic stub reports
  let webScore = 7.5;
  if (lowerIdea.includes("daily") || lowerIdea.includes("agent")) webScore += 0.8;
  if (lowerIdea.includes("railway") || lowerIdea.includes("deploy")) webScore += 0.7;
  if (lowerIdea.includes("founder") || lowerIdea.includes("indie")) webScore += 0.6;

  let xScore = 8.0;
  if (lowerIdea.includes("validate") || lowerIdea.includes("research") || lowerIdea.includes("idea")) xScore += 0.9;

  let caseScore = 7.0;
  const matched: string[] = [];
  VERIFIED_CASES.forEach(c => {
    const match = c.scoreBoostKeywords.some(kw => lowerIdea.includes(kw));
    if (match) {
      caseScore += 0.8;
      matched.push(c.key);
    }
  });

  const rubric = { ...BASE_RUBRIC };
  const avgBoost = (webScore + xScore + caseScore - 23) / 3;
  Object.keys(rubric).forEach(key => {
    rubric[key as keyof typeof rubric] = Math.min(10, Math.max(6, Math.round((rubric[key as keyof typeof rubric] + avgBoost) * 10) / 10));
  });

  const overall = Object.values(rubric).reduce((a, b) => a + b, 0) / Object.keys(rubric).length;

  const experiments = [
    `Post a build-in-public thread on X + Indie Hackers using the exact framing from our verified patterns (personal pain + narrow focus).`,
    `Deploy a one-page fake door landing (use the experiment generator) to Railway. Track signups as validation signals.`,
    `Create a simple 3-question signal collector and share in 2 founder communities today.`,
    `Generate 3-5 pieces of content (tweets, IH post) directly from the matched cases above and schedule them.`,
    `Set up a basic Railway project + GitHub repo for your MVP slice using the lean stack.`
  ];

  const summary = `High fit (${overall.toFixed(1)}/10). Strong on meta acquisition, Railway/agentic leverage, and alignment with solo founder patterns like Inbox Zero and Feynman AI. This idea benefits from the daily ritual + deploy loop.`;

  const fullReport = `AGENT RUN • ${new Date().toISOString().slice(0,16)}
Idea: ${idea}

PARALLEL AGENTS SUMMARY:
- Web/Market agent: ${webScore.toFixed(1)} — real demand signals for founder tools + validation platforms active in 2026.
- X/Signal agent: ${xScore.toFixed(1)} — recent founder complaints about shallow AI validators hallucinating demand; preference for grounded, experiment-oriented platforms.
- Cases agent: ${caseScore.toFixed(1)} — matched ${matched.length} verified patterns.

RUBRIC (10 categories):
${Object.entries(rubric).map(([k,v]) => `${k}: ${v}`).join('\n')}

Overall: ${overall.toFixed(1)}/10

MATCHED VERIFIED PATTERNS:
${matched.length ? matched.join('\n') : 'Core solo founder patterns (personal pain, narrow focus, organic distribution, fast first revenue, lean infra). See full synthesis for Inbox Zero ($10k+ MRR, extreme focus) and Feynman AI ($20k+ ARR, 20 days to paying customer).'}

RECOMMENDED EXPERIMENTS (do these today):
${experiments.map((e,i) => `${i+1}. ${e}`).join('\n')}

NEXT IN REAL PLATFORM:
This would have spawned actual parallel research agents (web search + X semantic/keyword + case retrieval from the living synthesis) via Paseo MCP + the 10k-revenue-researcher skill, appended a personal synthesis doc, and scheduled daily heartbeat updates. Your experiment would be one-click deployable from a GitHub worktree on Railway.

Source: Live autonomous research loop (this platform powers its own development).
`;

  return {
    idea,
    timestamp: new Date().toISOString(),
    score: Math.round(overall * 10) / 10,
    rubric,
    matchedPatterns: matched.length ? matched : ["Personal pain validation", "Narrow focus + organic distribution", "Fast validation to first revenue", "Lean Railway-native infra"],
    experiments,
    summary,
    fullReport,
    sources: ["Verified cases from adversarial 103-agent synthesis run (Inbox Zero, Feynman AI)", "2026 founder validation tool landscape scan", "X signals on AI validator limitations (June 2026)"]
  };
}

// --- REAL_RESEARCH flag (server-only). Default false/stub. ---
const REAL_RESEARCH = process.env.REAL_RESEARCH === 'true';
// When true in future slices: replace the generate call inside processJob with real
// MCP / 10k-revenue-researcher / agent orchestration. Stub path remains for tests/dev.

async function processJob(jobId: string) {
  let job = await readJob(jobId);
  if (!job || job.status !== 'pending') return;

  job.status = 'processing';
  await writeJob(job);

  try {
    // Realistic processing latency so polling shows pending -> processing -> completed
    await new Promise((r) => setTimeout(r, 1400 + Math.random() * 2600));

    // Stub always produces realistic report (exercises full flow). REAL_RESEARCH=true will
    // route here to real impl later; for this slice we keep behavior identical but flag is read.
    const result = generateStubReport(job.idea);

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date().toISOString();
    await writeJob(job);
  } catch (e: any) {
    job.status = 'error';
    job.error = e?.message || 'Processing failed';
    job.completedAt = new Date().toISOString();
    await writeJob(job);
  }
}

// --- API handlers ---
export async function POST(request: NextRequest) {
  const { idea } = await request.json();

  if (!idea || typeof idea !== 'string' || !idea.trim()) {
    return NextResponse.json({ error: "Idea required" }, { status: 400 });
  }

  // Rate limit check (before enqueue)
  const ip = getClientIp(request);
  const { allowed } = await checkAndIncrementRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded: max 5 research jobs per IP per calendar day." },
      { status: 429 }
    );
  }

  const jobId = generateJobId();
  const job: Job = {
    jobId,
    status: 'pending',
    idea: idea.trim(),
    createdAt: new Date().toISOString(),
  };

  await writeJob(job);

  // Enqueue + fire-and-forget background work. Handler returns immediately with jobId.
  // (No blocking compute in request path. Works in Railway long-lived Node process.)
  processJob(jobId).catch((err) => {
    console.error('processJob error', jobId, err);
  });

  return NextResponse.json({ jobId });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: "jobId query param required" }, { status: 400 });
  }

  const job = await readJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const payload: {
    jobId: string;
    status: Job['status'];
    idea?: string;
    result?: ResearchReport;
    error?: string;
    createdAt?: string;
    completedAt?: string;
  } = {
    jobId: job.jobId,
    status: job.status,
  };

  if (job.idea) payload.idea = job.idea;
  if (job.createdAt) payload.createdAt = job.createdAt;
  if (job.completedAt) payload.completedAt = job.completedAt;

  if (job.status === 'completed' && job.result) {
    payload.result = job.result;
  } else if (job.status === 'error') {
    payload.error = job.error || 'Unknown error';
  }

  return NextResponse.json(payload);
}
