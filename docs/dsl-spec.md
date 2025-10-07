# DRAKON Text DSL Proposal

This document proposes a textual DSL that maps closely to the official DRAKON icon set while staying compact enough for a plain-text workflow. The goal is to make every block and connector explicit so the renderer can recreate the diagram with minimal hidden rules.

## Design Goals

- **Icon parity:** Every block in the DRAKON reference has a keyword of its own.
- **Deterministic layout:** The default layout follows the canonical top–down DRAKON flow; optional lane hints keep cross-lane wiring predictable.
- **Readable source:** Indentation is decorative; the grammar is line-based so that simple tools (diff, merge, formatters) stay effective.
- **Extensible metadata:** Blocks and lines accept optional attributes so future revisions can add styling or tooling hooks without breaking existing content.

## Top-Level Structure

```hcl
drakon "diagram-id" {
  title = "Human Title"
  locale = "en-US"
  tags   = ["sample"]

  lane "system" {
    title = "System"
    tags  = ["backend"]
    # block declarations…
  }

  lane "customer" {
    title = "Customer"
    # block declarations…
  }

  note {
    text      = "Free text annotation"
    placement = "right"
  }

  line {
    from = "start"
    to   = "fetch"
  }

  attach "duration" "warmup" {
    target = "prepare"
    window = "PT5M"
  }
}
```

- `drakon` declares the diagram and its metadata using standard HCL `key = value` assignments.
- `lane` blocks group icons vertically. Omit additional `lane` blocks for single-lane diagrams (the implicit lane id is `"main"`).
- `note` blocks add free-floating annotation text that renders as a comment bubble.
- Because the syntax is valid HCL, diagrams can be fenced as either ` ```hcl ` or ` ```drakon ` in Markdown and parsed with existing HCL tooling.

## Shared Block Syntax

```hcl
<keyword> "<block-id>" {
  text   = "Single line label"
  lines  = ["multi", "line"] # optional helper for multi-line labels
  tags   = ["tag1", "tag2"]
  anchor = "custom-anchor"
  data = {
    key = "value"
  }
  # keyword-specific attributes or nested blocks…
}
```

- Block identifiers are quoted strings so punctuation and spaces are allowed; they must still be unique within a diagram.
- `text` supplies the primary label. Use `lines` (list of strings), a heredoc (`text = <<-EOT … EOT`), or omit it entirely for icon-specific defaults. Leading indentation is stripped from heredocs and other multiline strings so the rendered label stays tight.
- `tags` captures arbitrary labels for search and theming.
- `anchor` exposes a named attachment point for lines (defaults to the block id).
- `data` is a free-form map for renderer extensions and tooling.

## Block Keywords

Each keyword aligns with one icon from the reference. Detailed guidance, variants, and DSL examples now live in per-block files under [`docs/blocks`](./blocks). Use the table below as a quick index.

| Keyword | DRAKON icon | Reference |
|---------|-------------|-----------|
| `start` | Entry point | [`docs/blocks/start.md`](blocks/start.md) |
| `end` | Exit point | [`docs/blocks/end.md`](blocks/end.md) |
| `parameters` | Formal parameters | [`docs/blocks/parameters.md`](blocks/parameters.md) |
| `action` | Action | [`docs/blocks/action.md`](blocks/action.md) |
| `comment` | Comment | [`docs/blocks/comment.md`](blocks/comment.md) |
| `question` | Question (Yes/No) | [`docs/blocks/question.md`](blocks/question.md) |
| `choice` | Choice | [`docs/blocks/choice.md`](blocks/choice.md) |
| `insertion` | Insertion | [`docs/blocks/insertion.md`](blocks/insertion.md) |
| `for_each` | FOR loop | [`docs/blocks/for_each.md`](blocks/for_each.md) |
| `parallel` | Concurrent processes | [`docs/blocks/parallel.md`](blocks/parallel.md) |
| `input` | Input | [`docs/blocks/input.md`](blocks/input.md) |
| `output` | Output | [`docs/blocks/output.md`](blocks/output.md) |
| `simple_input` | Simple input | [`docs/blocks/simple_input.md`](blocks/simple_input.md) |
| `simple_output` | Simple output | [`docs/blocks/simple_output.md`](blocks/simple_output.md) |
| `shelf` | Shelf | [`docs/blocks/shelf.md`](blocks/shelf.md) |
| `process` | Process | [`docs/blocks/process.md`](blocks/process.md) |
| `ctrl_period_start` | Start of control period | [`docs/blocks/ctrl_period_start.md`](blocks/ctrl_period_start.md) |
| `ctrl_period_end` | End of control period | [`docs/blocks/ctrl_period_end.md`](blocks/ctrl_period_end.md) |
| `duration` | Duration | [`docs/blocks/duration.md`](blocks/duration.md) |
| `pause` | Pause | [`docs/blocks/pause.md`](blocks/pause.md) |
| `timer` | Timer | [`docs/blocks/timer.md`](blocks/timer.md) |
| `group_duration` | Group duration | [`docs/blocks/group_duration.md`](blocks/group_duration.md) |

### Keyword-Specific Clauses

