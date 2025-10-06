# Question Block

## Summary

- Represents a binary decision that branches the flow into two labelled paths.
- Semantics mirror the official DRAKON Question icon: one outgoing line for “Yes” and one for “No”.
- The renderer must allow the author to choose which direction each branch exits from (downward, right, left, etc.).

## Syntax

```hcl
question "<block-id>" {
  text = "<prompt>"
  yes = {
    target = "<target-id>"
    label  = "<label>"
    handle = "south" # north | south | east | west
  }
  no = {
    target = "<target-id>"
    label  = "<label>"
    handle = "east"
  }
  tags   = ["tag1", "tag2"]
  anchor = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

- The `text` clauses may be repeated to create multi-line prompts.
- `handle` hints route the connector out of a particular side, matching the visual freedom offered in DRAKON editors.
- If `label` is omitted the renderer should default to localized “Yes” / “No”.

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `text` | ✔ | The decision prompt. Multiple occurrences append with newlines. |
| `yes` | ✔ | Object describing the “Yes” branch (`target`, optional `label`, optional `handle`). |
| `no` | ✔ | Object describing the “No” branch (`target`, optional `label`, optional `handle`). |
| `tags` | ✖ | Freeform labels for search, filtering, or theming. |
| `anchor` | ✖ | Exposes a named anchor if connectors must attach to a specific port. |
| `data` | ✖ | Arbitrary key/value metadata for tooling or generators. |

## Variants

### Variant A — Yes Down, No Right (Default)

```hcl
drakon "payment_check" {
  lane "system" {
    question "payment?" {
      text = "Payment received?"
      yes = {
        target = "pack_order"
        handle = "south"
      }
      no = {
        target = "notify_customer"
        label  = "No"
        handle = "east"
      }
    }

    action "pack_order" {
      text = "Pack order for shipment"
    }
  }

  lane "customer" {
    simple_output "notify_customer" {
      actor   = "Customer"
      message = "Please complete your payment"
    }
  }

  line {
    from  = "payment?"
    to    = "pack_order"
    kind  = "yes"
    label = "Yes"
  }

  line {
    from  = "payment?"
    to    = "notify_customer"
    kind  = "no"
    label = "No"
  }
}
```

- The main “Yes” flow continues downward into `pack_order`.
- The “No” path leaves to the right toward `notify_customer`, matching the visual convention in the reference.

### Variant B — No Down, Yes Right (Swapped Labels)

```hcl
drakon "payment_check_swapped" {
  lane "system" {
    question "payment?" {
      text = "Payment received?"
      yes = {
        target = "notify_customer"
        label  = "Yes"
        handle = "east"
      }
      no = {
        target = "pack_order"
        label  = "No"
        handle = "south"
      }
    }

    action "pack_order" {
      text = "Hold shipment"
    }
  }

  lane "customer" {
    simple_output "notify_customer" {
      actor   = "Customer"
      message = "Dispatch invoice"
    }
  }

  line {
    from  = "payment?"
    to    = "notify_customer"
    kind  = "yes"
    label = "Yes"
  }

  line {
    from  = "payment?"
    to    = "pack_order"
    kind  = "no"
    label = "No"
  }
}
```

- Demonstrates flipping the labels via DSL configuration without changing the block geometry.
- The renderer should respect the `kind` annotations to ensure the visual styling (e.g., branch colouring) matches the semantics.

## Implementation Notes

- When either `label` clause is omitted the renderer should localize “Yes” and “No” based on diagram locale settings.
- Validate that both `yes` and `no` targets are defined; emit diagnostics otherwise.
- Encourage authors to specify `handle` so connectors leave the icon predictably, especially in crowded diagrams.

## Future Considerations

- Allow an optional `description """…"""` block for extended notes that appear in tooltips.
- Consider alternate keywords (`true` / `false`) or localization overrides for domains that prefer custom branch labels.
