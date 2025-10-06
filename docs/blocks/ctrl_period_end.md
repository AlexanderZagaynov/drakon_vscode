# Control Period End Block

## Summary

- Denotes the completion of a previously declared control period.
- Matches the DRAKON “End of control period” icon.
- Should reference the associated `ctrl_period_start` via anchors to ensure pairing.

## Syntax

```hcl
ctrl_period_end "<block-id>" {
  text    = "<headline>"
  matches = "<start-block-id@anchor>"
  tags    = ["tag1", "tag2"]
  anchor  = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `matches` | ✔ | Identifier of the control-period start block it closes. |
| `text` | ✖ | Optional label. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Metadata (e.g., actual duration). |

## Variants

### Variant A — Simple Match

```hcl
drakon "escalation" {
  lane "operations" {
    ctrl_period_start "critical" {
      window = "PT30M"
    }

    ctrl_period_end "critical_done" {
      matches = "critical"
    }
  }
}
```

### Variant B — Match with Annotation

```hcl
drakon "escalation_annotated" {
  lane "operations" {
    ctrl_period_start "critical" {
      text   = "Resolve within 30 min"
      window = "PT30M"
    }

    ctrl_period_end "critical_done" {
      text    = "Resolution recorded"
      matches = "critical"
      tags    = ["report"]
    }
  }
}
```

## Implementation Notes

- Validate that the referenced start block exists; flag if multiple ends reference the same start without explicit allowance.
- Consider displaying the consumed time (if available via metadata) alongside the icon.

## Future Considerations

- Permit `matches` to specify multiple start anchors for grouped control periods.
- Support automatic measurement by correlating timestamps in tooling.