- `parameters`: define the formal inputs inside the root `drakon` block using the `parameters` attribute (string, list, or object).
- `question`: add `yes = { target = "...", label = "...", handle = "south" }` and `no = { ... }`.
- `choice`: add repeated `case { label = "..."; target = "..."; handle = "east" }` blocks plus optional `else = { target = "..." }`.
- `insertion`: add `target = "library/snippet"` and optional `inputs = { key = "value" }`, `outputs = { name = "description" }`.
- `for_each`: add `item = "identifier"`, `collection = "expression"`, optional `index = "identifier"`, optional `until = "anchor-id"`.
- `parallel`: provide `threads = ["a", "b"]` or `lane_group = ["lane-a", "lane-b"]`.
- `input` / `output`: require `actor = "entity"` and `message = "payload"`; optional `channel = "medium"` with `sender` / `receiver`.
- `simple_input` / `simple_output`: same attributes as their full counterparts but usually just `actor` + `message`.
- `shelf`: supply `contents = { key = "description" }` or a single `text` string.
- `process`: require `command = "Start" | "Pause" | "Continue" | "Stop"` and optional `process = "name"`.
- `ctrl_period_start` / `ctrl_period_end`: pair via shared ids; start carries `window = "PT5M"`, end uses `matches = "start-id"`.
- `duration`: represented via `attach "duration" …` blocks (see below) that reference `target` blocks or timers.
- `pause`: include `time = "PT15S"`.
- `timer`: include `name = "identifier"` (referenced by `duration` attachments).
- `group_duration`: include `window = "PT1H"` and `covers = ["anchor-a", "anchor-b"]`.

## Attachments

Attachments are secondary icons (Duration, Group duration) that latch onto a primary block.

```hcl
attach "<keyword>" "<attachment-id>" {
  target = "<block-id>"
  text   = "..."
  timer  = "<timer-name>"         # required when attached to a timer
  window = "PT10S"
  covers = ["anchor-a", "anchor-b"] # only for group_duration
}
```

- `attach` blocks always declare the `target`. `timer` is required when referencing a timer by name; omit it to indicate “carry out for” durations.
- `group_duration` uses `covers` to list anchors included in the time window.

## Lines (Connectors)

```hcl
line {
  from   = "<from-anchor>"
  to     = "<to-anchor>"
  kind   = "main"   # yes | no | case | else | loop | back | signal
  label  = "<edge caption>"
  note   = "<small annotation>"
  handle = "south"  # north | south | east | west
}
```

- `from` / `to` default to the block id when you omit `@anchor`.
- `kind` drives rendering (straight main flow vs. labelled branches). Use values such as `kind = "yes"` / `"no"` for Question blocks, `kind = "case"` / `"else"` for Choice, `kind = "loop"` for loop-backs, and `kind = "signal"` for cross-lane I/O.
- `label` will appear near the connector (e.g., “Yes”, “No”, “Timeout”).
- `handle` hints which side of the block the connector should exit from when the renderer auto-routes lines.

## Example

```hcl
drakon "order_flow" {
  title = "Order Processing"

  parameters = {
    text = "Order Inputs"
    lines = [
      "order_id    = Guid",
      "customer_id = Guid"
    ]
  }

  action "fetch" {
    lines = [
      "Fetch order",
      "and payment data",
    ]
  }

  question "paid?" {
    text = "Payment received?"
    yes = {
      target = "prepare"
      label  = "Yes"
      handle = "south"
    }
    no = {
      target = "request-payment"
      label  = "No"
      handle = "east"
    }
  }

  for_each "review_lines" {
    item       = "line"
    collection = "order.lines"
  }

  simple_output "request-payment" {
    actor   = "Customer"
    message = "Please complete your payment"
  }

  action "prepare" {
    text = "Pack goods"
  }

  parallel "fulfillment" {
    threads = ["packing", "shipping"]
  }

  action "ship" {
    text = "Ship parcel"
  }

  output "receipt" {
    actor   = "Customer"
    message = "Shipment notification"
  }

  line {
    from = "start"
    to   = "fetch"
  }

  line {
    from = "fetch"
    to   = "paid?"
  }

  line {
    from  = "paid?"
    to    = "prepare"
    kind  = "yes"
    label = "Yes"
  }

  line {
    from  = "paid?"
    to    = "request-payment"
    kind  = "no"
    label = "No"
  }

  line {
    from  = "request-payment"
    to    = "fetch"
    kind  = "loop"
    label = "Retry"
  }

  line {
    from = "prepare"
    to   = "fulfillment"
  }

  line {
    from = "fulfillment"
    to   = "ship"
    kind = "back"
  }

  line {
    from = "ship"
    to   = "receipt"
    kind = "signal"
  }

  line {
    from = "receipt"
    to   = "end"
  }
}
```

This sample demonstrates how the textual DSL maps to the canonical DRAKON icons without relying on explicit lane declarations. Durations, timers, and group durations would be added through `attach` statements when required (for example, to express “Timeout after PT2H on request-payment”).

## Implementation Considerations

- **Parsing:** The syntax is valid HCL. You can parse diagrams with any HCL 2 parser (e.g., HashiCorp’s Go library) and then project the resulting object model onto the existing DRAKON AST. Each block translates to a nested object keyed by its type and id, while repeated blocks (e.g., `case`, `line`, `attach`) arrive as arrays.
- **Renderer updates:** Icons should read values from the new attribute names (`text`, `lines`, `tags`, `yes.target`, etc.). Branch styling relies on `line.kind`, so preserve existing colour/shape rules by matching the string values described above.
- **Tooling:** LSP/linting integrations now benefit from HCL’s mature ecosystem (formatters, validators). Consider wiring `hclfmt` or similar as a formatting command inside the extension.
