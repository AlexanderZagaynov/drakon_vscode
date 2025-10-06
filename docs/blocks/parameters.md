# Parameters Block

## Summary

- Lists formal inputs for the algorithm, matching the DRAKON “Formal parameters” icon.
- Usually appears immediately after the `start` block to declare required data.
- Supports structured parameter descriptions (names, types, notes).

## Syntax

```hcl
parameters "<block-id>" {
  text   = "<title>"
  inputs = {
    <param-name> = "<type or description>"
    # ...
  }
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
| `text` | ✖ | Optional headline. Defaults to “Parameters”. |
| `inputs` | ✔ | Key/value pairs enumerating the formal parameters. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor for connectors. |
| `data` | ✖ | Metadata for generators (e.g., code scaffolding). |

## Variants

### Variant A — Minimal Parameter List

```hcl
drakon "route_planner" {
  lane "planner" {
    start "begin" {}

    parameters "inputs" {
      inputs = {
        from = "Coordinate"
        to   = "Coordinate"
      }
    }

    action "plan_route" {
      text = "Calculate optimal route"
    }
  }
}

line {
  from = "begin"
  to   = "inputs"
}

line {
  from = "inputs"
  to   = "plan_route"
}
```

### Variant B — Parameters with Headline and Tags

```hcl
drakon "route_planner_detailed" {
  lane "planner" {
    parameters "inputs" {
      text = "Inputs"
      inputs = {
        from    = "Coordinate — starting point"
        to      = "Coordinate — destination"
        vehicle = "Enum<Car|Bike|Walk>"
      }
      tags = ["api", "public"]
    }
  }
}
```

## Implementation Notes

- Render each `inputs` entry as a row; long descriptions may wrap across multiple lines.
- The DSL should surface diagnostics when duplicate parameter names are declared.

## Future Considerations

- Accept nested structures (e.g., `inputs.person.name`) for complex types.
- Provide an optional `outputs` section when the diagram documents a function signature.
