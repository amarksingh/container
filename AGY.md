# @ostro/container — Antigravity AI Architecture & Knowledge Base

> **Package Name**: `@ostro/container`
> **Version**: `1.0.5`
> **Role in Ecosystem**: Modular Core Framework Library

---

## 1. Package Purpose & Overview
Inversion of control (IoC) dependency injection container with singleton bindings, factories, and contextual resolution.

- **Primary Architectural Patterns**: Service locator, dynamic resolution with reflection and class checks, macro extension.
- **Key Exported Entities**: `Application (Container)`

---

## 2. Dependencies & Interoperability
- **Direct Dependencies**:
  - `@ostro/support`: `^1.2.0`
  - `@ostro/contracts`: `^1.0.0`
  - `lodash.set`: `^4.3.2`
- **Framework Consumers**: Consumed across the OstroJS ecosystem via `@ostro/framework` and direct imports.

---

## 3. Directory & Source Layout
```text
origin/container/
├── application.ts
```

---

## 4. TypeScript Typing & Code Standards
1. **Access Modifiers**: All class properties and methods declare explicit visibility (`public`, `protected`, `private`).
2. **Inheritance & Overrides**: Classes overriding base class methods use the `override` keyword to safeguard contracts.
3. **Immutability**: Constant lookup tables and static registries use `readonly` and strict record types.
4. **No Implicit Any**: Public APIs avoid `any` in favor of generics (`<T = unknown>`) and typed contracts from `@ostro/contracts`.
5. **Contract Binding**: Core managers implement contracts from `@ostro/contracts/container/*`.

---

## 5. Development & Verification Guide
- **Compile / Build**: `npm run build` (runs `tsc -p tsconfig.build.json`)
- **Run Tests**: `npm test` (executes Jest with 100% coverage target via `c8`)
- **Published Artifacts**: Target output compiled to `./build` with accompanying `.d.ts` declarations and source maps.

---
*Generated for Antigravity AI high-speed codebase comprehension with minimal token consumption.*
