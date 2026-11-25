import { contentToDoc, docText } from "./notes/doc";

export type Verse = { verse: number; text: string };

export type TextBlock = { id: string; type: "text"; text: string };
export type ScriptureBlock = {
  id: string;
  type: "scripture";
  reference: string;
  translation: string;
  verses: Verse[];
};
export type Block = TextBlock | ScriptureBlock;

// Stored in notes.content (jsonb). Version 2 holds a rich-text doc; version 1 (older notes) holds blocks.
export type NoteContent = {
  version: 1 | 2;
  sermon_slug?: string;
  doc?: import("./notes/doc").Doc;
  blocks?: Block[];
};

export type Note = {
  id: string;
  sermon_id: string | null;
  title: string | null;
  preacher_name: string | null;
  sermon_date: string | null;
  content: NoteContent;
  updated_at: string;
};

export type SharedScripture = { position: number; reference: string; translation: string; verse_text: string };

// Returned by the get_shared_sermon() database function
export type SharedSermon = {
  id: string;
  slug: string;
  title: string;
  preacher_name: string | null;
  sermon_date: string | null;
  outline: string | null;
  recording_url: string | null;
  questions_open: boolean;
  scriptures: SharedScripture[];
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export function emptyContent(slug?: string): NoteContent {
  return { version: 2, ...(slug ? { sermon_slug: slug } : {}), doc: { type: "doc", content: [{ type: "paragraph" }] } };
}

// Shared scriptures store their verses as JSON in verse_text; fall back to plain text.
export function sharedVerses(s: SharedScripture): Verse[] {
  try {
    const parsed = JSON.parse(s.verse_text);
    if (Array.isArray(parsed)) return parsed as Verse[];
  } catch {}
  return [{ verse: 0, text: s.verse_text }];
}

export function noteText(content: NoteContent): string {
  return docText(contentToDoc(content));
}
