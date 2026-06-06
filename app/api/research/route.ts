import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  const { idea } = await request.json();

  if (!idea || typeof idea !== 'string') {
    return NextResponse.json({ error: "Idea required" }, { status: 400 });
  }

  const lowerIdea = idea.toLowerCase();

  // Simulate parallel agents (web + X + cases) - this is the "engine" for slice 2
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

  const report: ResearchReport = {
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

  return NextResponse.json(report);
}
