# Input Block

## Summary

- Models information entering the process from an external actor (left-hand Input icon in DRAKON).
- Highlights the sender, receiver, and message payload.

## Syntax

```hcl
input "<block-id>" {
  text     = "<headline>"
  actor    = "<sender>"
  receiver = "<receiver>"
  message  = "<message>"
  channel  = "<medium>"
  tags     = ["tag1", "tag2"]
  anchor   = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `actor` | ✔ | Entity initiating the input (e.g., “Customer”). |
| `receiver` | ✖ | Entity receiving the message (default: current lane). |
| `message` | ✔ | Content of the message. |
| `text` | ✖ | Caption shown inside the block. |
| `channel` | ✖ | Communication medium (e.g., “Email”, “API”). |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor for connectors. |
| `data` | ✖ | Additional metadata. |

## Variants

### Variant A — Customer Request

```hcl
drakon "support" {
  lane "support" {
    title = "Support Team"

    input "ticket" {
      actor   = "Customer"
      message = "Create support ticket"
      channel = "Web portal"
    }
  }
}
```

### Variant B — System-to-System Input

```hcl
drakon "api_trigger" {
  lane "ci" {
    input "webhook" {
      text     = "Webhook received"
      actor    = "GitHub"
      receiver = "CI Service"
      message  = "push event"
      channel  = "HTTPS"
    }
  }
}
```

## Implementation Notes

- Align the block so the (optional) triangular tail points into the lane representing the receiver.
- When `receiver` differs from the current lane, annotate the block to highlight cross-lane transfer.

## Future Considerations

- Add `schema "<link>"` metadata to reference payload structure.
- Support `attachments [ ... ]` to list files or artefacts that accompany the message.
