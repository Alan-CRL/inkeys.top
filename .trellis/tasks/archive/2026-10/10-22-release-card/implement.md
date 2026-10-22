# Implementation

1. Read curated specs and source. Preserve CRLF/encoding. User reviewed and approved plan; start authorized.
2. Implement release card, no-download geometry, clipping/accessibility, compact parallax, responsive SSR behavior. Main owns task artifacts/spec updates; implement agent owns affected components and release regression.
3. Adapt .trellis/tasks/10-19-new-index3-release/verify-release.cjs to new requirements while retaining meaningful lifecycle/default behavior tests. Run node script and pnpm docs:build (no repo lint/typecheck command exists).
4. Checker reviews/fixes against approved plan; run windowless browser checks if available, with screenshots under task ignored/temp output; never open visible GUI. Verify light/dark viewport matrix, noJS, focused controls, no horizontal overflow.
5. Main updates obsolete release spec; inspect final diff and report changes/tests/limitations. No git commit/push. Preserve initial untracked design-drafts/, docs.zip, NewHome2/, new-index2.md.

Python runtime: C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe (system alias broken). Bundled Node packages available at sibling dependencies/node/node_modules for windowless browser tools.