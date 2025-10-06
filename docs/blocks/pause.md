# Pause Block

## Summary

- Represents an explicit delay before the next action, aligning with the DRAKON Pause icon.
- The delay duration is written inside the block.

## Syntax

```hcl
pause "<block-id>" {
  text   = "<headline>"
  time   = "<ISO-8601 duration>"
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
| `time` | ✔ | Duration to pause (`PT15S`, `PT5M`, etc.). |
| `text` | ✖ | Optional caption. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Metadata (e.g., reason for pause). |

## Variants

### Variant A — Fixed Delay

```hcl
drakon "retry_policy" {
  lane "service" {
    pause "wait_between_attempts" {
      time = "PT30S"
    }
  }
}
```

### Variant B — Delay with Annotation

```hcl
drakon "retry_policy_reason" {
  lane "service" {
    pause "wait_between_attempts" {
      text = "Cooldown before retry"
      time = "PT2M"
      tags = ["retry"]
    }
  }
}
```

## Implementation Notes

- Display the `time` prominently inside the icon, as in the canonical DRAKON design.
- The block should have exactly one outgoing connector continuing the main flow.

## Future Considerations

- Accept `time_range "<min>-<max>"` for variable wait intervals.
- Support `data { jitter: "PT30S" }` to capture randomized backoff metadata.
