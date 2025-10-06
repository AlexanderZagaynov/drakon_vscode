# Simple_Output Block

## Summary

- Streamlined Output icon for short outbound messages.
- Suited for acknowledgements or brief notifications.

## Syntax

```hcl
simple_output "<block-id>" {
  actor   = "<receiver>"
  message = "<message>"
  channel = "<medium>"
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
| `actor` | ✔ | Recipient of the output. |
| `message` | ✔ | Text displayed inside the block. |
| `channel` | ✖ | Communication medium. |
| `tags` | ✖ | Labels for filtering. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Metadata. |

## Variants

### Variant A — Confirmation Message

```hcl
drakon "confirmation" {
  lane "notifications" {
    simple_output "ack" {
      actor   = "User"
      message = "Confirmation sent"
    }
  }
}
```

### Variant B — Channel-Specific Notification

```hcl
drakon "confirmation_push" {
  lane "notifications" {
    simple_output "push_notification" {
      actor   = "User"
      message = "Push notification"
      channel = "Mobile Push"
    }
  }
}
```

## Implementation Notes

- Render as a compact trapezoid with the tail pointing outward.
- When a message exceeds one line, automatically scale the icon height to accommodate wrapping.

## Future Considerations

- Support `priority "<value>"` metadata for alerting contexts.
