---
name: codger-ephemeral
description: Self-destructing tech debt logic. Creates cleanup scripts alongside temporary code.
---
# Codger Ephemeral Code

The user has requested temporary code, a throwaway script, a hotfix, or an experimental feature.

## Execution Rules:
1. **Acknowledge Debt:** State that this code is considered "Ephemeral Tech Debt".
2. **Implementation:** Write the requested code.
3. **The Cleanup Mandate:** You MUST simultaneously generate a cleanup script (e.g., `cleanup_feature_X.sh`, or a database rollback script) or wrap the code in a strictly dated feature flag.
4. The user should be able to run the cleanup script to perfectly revert the project to its pristine state once the experiment is over.
