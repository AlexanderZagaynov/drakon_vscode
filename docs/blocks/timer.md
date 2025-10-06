# Timer Block

## Summary

- Starts a named timer that coordinates subsequent Duration attachments.
- Corresponds to the DRAKON Timer icon (hourglass).

## Syntax

```hcl
timer "<block-id>" {
  text   = "<headline>"
  name   = "<timer-name>"
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
| `name` | ✔ | Identifier referenced by attached durations. |
| `text` | ✖ | Optional label. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Additional metadata (e.g., timer type). |

## Variants

### Variant A — Basic Timer

```hcl
drakon "reminders" {
  lane "care" {
    timer "medication" {
      name = "MorningDose"
    }
  }
}
```

### Variant B — Timer with Multiple Durations

```hcl
drakon "reminders_schedule" {
  lane "care" {
    timer "medication" {
      text = "Start medication timer"
      name = "MorningDose"
    }

    action "take_pill" {
      text = "Take pill"
    }
    action "followup_call" {
      text = "Follow-up call"
    }

    attach "duration" "after_30m" {
      target = "take_pill"
      timer  = "MorningDose"
      window = "PT30M"
      text   = "Remind after 30 minutes"
    }

    attach "duration" "after_2h" {
      target = "followup_call"
      timer  = "MorningDose"
      window = "PT2H"
      text   = "Check after 2 hours"
    }
  }
}
```

## Implementation Notes

- Highlight the timer `name` so linked durations are easy to trace.
- Ensure at least one attached duration references the timer to avoid dead timers.

## Future Considerations

- Allow `kind <one_shot|recurring>` metadata for scheduling nuances.
- Support `data { timezone: "UTC" }` to clarify timing context.
