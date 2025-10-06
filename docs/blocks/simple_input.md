# Simple_Input Block

## Summary

- Minimal variant of the Input icon for concise single-line interactions.
- Ideal for capturing short prompts or signals without additional metadata.

## Syntax

```hcl
simple_input "<block-id>" {
  actor   = "<sender>"
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
| `actor` | ✔ | Entity providing the input. |
| `message` | ✔ | Short message displayed inside the block. |
| `channel` | ✖ | Communication medium. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Extra metadata. |

## Variants

### Variant A — Text Prompt

```hcl
drakon "enrollment" {
  lane "user" {
    simple_input "passcode" {
      actor   = "User"
      message = "Enter passcode"
    }
  }
}
```

### Variant B — Channel-Specific Prompt

```hcl
drakon "enrollment_sms" {
  lane "user" {
    simple_input "passcode" {
      actor   = "User"
      message = "Reply with SMS code"
      channel = "SMS"
    }
  }
}
```

## Implementation Notes

- Keep the visual footprint smaller than the full `input` block to reflect its lightweight nature.
- If more context is needed (receiver, sender), prefer the full `input` block.

## Future Considerations

- Allow optional `icon "<glyph>"` to indicate the communication medium visually.
