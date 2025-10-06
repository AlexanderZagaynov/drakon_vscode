# Parallel Block

## Summary

- Represents concurrent processes, mapping to the DRAKON Parallel Processes icon.
- Indicates that multiple threads or lanes proceed simultaneously.

## Syntax

```hcl
parallel "<block-id>" {
  text       = "<headline>"
  threads    = ["<thread-id>", "<thread-id>"]
  lane_group = ["<lane-id>", "<lane-id>"]
  tags       = ["tag1", "tag2"]
  anchor     = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `threads` | ✔ | Identifiers for the concurrent branches spawned. |
| `lane_group` | ✖ | Subset of lanes occupied by the concurrent work. |
| `text` | ✖ | Optional label. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor name. |
| `data` | ✖ | Extra metadata (e.g., synchronization details). |

## Variants

### Variant A — Two Named Threads

```hcl
drakon "fulfillment" {
  lane "operations" {
    parallel "fulfillment" {
      text    = "Fulfillment in parallel"
      threads = ["packing", "shipping"]
    }
  }
}
```

### Variant B — Threads with Lane Group

```hcl
drakon "fulfillment_lanes" {
  lane "warehouse" {
    title = "Warehouse"
  }

  lane "delivery" {
    title = "Delivery"
  }

  lane "ops" {
    parallel "fulfillment" {
      threads    = ["packing", "loading"]
      lane_group = ["warehouse", "delivery"]
    }
  }
}
```

## Implementation Notes

- Render each thread as a labelled branch leaving the parallel block; align with declared lanes.
- The renderer should ensure a corresponding merge (e.g., `line packing -> join`) to illustrate synchronization.

## Future Considerations

- Add `join -> <target>` clause to denote where threads converge.
- Allow inline thread definitions (mini-diagrams per thread) for advanced scenarios.
