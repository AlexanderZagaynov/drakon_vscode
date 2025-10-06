# Control Period Start Block

## Summary

- Marks the beginning of a critical control period that must finish within a specified timeframe.
- Mirrors the DRAKON “Start of control period” icon.

## Syntax

```hcl
ctrl_period_start "<block-id>" {
  text   = "<headline>"
  window = "<ISO-8601 duration>"
  tags   = ["tag1", "tag2"]
  anchor = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `window` | ✔ | Time limit for completing the control period (e.g., `"PT2H"`). |
| `text` | ✖ | Optional label. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Additional metadata (e.g., escalation policy). |

## Variants

### Variant A — Two-Hour Window

```hcl
drakon "escalation" {
  lane "operations" {
    ctrl_period_start "critical" {
      text   = "Critical response window"
      window = "PT2H"
    }
  }
}
```

### Variant B — Window with Tags

```hcl
drakon "escalation_tagged" {
  lane "operations" {
    ctrl_period_start "critical" {
      window = "PT30M"
      tags   = ["sla", "high_priority"]
    }
  }
}
```

## Implementation Notes

- Pair every start with a corresponding `ctrl_period_end` block; emit warnings if unmatched.
- Render the `window` value clearly inside the icon per DRAKON guidelines.

## Future Considerations

- Allow `deadline "<timestamp expression>"` as an alternative to durations.
- Support linking to runbooks via `data { runbook: "url" }`.
