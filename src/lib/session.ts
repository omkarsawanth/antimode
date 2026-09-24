import fs from "fs";
import path from "path";
import { SessionState, StageTrackerItem } from "@/types/schemas";

const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

// Ensure directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory cache
const memorySessions = new Map<string, SessionState>();

export function getSession(id: string): SessionState | null {
  if (memorySessions.has(id)) {
    return memorySessions.get(id)!;
  }

  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      const session = JSON.parse(data) as SessionState;
      memorySessions.set(id, session);
      return session;
    } catch (err) {
      console.error(`Failed to read session file ${filePath}:`, err);
    }
  }

  return null;
}

export function saveSession(session: SessionState): SessionState {
  session.updated_at = new Date().toISOString();
  memorySessions.set(session.id, session);

  try {
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to mirror session ${session.id} to disk:`, err);
  }

  return session;
}

export function createSession(initialId?: string): SessionState {
  const id = initialId || `antimode-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newSession: SessionState = {
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage: 1,
    history: [
      {
        stage: 1,
        agent: "Session Initializer",
        input_summary: "New session started",
        output_summary: "Ready for strategic interview",
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return saveSession(newSession);
}

export function logStageHistory(
  session: SessionState,
  entry: Omit<StageTrackerItem, "timestamp">
): void {
  session.history.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}
