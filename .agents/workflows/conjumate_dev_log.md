---
description: Automatically logging all developer changes and local bug testing directly into the ConjuMate Dev Log on Linear.
---
# Workflow: ConjuMate Live Developer Log

Whenever the AI modifies the code during this session—even for local bug testing—it must update the "ConjuMate Dev Log" (Document URL: https://linear.app/conjumate/document/change-log-a790ec64aa16) before the session ends.

## 1. Entry Format
Add a new entry at the top of the "Changelog" section. Use the following table structure to track both technical details and simple meanings.

### Date: [Current Date] | Session Status: [e.g., "Local Bug Testing" or "Feature Implementation"]

| Technical Change (Jargon) | What this actually means (Simple) | Status |
| :--- | :--- | :--- |
| "Patched `fetchConjugations` to handle null responses in `ultralinguaService.ts`." | "Fixed the bug where the extension would freeze if it couldn't find a specific verb." | ✅ Local Fix |
| "Initialized `PT` and `ES` language codes in `languageMapping.ts`." | "Started adding the foundation for Spanish and Portuguese support." | 🚧 Work in Progress |

## 2. Testing Notes
If this session was for debugging, add a brief note:
- **What I learned:** [e.g., "The rate limiter triggers faster than expected on local 'localhost:5173' environments."]

## 3. Execution Trigger
- Run this update via `linear-mcp-server` whenever a meaningful change is made to the repository.
- Do not wait for the code to be "finalized" or "pushed" to document it.
