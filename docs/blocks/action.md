# Action Block

## Summary

- Captures an imperative instruction: “do something”.
- Corresponds to the rectangular Action icon in the DRAKON reference.
- Typically used to advance the main flow with one outgoing connector.

## Syntax

```hcl
action "<block-id>" {
  text   = "<command>"
  lines  = ["multi", "line command"]
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
| `text` | ✔ | Instruction shown inside the block. Multiple occurrences append with newlines. |
| `tags` | ✖ | Optional labels for search and theming. |
| `anchor` | ✖ | Custom anchor name for attaching lines (defaults to `<block-id>`). |
| `data` | ✖ | Arbitrary metadata for tooling integration. |

## Variants

The Action icon has a single visual form. Variants focus on lane placement or multiline content.

### Variant A — Single-Line Action

```hcl
drakon "build" {
  lane "ci" {
    action "compile" {
      text = "Compile sources"
    }
  }
}
```

### Variant B — Multi-Line Action with Tags

```hcl
drakon "build_multiline" {
  lane "ci" {
    action "package" {
      lines = [
        "Prepare",
        "release bundle",
      ]
      tags = ["release", "packaging"]
    }
  }
}
```

## Implementation Notes

- Word wrapping should follow VS Code font metrics; rely on newline markers to enforce explicit breaks.
- When present, `tags` may translate into icon adornments (e.g., coloured corner accents) in future iterations.

## Future Considerations

- Allow optional `icon "<symbol>"` metadata to render an overlay for domain-specific actions.
