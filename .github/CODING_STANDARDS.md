# Coding Standards - Commenting Showing Intent (CSI)

Based on [MousePaw Media CSI Standard](https://standards.mousepawmedia.com/en/latest/csi.html)

## Purpose

The CSI (Commenting Showing Intent) Standard ensures code is documented such that it could be completely rewritten in any language using only the comments. Comments should explain **WHY** code exists, not just **WHAT** it does.

## Core Principles

### CSI vs. Self-Commenting Code
- **Self-commenting code** shows WHAT the code does (actual behavior)
- **CSI comments** show WHY the code exists (intended behavior and reasoning)
- Both should coexist—use clear naming AND explanatory comments

### Comment Everything First
**Core Rule:** Comment every logical step at first. Each logical block (typically 3-7 lines) should have an explanation.

Aim to **comment more lines of code**, not pack more into one comment.

## Format

### TypeScript/JavaScript
- Use single-line `//` comments
- Leave a space between comment token and text

## Commenting Style

### Tone
Write in a **conversational tone**, as if explaining to a newcomer. Avoid language-specific jargon when possible.

**BAD** (restates code):
```typescript
// Set items_per_box to the floor of items divided by 17
const items_per_box = Math.floor(items / 17);
```

**BETTER** (explains what):
```typescript
// Find how many times 17 goes into items, without a remainder.
const items_per_box = Math.floor(items / 17);
```

**BEST** (explains why):
```typescript
// Divide our items among 17 boxes.
// We'll deal with the leftovers later.
const items_per_box = Math.floor(items / 17);
```

### Avoiding Vagueness
Be **specific** about logic and reasoning.

**BAD:**
```typescript
// This tells us how much we can handle.
const maximum_range = 27;
```

**BEST:**
```typescript
// Anything larger than this integer causes the algorithm to return 0.
const maximum_range = 27;
```

### Humor
Humor is acceptable if it doesn't detract from clarity. Don't force it, but don't suppress natural wit either.

**ACCEPTABLE:**
```typescript
// We return -1 instead of 0 to avoid a
// math error in the upcoming division.
return -1;
```

**BETTER:**
```typescript
// We return -1 instead of 0 to keep the
// math gremlins happy in the upcoming division.
return -1;
```

### Length
Spread comments across logical blocks rather than packing everything into one large comment.

**BAD** (too packed):
```typescript
// Search through integers from the user and find numbers divisible
// by both 5 and 7, then return their sum.
let sum = 0;
for (let i = 0; i < len; i++) {
    if (!(nums[i] % 5) && !(nums[i] % 7)) {
        sum += nums[i];
    }
}
return sum;
```

**GOOD** (distributed):
```typescript
// Store the running sum.
let sum = 0;

// Search through the list of integers...
for (let i = 0; i < len; i++) {
    // If the number is divisible by both 5 and 7...
    if (!(nums[i] % 5) && !(nums[i] % 7)) {
        // Add it to our sum.
        sum += nums[i];
    }
}

// Return the final sum.
return sum;
```

## Types of Comments

### Declarations

#### Variables/Constants
State the **intent** and **purpose**, not just what it is.

```typescript
// The SILVER_INTEREST_RATE constant stores the
// monthly interest rate for Silver savings accounts.
const SILVER_INTEREST_RATE = 1.06;
```

#### Functions
State purpose, inputs, outputs, and reasoning.

```typescript
// The countBah function determines how many times
// "BAH" appears in a given string.
// @param inputText - the string to count "bah" in
// @return the number of times "bah" appeared
//
function countBah(inputText: string): number {
    // Implementation...
}
```

### Special Comments
Use standard markers with conversational tone:

```typescript
// TODO: Expand the whatchamacallit to make whozits.
// NOTE: Is there a faster way to produce thingamabobs?
// FIXME: This math always seems to produce the result "2".
```

### Entry Points
Major features should mark where to start reading:

```typescript
// ENTRY: Generate Animated Character
```

### Commenting Out Code

**Explanation Method** (preferred):
```typescript
// Testing if we really need this function call at all.
// refreshEverything();
```

**Double Comment Method** (for temporary changes):
```typescript
//// refreshEverything();
```

Remove commented-out code as soon as possible.

## Trimming Process

1. **Comment every logical statement** while working—no exceptions
2. **Have someone unfamiliar review** comments and suggest improvements
3. **Rewrite WHAT comments to WHY**, eliminate truly redundant comments

## Enforcement

All code must follow CSI standards. Pull requests will be reviewed for:
- Presence of intent-comments for each logical block
- Comments explaining WHY, not just WHAT
- Conversational, language-agnostic tone
- Proper placement and formatting
- Preference for D3 helpers over bespoke utilities when working inside the webview renderer
