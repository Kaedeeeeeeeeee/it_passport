import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type SubmitBody = {
  sessionId: string;
  answers: Array<{
    questionId: string;
    letter: string | null;
    correct: boolean;
    answeredAt: number;
  }>;
  completedAt: number;
};

/** Finalise an exam session: insert attempts, mark session completed, record
 *  the correct count. Caller (ExamClient) posts once at submission time. */
export async function POST(request: Request) {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.sessionId || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Guard: session must exist and belong to user and not yet be completed.
  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, kind, completed_at")
    .eq("id", body.sessionId)
    .maybeSingle();
  if (!session || session.user_id !== auth.user.id || session.kind !== "exam") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (session.completed_at) {
    return NextResponse.json({ error: "already submitted" }, { status: 409 });
  }

  const rows = body.answers
    .filter((a) => a.letter !== null)
    .map((a) => ({
      user_id: auth.user!.id,
      question_id: a.questionId,
      answer: a.letter as string,
      correct: !!a.correct,
      attempted_at: new Date(a.answeredAt).toISOString(),
      session_id: body.sessionId,
    }));

  if (rows.length > 0) {
    const { error } = await admin.from("attempts").upsert(rows, {
      onConflict: "user_id,question_id,attempted_at",
      ignoreDuplicates: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const correctCount = body.answers.filter((a) => a.correct).length;
  const { error: updErr } = await admin
    .from("sessions")
    .update({
      completed_at: new Date(body.completedAt).toISOString(),
      correct_count: correctCount,
    })
    .eq("id", body.sessionId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correctCount });
}
