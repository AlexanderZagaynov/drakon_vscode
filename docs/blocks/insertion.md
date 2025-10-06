# Insertion Block

## Summary

- Represents reuse of another diagram or snippet (DRAKON Insertion icon).
- Acts like an inlined subroutine call; execution continues after the inserted content completes.

## Syntax

```hcl
insertion "<block-id>" {
  text    = "<subtitle>"
  target  = "<diagram-name>"
  inputs  = { <param> = "<value or expression>" }
  outputs = { <name>  = "<description>" }
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
| `target` | ✔ | Name or path of the reusable diagram/snippet. |
| `text` | ✖ | Optional caption or description. |
| `inputs` | ✖ | Parameter bindings passed into the target. |
| `outputs` | ✖ | Values retrieved from the target. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Anchor override. |
| `data` | ✖ | Metadata (e.g., version). |

## Variants

### Variant A — Simple Reuse

```hcl
drakon "checkout" {
  lane "billing" {
    insertion "calculate-tax" {
      target = "tax.compute"
      text   = "Calculate taxes"
    }
  }
}
```

### Variant B — Reuse with Input/Output Mapping

```hcl
drakon "checkout_detailed" {
  lane "billing" {
    insertion "calculate-tax" {
      target = "lib/tax.compute"
      inputs = {
        amount  = "order.total"
        country = "order.address.country"
      }
      outputs = {
        taxAmount = "Applied tax amount"
      }
    }
  }
}
```

## Implementation Notes

- Render the target reference prominently so the reader knows where control jumps.
- Validate that `target` is non-empty and, if possible, resolve it to an existing diagram for navigation.

## Future Considerations

- Allow `version` or `commit` metadata to track the revision of the inserted diagram.
- Support `include` semantics for static templating alongside dynamic call semantics.
