import type { Dictionary } from "../vi";
import { admin } from "./admin";
import { awards } from "./awards";
import { countdown } from "./countdown";
import { forbidden } from "./forbidden";
import { home } from "./home";
import { kudos } from "./kudos";
import { kudosCompose } from "./kudos-compose";
import { login } from "./login";
import { notFound } from "./not-found";
import { profile } from "./profile";
import { shell } from "./shell";
import { standards } from "./standards";

/** Typed `Dictionary`: a key missing from this locale is a compile error. */
export const en: Dictionary = { shell, home, awards, login, countdown, notFound, forbidden, kudos, kudosCompose, standards, profile, admin };
