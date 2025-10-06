# Duration Attachment

## Summary

- Secondary icon representing a time interval associated with an action or timer.
- Can mean “wait this long before executing” (with a timer) or “do this for X time” (without).

## Syntax

```hcl
attach "duration" "<attachment-id>" {
  target = "<block-id>"
  text   = "<caption>"
  timer  = "<timer-name>"
  window = "<ISO-8601 duration>"
  tags   = ["tag1", "tag2"]
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `window` | ✔ | Duration value (`PT10S`, `PT5M`, etc.). |
| `text` | ✖ | Caption printed inside the duration icon. |
| `timer` | ✖ | Name of the timer that schedules this duration. |
| `tags` | ✖ | Freeform labels. |
| `data` | ✖ | Additional metadata. |

## Variants

### Variant A — Duration Tied to Timer

```hcl
drakon "cooking_timer" {
  lane "kitchen" {
    timer "prep_timer" {
      name = "PrepTimer"
    }

    action "chop" {
      text = "Chop vegetables"
    }

    attach "duration" "wait_5m" {
      target = "chop"
      text   = "Start after 5 minutes"
      timer  = "PrepTimer"
      window = "PT5M"
    }
  }
}
```

### Variant B — Duration Without Timer (Perform for X Time)

```hcl
drakon "physiotherapy" {
  lane "clinic" {
    action "stretch" {
      text = "Stretch hamstrings"
    }

    attach "duration" "hold_30s" {
      target = "stretch"
      text   = "Hold for 30 seconds"
      window = "PT30S"
    }
  }
}
```

## Implementation Notes

- Render duration icons attached to the left side of the referenced block, matching DRAKON styling.
- When `timer` is provided, ensure a matching `timer` block exists.

## Future Considerations

- Allow multiple durations attached to the same block to model staggered follow-ups.
- Support relative expressions (`window "timerName + PT2M"`) for complex schedules.
