import { notFound } from "next/navigation";
import { PracticeClient } from "@/components/practice/PracticeClient";
import { requireAuth } from "@/lib/auth";
import { resolveSession } from "@/lib/session-resolver";

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PracticePage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  await requireAuth(`/practice/${sessionId}`);
  const search = await searchParams;
  const resolved = await resolveSession(sessionId, search);
  if (!resolved) notFound();
  return (
    <PracticeClient
      slug={sessionId}
      label={resolved.label}
      questions={resolved.questions}
    />
  );
}
