# Comment Block

## Summary

- Provides explanatory text attached to another block or floating in the diagram.
- Maps to the DRAKON Comment icon (a small rectangle with a tail).
- Does not participate in control flow but improves readability.

## Syntax

```hcl
comment "<block-id>" {
  text         = "<note>"
  lines        = ["multi", "line note"]
  attaches_to  = "<target-block-id@anchor>"
  placement    = "right" # left | right | above | below
  tags         = ["tag1", "tag2"]
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `text` | ✔ | Content of the comment. Multiple entries combine with newlines. |
| `attaches_to` | ✖ | Optional reference to the block the comment points at. |
| `placement` | ✖ | Hint about where to render the comment relative to its target. |
| `tags` | ✖ | Freeform labels. |
| `data` | ✖ | Metadata (e.g., severity, author). |

## Variants

### Variant A — Floating Comment

```hcl
drakon "onboarding" {
  lane "notes" {
    comment "background" {
      lines = [
        "Use the web form",
        "to collect details.",
      ]
    }
  }
}
```

### Variant B — Anchored Comment

```hcl
drakon "onboarding_attached" {
  lane "ops" {
    action "collect" {
      text = "Collect user details"
    }

    comment "collect-note" {
      text        = "Verify email format"
      attaches_to = "collect"
      placement   = "right"
    }
  }
}
```

## Implementation Notes

- When `attaches_to` is present, render a connector “tail” pointing to the target block.
- Comments should be excluded from flow validation (no required connectors).

## Future Considerations

- Track authorship (e.g., `data { author: "zalex" }`) for collaborative reviews.
- Allow inline formatting (bold, code) via Markdown or minimal markup.
