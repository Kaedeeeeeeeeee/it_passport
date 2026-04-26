import { ResultClient } from "@/components/result/ResultClient";
import { requireAuth } from "@/lib/auth";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultPage({ params }: Props) {
  const { sessionId } = await params;
  await requireAuth(`/result/${sessionId}`);
  return <ResultClient sessionId={sessionId} />;
}
