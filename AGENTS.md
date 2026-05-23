# Coding principles

Standing rules for any AI assistant working in this repo — apply them on every change.

1. **Think before coding.** State your assumptions. Ask when unsure. Never guess.
2. **Simplicity first.** Write the minimum code that solves the problem — nothing extra.
3. **Surgical changes.** Touch only what was asked. Every line should trace back to the request.
4. **Verify the goal.** Turn a vague instruction into a check that proves it works — before writing the code.

Project-specific gotchas, conventions, and current state live in **HANDOVER.md** (read §0 first).

_Source: https://x.com/coinbureau/status/2057700847187021967_

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
