/**
 * JSON-LD Script component for injecting structured data (#630).
 *
 * Usage:
 * <JsonLdScript data={generateSongJsonLd(song)} />
 */

interface JsonLdScriptProps {
  data: string;
  id?: string;
}

export function JsonLdScript({ data, id }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}
