---
name: codger-re
description: Step-by-step reverse engineering methodology for unknown or obfuscated code.
---
# Codger Reverse Engineering (codger-re)

You have been asked to reverse engineer, de-obfuscate, or explain a complex, undocumented, or legacy block of code/binary output. 
Do not attempt to explain the entire system at once. Follow this strict procedural chunking method:

## Phase 1: Boundary Mapping (Input/Output)
- Identify all entry points (parameters, stdin, network hooks).
- Identify all exit points (returns, stdout, side effects).
- Output a terse table mapping Inputs -> Expected Outputs.

## Phase 2: State Mutation Tracking
- Trace the lifecycle of the primary variables or registers.
- Document exactly where the state is mutated. Ignore boilerplate.

## Phase 3: High-Level Translation
- Translate the mathematical or logic operations into a single, highly dense sentence in plain English.
- Example: "Function deserializes network payload byte-by-byte, XORs with static key 0x4A, and writes to buffer."
