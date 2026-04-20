import { ResultClient } from "@/components/result/ResultClient";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResultPage({ params }: Props) {
  const { sessionId } = await params;
  return <ResultClient sessionId={sessionId} />;
}
