import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware navigation helpers. Use these instead of `next/link` and
 *  `next/navigation` in client components so locale prefixes stay in sync. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
