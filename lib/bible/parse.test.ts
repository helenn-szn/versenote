import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReference, findReferenceAtEnd, formatReference } from "./parse.ts";

const f = (s: string) => {
  const r = parseReference(s);
  return r ? formatReference(r) : null;
};

test("abbreviated and full references", () => {
  assert.equal(f("Gen 1:1"), "Genesis 1:1");
  assert.equal(f("gen. 1:1"), "Genesis 1:1");
  assert.equal(f("John 3:16-18"), "John 3:16-18");
  assert.equal(f("Jn 3:16"), "John 3:16");
  assert.equal(f("Rom 8v28"), "Romans 8:28");
  assert.equal(f("Ps 23"), "Psalms 23");
  assert.equal(f("Psalm 119:105"), "Psalms 119:105");
  assert.equal(f("Isa 43:19"), "Isaiah 43:19");
  assert.equal(f("Rev 21:4–5"), "Revelation 21:4-5");
  assert.equal(f("Song of Solomon 2:4"), "Song of Solomon 2:4");
});

test("numbered books", () => {
  assert.equal(f("1 Cor 13:4"), "1 Corinthians 13:4");
  assert.equal(f("1cor 13:4-7"), "1 Corinthians 13:4-7");
  assert.equal(f("2 Corinthians 5:17"), "2 Corinthians 5:17");
  assert.equal(f("First John 1:9"), "1 John 1:9");
  assert.equal(f("II Kings 2:11"), "2 Kings 2:11");
  assert.equal(f("1 Pet 5:7"), "1 Peter 5:7");
});

test("spoken style", () => {
  assert.equal(f("Romans chapter 8 verse 28"), "Romans 8:28");
  assert.equal(f("Romans chapter eight verse twenty-eight"), "Romans 8:28");
  assert.equal(f("Romans 8 verses 28 to 30"), "Romans 8:28-30");
  assert.equal(f("Philippians four thirteen"), "Philippians 4:13");
  assert.equal(f("Psalm one hundred and nineteen verse one hundred and five"), "Psalms 119:105");
});

test("rejects non-references", () => {
  assert.equal(f("hello world"), null);
  assert.equal(f("Genesis 51:1"), null); // Genesis has 50 chapters
  assert.equal(f("Jude 2:1"), null);
  assert.equal(f("page 5:3"), null);
});

test("detects a reference just typed at the end of a note", () => {
  const a = findReferenceAtEnd("The pastor said Gen 1:1");
  assert.equal(a && formatReference(a.ref), "Genesis 1:1");
  assert.equal(a?.start, "The pastor said ".length);

  const b = findReferenceAtEnd("Turn with me to Romans chapter 8 verse 28 ");
  assert.equal(b && formatReference(b.ref), "Romans 8:28");

  const c = findReferenceAtEnd("Read 1 Cor 13:4-7");
  assert.equal(c && formatReference(c.ref), "1 Corinthians 13:4-7");
  assert.equal(c?.start, "Read ".length);

  assert.equal(findReferenceAtEnd("I'll mark 2 things"), null);
  assert.equal(findReferenceAtEnd("We read acts 2"), null); // chapter only: not auto-detected
  assert.equal(findReferenceAtEnd("No verse here"), null);
});
