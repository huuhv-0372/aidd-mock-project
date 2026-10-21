import { awards } from "./awards";
import { countdown } from "./countdown";
import { home } from "./home";
import { kudos } from "./kudos";
import { kudosCompose } from "./kudos-compose";
import { login } from "./login";
import { notFound } from "./not-found";
import { shell } from "./shell";
import { standards } from "./standards";

/** Source of truth for the dictionary shape: messages/en is typed `Dictionary`, so a missing key fails the build. */
export const vi = { shell, home, awards, login, countdown, notFound, kudos, kudosCompose, standards };

export type Dictionary = typeof vi;
