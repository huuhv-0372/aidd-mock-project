import type { Dictionary } from "../vi";
import { awards } from "./awards";
import { countdown } from "./countdown";
import { home } from "./home";
import { login } from "./login";
import { notFound } from "./not-found";
import { shell } from "./shell";

/** Typed `Dictionary`: a key missing from this locale is a compile error. */
export const en: Dictionary = { shell, home, awards, login, countdown, notFound };
