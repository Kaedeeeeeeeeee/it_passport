import { Topbar } from "./Topbar";

export function ComingSoon({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar subtitle={subtitle} title={title} />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="card max-w-md w-full text-center">
          <div className="t-label mb-2">近日公開</div>
          <p className="text-sm leading-relaxed text-ink-2">{note}</p>
        </div>
      </div>
    </div>
  );
}
