# Freebuff Execution Profile — 2026-10-22
Status: workflow configuration guidance; NOT an installed or tested unattended runner.
Primary coding environment: Freebuff CLI or Desktop on Windows with Godot 4 installed; Freebuff Cloud only if environment supports required Godot commands. Source: https://github.com/CodebuffAI/freebuff

## Agent bootstrap
Freebuff/Codebuff recognizes root knowledge.md, AGENTS.md and CLAUDE.md; knowledge.md takes precedence per directory (https://www.codebuff.com/docs/help/faq). Keep knowledge.md short and point to docs/MODEL_CONTEXT_ARCHIVE.md, WORKFLOW.md, and docs/IMPLEMENTATION_STATUS.md. Do not duplicate giant prompts. Use @file references when possible. Ensure root AGENTS.md remains synchronized.

## Model routing — check live picker before use
Default unmetered/high-volume tasks: DeepSeek V4.1 Flash for bounded GDScript implementation, refactoring and test repairs; GLM 5.3 Flash for deeper reasoning and integration design; MiMo v2.6 Flash Fast for lightweight edits and context; Solar Mini/Pro 4 for large-context text reviews if available. Escalate to stronger limited-session models only for cross-layer architecture, hard bugs or complex reviews; do not hardcode access assumptions. Catalog/limits may change. Source: https://github.com/CodebuffAI/freebuff

## Context budget and task size
Every task prompt must specify ONE measurable outcome, owned file paths, dependency interfaces, 3-8 acceptance checks and exact Godot CLI validation command. Read only the relevant archive sections plus contracts. Prefer changes under 5-10 files per iteration; avoid broad simultaneous rewrites. Every agent ends with concise handoff: files changed, tests run and actual results, blockers, next step. Commit after verified green checkpoint. Maintain docs/IMPLEMENTATION_STATUS.md and a small queue of unblocked tasks.

## Work allocation
Coordinator: GLM reasoning and milestone scheduling; editor: DeepSeek Flash small implementation patches; reviewer: independent model/checklist; tester: run Godot headless import, GDScript parse and smoke tests, inspect logs; integrator: merge serially and retest. Freebuff has its own specialized agents, so first use built-ins rather than writing custom orchestration. Desktop supports isolated parallel workspaces; parallel tasks must own separate files. Avoid executing untrusted registry agent code; review agent definitions before enabling.

## Repeatable operating loop
1. Read knowledge.md and status.
2. Inspect repo/installed tools; verify Godot executable.
3. Choose highest-priority unblocked P0/P1/P2 milestone from WORKFLOW.md.
4. Implement smallest vertical feature, with an automated test.
5. Run tests and engine import; fix failures.
6. Update status, architecture decision log when needed, commit and continue.
7. If model session ends or free quota runs out, resume from git and status without relying on chat memory.
8. Never invent a background scheduler, persistent session or completed test. Multi-day autonomy requires a running machine or supported cloud environment, account limits and external supervision. No guaranteed delivery date.

## Windows validation examples
Godot executable path must be discovered, not assumed.
godot --headless --path godot --editor --quit
godot --headless --path godot --quit-after 60
If test framework exists, invoke its documented test command; otherwise implement a headless smoke test scene with assert and nonzero exit on failure. Confirm exit codes and capture logs.

## First user prompt to Freebuff
Read @knowledge.md @WORKFLOW.md @docs/MODEL_CONTEXT_ARCHIVE.md @docs/IMPLEMENTATION_STATUS.md. You are the integration coordinator. Inspect the actual Godot project, verify the Godot executable and baseline import, then complete the highest-priority unblocked milestone. Implement small patches, run actual headless tests, fix errors, commit verified increments, and update status after each checkpoint. Keep one persistent world across zoom layers and delegated AI. If blocked, record exact reproduction and continue with an independent task. Do not claim an untested build works.
