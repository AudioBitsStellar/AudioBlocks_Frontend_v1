import type { Metadata } from 'next';

const TITLE = 'Accessibility Statement | AudioBlocks';
const DESCRIPTION =
  'AudioBlocks’ commitment to accessibility, the standards we target, known limitations, and how to reach us about an accessibility issue.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
  },
};

const sections = [
  {
    heading: 'Our commitment',
    content: (
      <p>
        AudioBlocks is committed to making the listener app usable by as many people as possible,
        including people who use assistive technology such as screen readers, voice control, or
        keyboard-only navigation. Accessibility is an ongoing effort, not a one-time project, and
        we revisit this statement as the app changes.
      </p>
    ),
  },
  {
    heading: 'Standard we target',
    content: (
      <p>
        We aim to conform to the{' '}
        <a
          className="underline"
          href="https://www.w3.org/WAI/standards-guidelines/wcag/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Web Content Accessibility Guidelines (WCAG) 2.1
        </a>{' '}
        at level AA. That covers things like sufficient color contrast, text alternatives for
        non-text content, keyboard operability, and clear focus indicators.
      </p>
    ),
  },
  {
    heading: 'What we have done so far',
    content: (
      <ul className="list-disc space-y-2 pl-6">
        <li>Skip-to-content landmark and a main content region on every page.</li>
        <li>Visible focus outlines on interactive controls, including modals and menus.</li>
        <li>Semantic headings and labelled form fields across onboarding, dashboard, and settings.</li>
        <li>
          Warnings and destructive confirmations (for example, wallet and purchase flows) are
          announced as text, not conveyed by color alone.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Known limitations',
    content: (
      <>
        <p>
          Some parts of the app are still catching up to this standard. Known gaps we are tracking
          include:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Audio players and waveform visualizations rely on visual cues that do not yet have a
            complete non-visual equivalent.
          </li>
          <li>
            Some third-party embeds (wallet connection widgets) are controlled by their providers
            and may not fully match our accessibility bar.
          </li>
          <li>Not every page has been tested with a screen reader end-to-end.</li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Feedback and contact',
    content: (
      <p>
        If you encounter an accessibility barrier using AudioBlocks, please tell us at{' '}
        <a className="underline" href="mailto:accessibility@audioblocks.app">
          accessibility@audioblocks.app
        </a>
        . Include the page you were on, the assistive technology or browser you used, and a
        description of what happened. We aim to acknowledge reports within 5 business days.
      </p>
    ),
  },
];

export default function AccessibilityStatementPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Accessibility Statement</h1>
        <p className="mt-3 text-on-muted">Last updated: 2026-11-20</p>
      </header>
      <div className="space-y-8">
        {sections.map(({ heading, content }) => (
          <section key={heading} className="space-y-3">
            <h2 className="text-xl font-semibold">{heading}</h2>
            <div className="space-y-3 leading-relaxed text-on-muted">{content}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
