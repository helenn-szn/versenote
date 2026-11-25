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

test("references in other languages", () => {
  assert.equal(f("Jean 3:16"), "John 3:16");
  assert.equal(f("Ésaïe 43:19"), "Isaiah 43:19");
  assert.equal(f("esaie 43:19"), "Isaiah 43:19");
  assert.equal(f("1 Corinthiens 13:4-7"), "1 Corinthians 13:4-7");
  assert.equal(f("Jean chapitre 3 verset 16"), "John 3:16");
  assert.equal(f("Juan 3:16"), "John 3:16");
  assert.equal(f("Hechos 2:38"), "Acts 2:38");
  assert.equal(f("Salmos 23:1"), "Psalms 23:1");
  assert.equal(f("João 3:16"), "John 3:16");
  assert.equal(f("Romanos 8:28"), "Romans 8:28");
  assert.equal(f("Yohana 3:16"), "John 3:16");
  assert.equal(f("Mambo ya Walawi 19:18"), "Leviticus 19:18");
  assert.equal(f("Kumbukumbu la Torati 6:5"), "Deuteronomy 6:5");
  assert.equal(f("Zaburi 23"), "Psalms 23");
  assert.equal(f("요한복음 3:16"), "John 3:16");
  assert.equal(f("요 3:16"), "John 3:16");
  assert.equal(f("로마서 8장 28절"), "Romans 8:28");
  assert.equal(f("约翰福音3:16"), "John 3:16");
  assert.equal(f("约翰福音 3：16"), "John 3:16");
  assert.equal(f("罗马书8章28节"), "Romans 8:28");
  assert.equal(f("诗篇 23"), "Psalms 23");
});

test("detects references typed in other languages", () => {
  const a = findReferenceAtEnd("Le pasteur a lu Jean 3:16");
  assert.equal(a && formatReference(a.ref), "John 3:16");
  assert.equal(a?.start, "Le pasteur a lu ".length);
  const b = findReferenceAtEnd("我们今天读约翰福音3:16");
  assert.equal(b && formatReference(b.ref), "John 3:16");
  assert.equal(b?.start, "我们今天读".length);
  const c = findReferenceAtEnd("Mchungaji alisoma Mambo ya Walawi 19:18");
  assert.equal(c && formatReference(c.ref), "Leviticus 19:18");
});
