# Group Duration Attachment

## Summary

- Specifies that a set of actions must complete within a shared time window.
- Mirrors the DRAKON Group Duration icon attached alongside related blocks.

## Syntax

```hcl
attach "group_duration" "<attachment-id>" {
  target = "<block-id>"
  text   = "<headline>"
  window = "<ISO-8601 duration>"
  covers = ["<anchor-id>", "<anchor-id>"]
  tags   = ["tag1", "tag2"]
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `window` | ✔ | Shared time allowance. |
| `covers` | ✔ | Anchors or block IDs that fall under this duration requirement. |
| `text` | ✖ | Optional label. |
| `tags` | ✖ | Freeform labels. |
| `data` | ✖ | Metadata (e.g., SLA). |

## Variants

### Variant A — Cover a Single Action

```hcl
drakon "response_time" {
  lane "operations" {
    action "respond" {
      text = "Respond to alert"
    }

    attach "group_duration" "srt" {
      target = "respond"
      text   = "Resolve within 15 minutes"
      window = "PT15M"
      covers = ["respond"]
    }
  }
}
```

### Variant B — Cover Multiple Anchors

```hcl
drakon "response_team" {
  lane "operations" {
    action "triage" {
      text   = "Triage incident"
      anchor = "triage_complete"
    }
    action "mitigate" {
      text   = "Apply mitigation"
      anchor = "mitigate_complete"
    }

    attach "group_duration" "srt" {
      target = "triage"
      window = "PT30M"
      covers = ["triage_complete", "mitigate_complete"]
    }
  }
}
```

## Implementation Notes

- Visualize the attachment spanning the vertical range of the covered blocks, similar to official diagrams.
- Validate that each `covers` entry resolves to a known anchor; warn if not.

## Future Considerations

- Allow nested group durations for hierarchical SLAs.
- Support `starts_with <block-id>` and `ends_with <block-id>` syntactic sugar instead of manual anchor declaration.
