# End Terminator

## Summary

- The main liana always finishes with an implicit “End” terminator; the DSL no longer allows an `end` block.
- The renderer synthesises the closing node and assigns a predictable anchor such as `<diagram-id>@end`.
- When multiple lanes converge, the implicit node sits at the end of the primary lane and automatic sequential edges keep the flow continuous.
- Authors may still reference `end` (or the generated anchor) in `line` blocks when they need to wire explicit jumps to the terminator.

## Behaviour

```text
drakon "process" {
  action "Do work"
}
```

- Renders as `Start → action "Do work" → End`.
- Other lanes must connect via explicit lines when they need to reach the terminator.

## Implementation Notes

- Reject explicit `end` blocks in the parser so metadata stays consistent.
- Auto-generate the end node on the primary lane and retain the stable `<diagram-id>@end` anchor.
- When no explicit line targets the terminator, rely on the sequential edge between the last primary-lane node and the implicit end to keep the main liana continuous.
