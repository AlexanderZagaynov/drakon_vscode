# DRAKON Reference

This document collects the essentials of the DRAKON visual language together with the conventions adopted in this repository. It draws on the official specifications published by the language authors together with community reference material:

- [Visual Syntax](https://drakon.su/jazyk/vizualnyj_sintaksis)
- [DRAKON Reference](https://drakonflow.com/read/drakon-reference)
- [DRAKON for Developers (MQL5 article)](https://www.mql5.com/en/articles/13324)

The goal is to give you an “on the desk” guide you can use while extending the DSL, renderer, or documentation.

---

## 1. What Is DRAKON?

DRAKON (“friendly diagram”) is a visual programming language created for aerospace projects in the 1980s–90s. Its diagrams emphasise:

- **Readable flows**. One main liana (vertical flow line) leads from Start to End without crossings.
- **Deterministic layout**. Each icon has a fixed geometry and connection discipline, so the reader doesn’t waste time deciphering ad-hoc shapes.
- **Structured decisions**. Branching is expressed through Question, Choice, Parallel and loop-specific icons instead of arbitrary jumps.

The language targets algorithm design, documentation, and code generation. DRAKON diagrams are intended to be executable specifications: non-programmers should understand them; programmers should be able to translate them directly to code.

---

## 2. Core Principles

| Principle | Description | Practical Consequence |
|-----------|-------------|-----------------------|
| **Single entry & exit** | Every flow has one Start and one End terminator. | Our renderer synthesises them automatically; authors customise only when they need metadata. |
| **Main liana** | Primary control flow runs top-to-bottom with minimal bends. | Sequential nodes in a lane connect implicitly; add explicit lines only for jumps or cross-lane edges. |
| **Icon semantics** | Each icon (Action, Question, Choice…) carries strict meaning and allowed connectors. | The parser validates attributes; the renderer assigns geometry according to icon type. |
| **Structured branching** | Use dedicated icons for branching, loops, and parallelism. | Avoid “goto”-style diagrams; use Question/Choice for 2-way/branching, For each/Loop icons for iterations. |
| **Visual minimalism** | The diagram should fit on one screen/page, emphasising structure over decoration. | Keep text concise, prefer multi-line blocks over many small blocks with arrows. |

---

## 3. Icon Catalogue

DRAKON defines more than 40 icons; the table below lists the core subset implemented in this project.

| Icon | Purpose | Typical Connectors | Notes |
|------|---------|--------------------|-------|
| **Start / End** | Entry and exit points. | One outgoing (Start), one incoming (End). | Implicit; auto-created by the renderer. |
| **Parameters** | Declare inputs, state, or signature data. | One incoming (Start), one outgoing. | Declared as a root-level `parameters` attribute. |
| **Action** | Linear processing step. | One incoming, one outgoing `main` line. | Free-form text describing work. |
| **Insertion** | Invoke external “library” logic. | One incoming, one outgoing. | Supports `target` metadata for toolchains. |
| **Question** | Binary branch (Yes/No). | One incoming; two outgoing labelled `yes` / `no`. | Yes path typically to the left/on top. |
| **Choice** | Multi-way branch. | One incoming; `case` and optional `else` exits. | Keep alternatives short; use `case.label`. |
| **For each** | Iterate collection items. | One incoming; loop exit + body loops. | `item`, `collection`, optional `index`, `until`. |
| **Parallel** | Launch parallel activities. | One incoming, one outgoing plus `threads`. | Displayed with vertical lanes or parallel legs. |
| **Input / Output / Simple input / Simple output** | Interaction with external actors. | One incoming, one outgoing. | Carries `actor`, `message`, optional `channel`. |
| **Comment** | Annotation. | No connectors. | Rendered with folded corner. |
| **Duration / Timer / Pause** | Timing attachments. | Attached via `attach` constructs. | Rendered as overlays beside nodes. |

For a full catalogue, consult the [official icon reference](https://drakonflow.com/read/drakon-reference).

---

## 4. Control-Flow Patterns

### 4.1 Sequential Flow (Main Liana)

- Nodes declared at the top level connect automatically: `Start → Parameters → … → End`.
- Explicit `line { from = "A" to = "B" }` blocks are required only for:
  - Cross-lane transitions.
  - Loops and branches where the default ordering should be overridden.
  - Additional semantics (`kind`, `label`, `handle`).
- The renderer sorts nodes by structural depth to keep the liana vertical.

### 4.2 Branching

- **Question** icons represent binary decisions. Use `line.kind = "yes"` / `"no"` (labels optional but recommended).
- **Choice** icons fan out to multiple cases. Each `case` block carries `label`, `target`, optional `handle`. Add an `else` case when necessary.
- **Parallel** icon splits execution; reconvergence is implied: each parallel branch should eventually rejoin the main liana (either via lane edges or explicit `line`).

### 4.3 Loops

- Use **For each** for collection iteration; the icon includes:
  - `item` – iteration variable.
  - `collection` – source sequence.
  - Optional `index` and `until` (target anchor for exit).
- Other loop structures employ Question+line feedback (traditional while/loop). Keep the loop-back edge vertical with `handle = "north"` when needed.

### 4.4 Attachments (Durations, Timers)

- DRAKON uses attachments to annotate timing or grouped behaviour.
- In the DSL: `attach "duration" "my_timer" { target = "node_id" window = "PT10S" }`.
- Attachments render as secondary icons anchored to a main node; they remain separate from the control-flow graph.

---

## 5. DSL Mapping

The DSL implemented in this repository follows the official semantics but exposes a concise HCL-flavoured syntax.

### 5.1 Root Structure

```hcl
drakon "Order Flow" {
  title = "Order Flow"          # optional; defaults to quoted name
  parameters = { ... }          # optional root-level parameters (see below)
  metadata_key = "value"        # arbitrary diagram metadata

  action "fetch" { ... }
  question "paid?" { ... }
  simple_output "request-payment" { ... }
  action "prepare" { ... }
  action "ship" { ... }

  line { from = "request-payment" to = "fetch" kind = "loop" label = "Retry" }
  attach "duration" { target = "prepare" window = "PT5M" }
}
```

Key rules:

- **Implicit Start/End**: Always present. The builder injects them with canonical ids `<diagram-id>@start` / `<diagram-id>@end`. Authors target them using `start` / `end` aliases.
- **Parameters**: Use `parameters` attribute only. It accepts strings, lists, or objects. The renderer inserts the node right after Start.
- **Sequential edges**: Auto-generated down the main liana; use explicit `line` blocks for branch labels or non-linear control flow.
- **No explicit lanes**: The renderer synthesises the necessary shampur blocks. Authors should not declare `lane` blocks in the DSL yet.

### 5.2 Parameters Attribute Examples

```hcl
# Heredoc (dedented automatically)
parameters = <<-PARAMS
  customer_id = Guid
  locale      = ISO Language
PARAMS

# Structured form with metadata
parameters = {
  id   = "request_signature"
  text = "Submit payment"
  lines = [
    "payment_id = Guid",
    "amount     = Money"
  ]
  tags     = ["api", "payments"]
  anchor   = "signature"
  data = { version = "v3" }
}
```

### 5.3 Common Block Syntax

| Block | Required Attributes | Optional Attributes |
|-------|---------------------|---------------------|
| `action "id"` | `text` or `lines` | `tags`, `anchor`, `data` |
| `question "id"` | `text` | Branch definitions via `line` blocks or inline `yes`/`no` objects |
| `choice "id"` | `text`, nested `case` blocks | `else` block, `tags`, `anchor`, `data` |
| `insertion "id"` | `target` | `text`, `inputs`, `outputs`, metadata |
| `for_each "id"` | `item`, `collection` | `index`, `until`, `text` |
| `parallel "id"` | `threads` or `lane_group` | `text`, metadata |
| `line` | `from`, `to` | `kind`, `label`, `handle`, `note` |
| `attach "duration"` | `target`, `window` | `timer`, `text`, metadata |

All nodes support `tags`, `anchor`, and `data` for downstream tooling.

---

## 6. Diagram Layout & Styling Guidelines

1. **Title and metadata**: Add `title = "..."` for reader-friendly captions. Keep metadata (e.g., `owner`, `version`) as root attributes.
2. **Text blocks**: Prefer multi-line blocks over multiple short nodes. Use heredocs to keep indentation manageable.
3. **Branch alignment**: Place yes/true branches on the left or top; no/false on the right or bottom. Maintain consistent handles for clarity.
4. **Lane usage**: The renderer currently manages shampur blocks automatically; explicit `lane` blocks are reserved for future revisions.
5. **Attachments**: Keep them close to the target node; avoid stacking multiple durations on a single line if readability suffers.
6. **Legend & notes**: Use `comment` or `note` blocks sparingly to clarify business rules or cross-references.

---

## 7. Conventions Adopted in This Repository

These conventions ensure consistency between the DSL, renderer, and documentation:

- **Implicit nodes**: Start, End, and Parameters are implicit. Authors customise them via diagram metadata (`title`) or `parameters` attribute.
- **Anchor naming**: Implicit anchors follow `<diagram-id>@start`, `<diagram-id>@parameters`, `<diagram-id>@end`.
- **Sequential edges**: The builder auto-inserts edges between consecutive nodes; explicit lines override or add semantics.
- **Lanes**: Explicit `lane` blocks are presently unsupported in authored diagrams. The renderer fabricates the primary shampur automatically.
- **Error handling**: The parser reports diagnostics when:
  - Required attributes are missing or wrong type.
  - Unknown node ids are referenced in `line` / `attach`.
  - Disallowed blocks (`start`, `end`, `parameters`) are authored explicitly.
- **Export commands**: Webview toolbar includes Refresh + SVG/PNG/WebP export. CLI command `drakonViewer.exportActiveDiagram` triggers exports from the host.

---

## 8. Additional Reading

For deeper dives, refer to:

- _DRAKON: The People-Friendly Algorithmic Language_ – original technical papers describing icon definitions and layout rules.
- The DRAKON Wikipedia article for historical context and comparisons to UML/BPMN.
- Community tooling such as DRAKON Editor and DrakonHub, which showcase interactive editing principles the extension can borrow.

---

## 9. Future Documentation Ideas

- **ADR-style entries** for each significant DSL change (implicit nodes, lane inference, parameters attribute).
- **Example gallery** showing classic patterns: CRUD flows, error handling, asynchronous orchestration.
- **Linting rules**: Document recommended heuristics (e.g., maximum branch depth, naming conventions).

Keep this file up-to-date as the DSL evolves so new contributors can quickly understand both the language and our implementation choices.
