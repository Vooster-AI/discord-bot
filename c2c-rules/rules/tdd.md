# TDD Process Guidelines - Cursor Rules

## ⚠️ MANDATORY: Follow these rules for EVERY implementation and modification

**This document defines the REQUIRED process for all code changes. No exceptions without explicit team approval.**

## Core Cycle: Red → Green → Refactor

### 1. RED Phase

- Write a failing test FIRST
- Test the simplest scenario
- Verify test fails for the right reason
- One test at a time

### 2. GREEN Phase

- Write MINIMAL code to pass
- "Fake it till you make it" is OK
- No premature optimization
- YAGNI principle

### 3. REFACTOR Phase

- Remove duplication
- Improve naming
- Simplify structure
- Keep tests passing

## Test Quality: FIRST Principles

- **Fast**: Milliseconds, not seconds
- **Independent**: No shared state
- **Repeatable**: Same result every time
- **Self-validating**: Pass/fail, no manual checks
- **Timely**: Written just before code

## Test Structure: AAA Pattern

```
// Arrange
Set up test data and dependencies

// Act
Execute the function/method

// Assert
Verify expected outcome
```

## Implementation Flow

1. **List scenarios** before coding
2. **Pick one scenario** → Write test
3. **Run test** → See it fail (Red)
4. **Implement** → Make it pass (Green)
5. **Refactor** → Clean up (Still Green)
6. **Commit** → Small, frequent commits
7. **Repeat** → Next scenario

## Test Pyramid Strategy

- **Unit Tests** (70%): Fast, isolated, numerous
- **Integration Tests** (20%): Module boundaries
- **Acceptance Tests** (10%): User scenarios

## Outside-In vs Inside-Out

- **Outside-In**: Start with user-facing test → Mock internals → Implement details
- **Inside-Out**: Start with core logic → Build outward → Integrate components

## Common Anti-patterns to Avoid

- Testing implementation details
- Fragile tests tied to internals
- Missing assertions
- Slow, environment-dependent tests
- Ignored failing tests

## When Tests Fail

1. **Identify**: Regression, flaky test, or spec change?
2. **Isolate**: Narrow down the cause
3. **Fix**: Code bug or test bug
4. **Learn**: Add missing test cases

## Team Practices

- CI/CD integration mandatory
- No merge without tests
- Test code = Production code quality
- Pair programming for complex tests
- Regular test refactoring

## Pragmatic Exceptions

- UI/Graphics: Manual + snapshot tests
- Performance: Benchmark suites
- Exploratory: Spike then test
- Legacy: Test on change

## Remember

- Tests are living documentation
- Test behavior, not implementation
- Small steps, fast feedback
- When in doubt, write a test