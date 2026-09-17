# HH Reply AI — audit plan

## Base
- Gemini `main` is the baseline.
- Qwen PR #1 is not merged into this branch.

## Current pass
1. Make vacancy extraction resilient to HH.ru SPA rendering and navigation.
2. Prevent stale vacancy data and stale badge state after navigation.
3. Keep deterministic local/mock mode as the safe default.
4. Keep AI behind the service abstraction; no client-side secrets.
5. Add explicit build/typecheck checks to the project scripts.

## Next pass
- Add server proxy implementation for `/api/analyze`, `/api/generate-cover-letter`, and `/api/rewrite-cover-letter`.
- Validate the unpacked extension in Chrome on real HH.ru vacancy pages.
- Run an independent Qwen code review after the implementation is stable.
