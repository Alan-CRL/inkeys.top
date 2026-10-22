# Implementation
1. Task is approved; implement two owned modules in parallel using Trellis implement agents. Read relevant JSONL/spec and task docs. Native context injection preferred.
2. Frame agent writes verify-frame.cjs in task; ambient agent writes verify-ambient.cjs in task. Run own tests; defer full production build to main after integration.
3. Main runs existing release/hero regressions as appropriate, production pnpm docs:build. Separate check agent reviews/fixes after implementation.
4. Headless verification uses bundled Playwright and system Edge. launchServer + connect + browserServer.kill avoids Windows pipe shutdown hang. Sandbox Edge fails crashpad pipe; authorized require_escalated headless execution succeeded prior turn. Never launch visible browser. Build can use caches.
5. Main updates spec, saves validation, archive/journal with --no-commit (user forbids commits), final diff review.

Python C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe; bundled playwright C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright. Working tree already has prior card changes + unrelated untracked design-drafts/,docs.zip,NewHome2/,new-index2.md. Preserve all.