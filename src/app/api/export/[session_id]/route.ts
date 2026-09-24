import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getFixtureForIdea } from "@/lib/fixtures";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const session = getSession(session_id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const fixture = getFixtureForIdea(session.brief?.idea || "");
  const brandKit = session.brand_kit || fixture.brand_kit;
  const { summary, direction, scores, spec, launch } = brandKit;

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json(brandKit);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Antimode Brand Kit — ${direction.name}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(direction.visual.typography.heading)}:wght@600;700;800&family=${encodeURIComponent(direction.visual.typography.body)}:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${direction.visual.palette[0]?.hex || "#111"};
      --accent: ${direction.visual.palette[1]?.hex || "#FF5722"};
      --surface: ${direction.visual.palette[3]?.hex || "#FAFAFA"};
      --font-heading: "${direction.visual.typography.heading}", -apple-system, sans-serif;
      --font-body: "${direction.visual.typography.body}", -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0D0E12;
      color: #E2E8F0;
      font-family: var(--font-body);
      line-height: 1.6;
      padding: 40px 24px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid #232733;
      padding-bottom: 28px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .badge {
      display: inline-block;
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 4px 10px;
      border: 1px solid #3B82F6;
      color: #60A5FA;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    h1 {
      font-family: var(--font-heading);
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFF;
      line-height: 1.1;
    }
    .tagline {
      font-size: 20px;
      color: #94A3B8;
      margin-top: 8px;
    }
    .scores-row {
      display: flex;
      gap: 16px;
      margin: 24px 0 40px;
      padding: 16px 20px;
      background: #141721;
      border: 1px solid #232733;
      border-radius: 8px;
      font-family: "JetBrains Mono", monospace;
    }
    .score-item {
      flex: 1;
    }
    .score-label {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
    }
    .score-val {
      font-size: 22px;
      font-weight: 700;
      color: #10B981;
    }
    .score-val.fail {
      color: #EF4444;
    }
    .section-title {
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748B;
      border-bottom: 1px solid #232733;
      padding-bottom: 8px;
      margin: 40px 0 20px;
    }
    .card {
      background: #141721;
      border: 1px solid #232733;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .palette-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 12px;
    }
    .swatch {
      height: 90px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 12px;
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
      font-weight: 600;
    }
    .rules-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rules-list li {
      padding: 10px 14px;
      background: #191E2B;
      border-left: 3px solid #3B82F6;
      border-radius: 0 4px 4px 0;
      font-size: 14px;
    }
    .banned-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .chip {
      background: #2D1515;
      color: #F87171;
      border: 1px solid #7F1D1D;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: "JetBrains Mono", monospace;
      text-decoration: line-through;
    }
    .launch-box {
      background: #191E2B;
      border: 1px solid #2A3245;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .launch-box h3 {
      font-family: var(--font-heading);
      font-size: 24px;
      color: #FFF;
      margin-bottom: 10px;
    }
    .social-post {
      background: #131722;
      border-left: 3px solid #10B981;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 12px;
      font-size: 14px;
      color: #CBD5E1;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #3B82F6;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    }
    @media print {
      body { background: white; color: black; padding: 0; }
      .print-btn { display: none; }
      .card, .scores-row, .launch-box, .social-post { background: #F8F9FA; border-color: #E2E8F0; color: #1E293B; }
      h1, .launch-box h3 { color: #0F172A; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <span class="badge">Machine-Enforced Brand Kit</span>
        <h1>${direction.name}</h1>
        <div class="tagline">${direction.tagline}</div>
      </div>
      <div style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748B;">
        Session: ${session_id}<br>
        Framework: Antimode
      </div>
    </header>

    <div class="scores-row">
      <div class="score-item">
        <div class="score-label">Genericness Score</div>
        <div class="score-val ${scores.genericness <= 55 ? "" : "fail"}">${scores.genericness} / 100</div>
      </div>
      <div class="score-item">
        <div class="score-label">Perception Gap</div>
        <div class="score-val ${scores.perception_gap <= 0.4 ? "" : "fail"}">${scores.perception_gap} / 1.0</div>
      </div>
      <div class="score-item">
        <div class="score-label">Antimode Verification</div>
        <div class="score-val ${scores.pass ? "" : "fail"}">${scores.pass ? "PASSED" : "FAILED"}</div>
      </div>
    </div>

    <div class="section-title">01. Strategic Stance & Positioning</div>
    <div class="card">
      <p style="font-size: 16px; margin-bottom: 16px;"><strong>Positioning:</strong> ${direction.positioning}</p>
      <p style="font-size: 15px; color: #94A3B8; margin-bottom: 16px;"><strong>Value Proposition:</strong> ${direction.value_proposition}</p>
      <p style="font-size: 14px; color: #64748B;"><strong>Target Persona:</strong> ${summary.audience.primary} — ${summary.audience.context}</p>
    </div>

    <div class="section-title">02. Visual Language & Typography</div>
    <div class="card">
      <div style="margin-bottom: 16px;">
        <strong>Typography Pairing:</strong>
        <span style="font-family: var(--font-heading); font-size: 18px; margin-left: 10px;">${direction.visual.typography.heading} (Heading)</span>
        <span style="color: #64748B; margin: 0 8px;">/</span>
        <span style="font-family: var(--font-body); font-size: 15px;">${direction.visual.typography.body} (Body)</span>
      </div>
      <div class="palette-grid">
        ${direction.visual.palette.map((c) => `
          <div class="swatch" style="background-color: ${c.hex}; color: ${c.hex === "#FFFFFF" || c.hex.toLowerCase().startsWith("#f") ? "#000" : "#FFF"};">
            <div>${c.name}</div>
            <div style="font-size: 11px; opacity: 0.8;">${c.hex} · ${c.role}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="section-title">03. Hardened BrandSpec (Machine-Checkable)</div>
    <div class="card">
      <h4 style="margin-bottom: 10px; font-size: 14px; text-transform: uppercase; color: #94A3B8;">Voice Rules:</h4>
      <ul class="rules-list">
        ${spec.voice_rules.map((rule) => `<li>${rule}</li>`).join("")}
      </ul>

      <h4 style="margin-top: 24px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #94A3B8;">Banned Words & Clichés:</h4>
      <div class="banned-chips">
        ${spec.banned_words.map((w) => `<span class="chip">${w}</span>`).join("")}
      </div>
    </div>

    <div class="section-title">04. Launch Collateral</div>
    <div class="card">
      <div class="launch-box">
        <h3>${launch.landing_headline}</h3>
        <p style="font-size: 16px; color: #CBD5E1;">${launch.subhead}</p>
        <p style="margin-top: 12px; font-size: 14px; color: #38BDF8; font-weight: 600;">Pitch: ${launch.one_line_pitch}</p>
      </div>

      <h4 style="margin: 20px 0 10px; font-size: 14px; text-transform: uppercase; color: #94A3B8;">Launch Announcements:</h4>
      ${launch.social_posts.map((post) => `<div class="social-post">${post}</div>`).join("")}
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">Export / Print PDF</button>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
