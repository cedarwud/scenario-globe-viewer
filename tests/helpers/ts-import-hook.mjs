// Module-resolution hook so `node --test` can run unit tests that import the
// app's TypeScript modules with extensionless relative specifiers
// (e.g. `import { x } from "./orbit-propagation"`). Node v24 strips TS types
// natively, but does NOT resolve extensionless `.ts` specifiers on its own.
//
// This hook does two things, neither of which transforms source (so Node's
// built-in type-stripping still runs on the resolved `.ts`):
//   1. Rewrites bare relative specifiers with no file extension to the matching
//      `.ts` / `.tsx` / `/index.ts` file when it exists on disk.
//   2. Injects the `{ type: "json" }` import attribute for `.json` specifiers.
//      TS modules import JSON without the attribute (resolveJsonModule), but
//      Node requires it; the type-stripper does not add it.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RELATIVE = /^\.\.?\//;
const HAS_EXTENSION = /\.[a-z0-9]+$/i;
const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function withJsonAttribute(result) {
  if (result.url.endsWith(".json")) {
    return {
      ...result,
      format: "json",
      importAttributes: { ...result.importAttributes, type: "json" },
    };
  }
  return result;
}

export async function resolve(specifier, context, nextResolve) {
  if (RELATIVE.test(specifier) && !HAS_EXTENSION.test(specifier)) {
    for (const suffix of CANDIDATE_SUFFIXES) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return withJsonAttribute(await nextResolve(specifier + suffix, context));
      }
    }
  }
  return withJsonAttribute(await nextResolve(specifier, context));
}
