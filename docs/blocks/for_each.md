# For_Each Block

## Summary

- Encodes a DRAKON FOR loop where an action repeats for each element in a collection.
- Provides hooks for the current item, optional index, and loop exit anchor.

## Syntax

```hcl
for_each "<block-id>" {
  text       = "<headline>"
  item       = "<identifier>"
  collection = "<expression>"
  index      = "<identifier>"
  until      = "<anchor-id>"
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
| `item` | ✔ | Name bound to each element during iteration. |
| `collection` | ✔ | Expression that resolves to an iterable. |
| `text` | ✖ | Optional label displayed inside the loop icon. |
| `index` | ✖ | Optional counter variable name. |
| `until` | ✖ | Anchor to jump to when the loop finishes (defaults to next block). |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Additional metadata. |

## Variants

### Variant A — Basic Loop

```hcl
drakon "order_lines" {
  lane "system" {
    for_each "each_line" {
      item       = "line"
      collection = "order.lines"
    }

    action "validate" {
      text = "Validate line item"
    }
  }
}

line {
  from = "each_line"
  to   = "validate"
}
```

### Variant B — Loop with Index and Exit Anchor

```hcl
drakon "order_lines_exit" {
  lane "system" {
    for_each "each_line" {
      text       = "Review each line"
      item       = "line"
      index      = "idx"
      collection = "order.lines"
      until      = "end"
    }

    action "review" {
      text = "Review line ${idx}"
    }
  }

  line {
    from  = "each_line"
    to    = "review"
    kind  = "loop"
    label = "Next line"
  }

  line {
    from   = "each_line"
    to     = "end"
    kind   = "loop"
    label  = "Done"
    handle = "south"
  }
}
```

## Implementation Notes

- Render the collection expression prominently; truncation may harm readability.
- When `until` is omitted, assume the outgoing connector leaving the loop handles the exit condition.

## Future Considerations

- Support `where "<predicate>"` clauses to filter items.
- Allow nested `for_each` blocks with automatic numbering or indentation guidance.
