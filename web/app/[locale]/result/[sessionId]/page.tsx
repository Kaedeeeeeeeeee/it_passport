import { ResultClient } from "@/components/result/ResultClient";
import { isPro, requireAuth } from "@/lib/auth";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultPage({ params }: Props) {
  const { sessionId } = await params;
  const profile = await requireAuth(`/result/${sessionId}`);
  return (
    <ResultClient
      sessionId={sessionId}
      isPro={isPro(profile.subscription_status)}
    />
  );
}
