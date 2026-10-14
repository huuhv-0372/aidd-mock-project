import { z } from "zod";
import { LOCALES } from "@/lib/i18n/locales";

/** Input schema for the language switch Server Action: only the supported locale codes. */
export const localeSchema = z.enum(LOCALES);
