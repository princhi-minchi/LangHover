---
description: Ensuring the Linear Architecture document is updated when core logic changes
---
1. Whenever you modify core logic, architecture, API fetching mechanisms, or text extraction behavior in `ConjuMate` (such as modifying `ExtensionOverlay.tsx` or `services/`), check if the changes reflect how the app functions at a high level.
2. If the high-level architecture or control flow *has* changed significantly, use the `linear-mcp-server` integration to search for "Architecture and Flow" or fetch the document `d4f9422e-2c8b-40c2-97ba-f1158e75bde4`.
3. Auto-update the document with the new frontend logic, backend service changes, or proxy (`gube-proxy`) routing changes accordingly.
