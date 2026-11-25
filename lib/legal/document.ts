import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface LegalSection {
  id: string;
  heading: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

function slug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseLegalMarkdown(source: string): LegalDocument {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = match?.[1] ?? '';
  const body = (match?.[2] ?? source).trim();
  const read = (key: string) => meta.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
  const sections: LegalSection[] = [];
  for (const block of body.split(/\n(?=## )/)) {
    const lines = block.trim().split('\n');
    if (!lines[0]?.startsWith('## ')) continue;
    const heading = lines[0].replace(/^## /, '').trim();
    sections.push({
      id: slug(heading),
      heading,
      body: lines.slice(1).join('\n').trim(),
    });
  }
  return {
    title: read('title'),
    description: read('description'),
    updated: read('updated'),
    sections,
  };
}

export function loadLegalDocument(name: 'privacy' | 'terms'): LegalDocument {
  const file = path.join(process.cwd(), 'content', 'legal', `${name}.md`);
  return parseLegalMarkdown(readFileSync(file, 'utf8'));
}
