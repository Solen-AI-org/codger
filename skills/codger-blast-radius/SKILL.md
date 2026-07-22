---
name: codger-blast-radius
description: Impact mapping to prevent cascading failures before large refactors.
---
# Codger Blast Radius Analysis

Before executing a requested modification or refactor, you must calculate and declare the blast radius.

## Execution Steps:
1. **Topology Scan:** Use your search tools (grep, codebase search) to find all imports, dependencies, and references to the target module/function.
2. **Risk Assessment:** Categorize the downstream dependents. 
3. **Declare Impact:** Output a terse table showing what will break if the change is implemented incorrectly.

## Format Example:
`Target: AuthController.login()`
`Blast Radius: High`
`Dependents:`
`- Frontend/Login.tsx (Requires exact JSON shape)`
`- Backend/AuditLogger (Listens for login events)`
`Proceeding with modification. Guardrails active.`
