# Start Terminator

## Summary

- Every diagram begins with an implicit “Start” terminator; there is no DSL block named `start`.
- The renderer synthesises the node automatically and assigns a stable anchor such as `<diagram-id>@start`.
- The first user-defined block is connected to the start terminator so the main liana is continuous.
- Lines can still target `start` (or the generated anchor) when authors need to branch explicitly from the entry point.

## Behaviour

```text
drakon "Empty Example" {
  action "Do work"
}
```

- Renders as `Empty Example → action "Do work" → End`. The caption mirrors the diagram title (taken from the `title` attribute or the quoted name of the `drakon` block).
- The synthetic node is always the first entry in the primary lane.

## Implementation Notes

- Reject any explicit `start` block in the parser to avoid ambiguity.
- Keep the implicit node’s id stable (`<diagram-id>@start`) so existing edges that reference the alias continue to resolve.
- When no author-defined blocks are present, still emit a single `Start → End` edge to render the empty diagram cleanly.
- Populate the caption (and `text` attribute) from the diagram title so the entry point always echoes the flow name.
