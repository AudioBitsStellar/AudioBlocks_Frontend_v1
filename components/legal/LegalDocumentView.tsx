import type { LegalDocument } from '@/lib/legal/document';

export default function LegalDocumentView({ document }: { document: LegalDocument }) {
  const updatedLabel = new Date(`${document.updated}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-on-muted">
      <p className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        Draft — pending legal review
      </p>
      <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">{document.title}</h1>
      <p className="mb-8 text-sm">
        Last updated{' '}
        <time dateTime={document.updated}>{updatedLabel}</time>
      </p>
      <nav aria-label="Table of contents" className="mb-10 rounded-lg border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
          On this page
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a className="underline underline-offset-2 hover:text-white" href={`#${section.id}`}>
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {document.sections.map((section) => (
        <section key={section.id} className="mb-8 scroll-mt-24" id={section.id}>
          <h2 className="mb-2 text-xl font-semibold text-white">{section.heading}</h2>
          {section.body.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="mb-3 leading-7">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
