import type { Locale } from "../config";
import en, { type Dict } from "./en";
import fr from "./fr";
import es from "./es";
import pt from "./pt";
import sw from "./sw";
import ko from "./ko";
import zh from "./zh";

export type { Dict };
export const DICTS: Record<Locale, Dict> = { en, fr, es, pt, sw, ko, zh };
