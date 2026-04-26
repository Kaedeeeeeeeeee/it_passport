/**
 * Render a JSON-LD `<script>` tag. Server component — no client interactivity.
 *
 * Usage:
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", ... }} />
 */
type Props = {
  data: object;
};

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // The data is built server-side from controlled inputs; JSON.stringify
      // safely escapes user content. We still avoid passing untrusted keys.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
