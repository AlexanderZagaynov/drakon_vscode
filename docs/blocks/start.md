# Start Block

## Summary

- Marks the entry point of a diagram.
- Mirrors the rounded “Start” terminator icon from DRAKON.
- Usually feeds directly into the first Action, Parameters, or Question block.

## Syntax

```hcl
start "<block-id>" {
  text   = "<label>"
  tags   = ["tag1", "tag2"]
  anchor = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

- `text` is optional; the renderer may default to a localized “Start”.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `text` | ✖ | Override label displayed inside the terminator. |
| `tags` | ✖ | Freeform labels for theming or automation. |
| `anchor` | ✖ | Explicit anchor name (defaults to `<block-id>`). |
| `data` | ✖ | Tooling metadata. |

## Variants

### Variant A — Default Start in Main Lane

```hcl
drakon "onboarding" {
  lane "main" {
    start "begin" {}

    action "collect_info" {
      text = "Collect user info"
    }
  }
}

line {
  from = "begin"
  to   = "collect_info"
}
```

### Variant B — Named Start inside a Lane

```hcl
drakon "onboarding_lane" {
  lane "ops" {
    title = "Operations"

    start "intake" {
      text = "Intake"
    }

    action "assign_agent" {
      text = "Assign agent"
    }
  }

  line {
    from = "intake"
    to   = "assign_agent"
  }
}
```

## Implementation Notes

- If multiple `start` blocks exist, the renderer should highlight them all; the first declared may act as the default entry.
- Validate that each start block has at least one outgoing connector.

## Future Considerations

- Permit an optional `icon` metadata field to distinguish alternative entry states.
