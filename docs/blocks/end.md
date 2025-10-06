# End Block

## Summary

- Terminates a control path in the diagram.
- Visualized as the rounded “End” terminator icon in DRAKON.
- Multiple end blocks may exist to represent alternative exit conditions.

## Syntax

```hcl
end "<block-id>" {
  text   = "<label>"
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
| `text` | ✖ | Custom caption for the terminator (default: localized “End”). |
| `tags` | ✖ | Freeform labels for classification. |
| `anchor` | ✖ | Explicit anchor name (defaults to `<block-id>`). |
| `data` | ✖ | Arbitrary metadata for downstream tooling. |

## Variants

### Variant A — Standard End

```hcl
drakon "ticket_flow" {
  lane "support" {
    end "done" {
      text = "Resolved"
    }
  }
}
```

### Variant B — Multiple Ends in Different Lanes

```hcl
drakon "ticket_flow_multi" {
  lane "agent" {
    title = "Support Agent"
    end "closed" {
      text = "Closed"
    }
  }

  lane "customer" {
    title = "Customer"
    end "cancelled" {
      text = "Cancelled by customer"
    }
  }
}
```

## Implementation Notes

- Ensure lines entering the end block terminate cleanly; no outgoing connectors should be permitted.
- Use `tags` or `data` to track exit semantics (e.g., success vs. failure) so reporting tools can distinguish them.

## Future Considerations

- Support optional colour tokens to differentiate end reasons visually.
