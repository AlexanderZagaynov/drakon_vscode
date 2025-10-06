# Choice Block

## Summary

- Implements multi-way branching (three or more outcomes) similar to the DRAKON Choice icon.
- Each branch is labelled and routed explicitly by the author.
- Supports an optional `else` branch for unmatched cases.

## Syntax

```hcl
choice "<block-id>" {
  text = "<question>"

  case {
    label  = "<label>"
    target = "<target-id>"
    handle = "east" # optional
  }
  # repeat case blocks as needed

  else = {
    target = "<target-id>"
    handle = "south"
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
| `text` | ✔ | Prompt displayed inside the block. |
| `case` | ✔ | Repeated blocks with `label`, `target`, and optional `handle`. |
| `else` | ✖ | Object describing the default branch when no case matches. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor for connectors. |
| `data` | ✖ | Extra metadata. |

## Variants

### Variant A — Three Explicit Cases

```hcl
drakon "triage" {
  lane "support" {
    choice "priority" {
      text = "Ticket priority?"
      case {
        label  = "Low"
        target = "backlog"
        handle = "east"
      }
      case {
        label  = "Medium"
        target = "queue"
        handle = "south"
      }
      case {
        label  = "High"
        target = "pager"
        handle = "west"
      }
    }

    action "backlog" {
      text = "Backlog"
    }
    action "queue" {
      text = "Assign to queue"
    }
    process "pager" {
      text    = "Page on-call"
      command = "Start"
    }
  }

  line {
    from  = "priority"
    to    = "backlog"
    kind  = "case"
    label = "Low"
  }
  line {
    from  = "priority"
    to    = "queue"
    kind  = "case"
    label = "Medium"
  }
  line {
    from  = "priority"
    to    = "pager"
    kind  = "case"
    label = "High"
  }
}
```

### Variant B — Cases with Else Branch

```hcl
drakon "triage_fallback" {
  lane "support" {
    choice "priority" {
      text = "Ticket priority?"
      case {
        label  = "P0"
        target = "pager"
      }
      case {
        label  = "P1"
        target = "pager"
      }
      else = {
        target = "backlog"
        handle = "south"
      }
    }

    process "pager" {
      text    = "Alert pager"
      command = "Start"
    }
    action "backlog" {
      text = "Add to backlog"
    }
  }

  line {
    from  = "priority"
    to    = "pager"
    kind  = "case"
    label = "P0/P1"
  }
  line {
    from  = "priority"
    to    = "backlog"
    kind  = "else"
    label = "Default"
  }
}
```

## Implementation Notes

- Ensure at least two `case` clauses exist; emit diagnostics otherwise.
- When multiple connectors exit the same side, auto-spacing should keep them legible; the `handle` hint helps avoid overlap.

## Future Considerations

- Introduce `case in [a, b, c]` shorthand to route multiple labels to the same target.
- Allow expressions or guards (e.g., `case when amount > 1000`).
