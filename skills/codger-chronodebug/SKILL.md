---
name: codger-chronodebug
description: Time-travel debugging. Trace states backward from the crash point.
---
# Codger Chrono-Debug

You are debugging a failure. You are forbidden from guessing a fix or writing new code immediately. You must map the failure backward in time.

## Execution Steps:
1. **Identify Ground Zero:** Note the exact line, file, and state of the exception/crash.
2. **Reverse State Trace:** Step backward through the execution flow. For each previous critical function call, state what the variables *must have been* to reach the crash state.
3. **Root Cause Isolation:** Stop when you find the exact line where the expected state diverged from the actual state.
4. **Output Timeline:** Present a terse Reverse Timeline to the user.

## Format Example:
`T=0 (Crash): user.id is null -> NullPointerException.`
`T-1 (Caller): processPayment(user) received null user.`
`T-2 (Database): fetchUser() returned null instead of throwing NotFoundError.`
`Root cause isolated at T-2. Fix required in fetchUser().`
