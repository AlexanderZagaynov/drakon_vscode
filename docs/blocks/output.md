# Output Block

## Summary

- Depicts information sent from the process to an external actor (right-hand Output icon in DRAKON).
- Complements the `input` block, highlighting recipient and content.

## Syntax

```hcl
output "<block-id>" {
  text    = "<headline>"
  actor   = "<receiver>"
  sender  = "<sender>"
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
| `actor` | ✔ | Recipient of the message. |
| `sender` | ✖ | Originating entity (defaults to current lane). |
| `message` | ✔ | Payload details. |
| `text` | ✖ | Caption in the block body. |
| `channel` | ✖ | Communication medium. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Extra metadata. |

## Variants

### Variant A — Email Notification

```hcl
drakon "notifications" {
  lane "orders" {
    output "confirmation" {
      actor   = "Customer"
      sender  = "Order Service"
      message = "Order confirmation email"
      channel = "Email"
    }
  }
}
```

### Variant B — System Event

```hcl
drakon "notifications_event" {
  lane "orders" {
    output "audit_event" {
      text    = "Send audit event"
      actor   = "Analytics"
      message = "{ type: \"order_created\" }"
      channel = "Kafka"
    }
  }
}
```

## Implementation Notes

- Draw the block so the triangular tail points outward toward the actor’s lane.
- Encourage the use of concise message summaries; detailed schemas can live in `data` or linked documentation.

## Future Considerations

- Enable `retries "<policy>"` metadata for operational requirements.
- Support grouping outputs into batched transmissions with `group_id`.
