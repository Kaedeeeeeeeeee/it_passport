import { NextResponse } from "next/server";
import { userFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AttemptIn = {
  questionId: string;
  answer: string;
  correct: boolean;
  timestamp: number;
  localSessionId?: string;
};

type SessionIn = {
  localId: string;
  kind: "practice" | "exam" | "review";
  source?: unknown;
  startedAt: number;
  completedAt?: number;
  questionCount: number;
  correctCount?: number;
};

/** POST: batch-ingest client attempts into Supabase for the signed-in user.
 *  Auth: cookie (web) or `Authorization: Bearer <jwt>` (native iOS).
 *  Optionally create/update a session row and tag attempts with its id.
 *  Dedup via unique(user_id, question_id, attempted_at). */
export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: { attempts?: AttemptIn[]; session?: SessionIn };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = user.id;
  const admin = supabaseAdmin();

  let sessionId: string | undefined;
  if (body.session) {
    const s = body.session;
    const { data, error } = await admin
      .from("sessions")
      .insert({
        user_id: userId,
        kind: s.kind,
        source: s.source ?? null,
        started_at: new Date(s.startedAt).toISOString(),
        completed_at: s.completedAt
          ? new Date(s.completedAt).toISOString()
          : null,
        question_count: s.questionCount,
        correct_count: s.correctCount ?? null,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    sessionId = data.id as string;
  }

  const attempts = body.attempts ?? [];
  const rows = attempts.map((a) => ({
    user_id: userId,
    question_id: a.questionId,
    answer: a.answer,
    correct: !!a.correct,
    attempted_at: new Date(a.timestamp).toISOString(),
    session_id:
      sessionId && a.localSessionId === body.session?.localId
        ? sessionId
        : null,
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await admin
      .from("attempts")
      .upsert(rows, {
        onConflict: "user_id,question_id,attempted_at",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    inserted = count ?? 0;
  }

  return NextResponse.json({ inserted, sessionId });
}
