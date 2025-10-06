# Process Block

## Summary

- Controls lifecycle of a parallel/background process, corresponding to the DRAKON Process icon.
- Supports commands such as Start, Pause, Continue, and Stop.
- Typically coordinates with separate diagrams describing the managed process.

## Syntax

```hcl
process "<block-id>" {
  text    = "<headline>"
  command = "<Start|Pause|Continue|Stop>"
  process = "<process-name>"
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
| `command` | ✔ | Lifecycle action to apply to the process. |
| `process` | ✖ | Name/identifier of the controlled process. |
| `text` | ✖ | Caption displayed in the block. |
| `tags` | ✖ | Labels for filtering. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Metadata (e.g., process ID, SLA). |

## Variants

### Variant A — Start a Background Process

```hcl
drakon "monitoring" {
  lane "ops" {
    process "start_monitoring" {
      text    = "Start monitoring"
      command = "Start"
      process = "Monitor service"
    }
  }
}
```

### Variant B — Stop an Existing Process

```hcl
drakon "monitoring_stop" {
  lane "ops" {
    process "stop_monitoring" {
      text    = "Stop monitoring"
      command = "Stop"
      process = "Monitor service"
    }
  }
}
```

## Implementation Notes

- Display the `command` prominently (e.g., as a header inside the icon) to match the official visual.
- Optionally link the `process` name to documentation of the background workflow.

## Future Considerations

- Support `command Restart` (composed of Stop + Start) for convenience.
- Allow `on_event "<trigger>"` to describe when the command is invoked.
