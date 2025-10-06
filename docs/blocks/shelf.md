# Shelf Block

## Summary

- Models temporary storage of data or artefacts, matching the DRAKON Shelf icon.
- Useful for highlighting intermediate results or cached content.

## Syntax

```hcl
shelf "<block-id>" {
  text      = "<headline>"
  contents  = { <name> = "<description>" }
  tags      = ["tag1", "tag2"]
  anchor    = "<anchor-name>"
  data = {
    key = "value"
  }
}
```

## Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `contents` | ✔ | Key/value pairs describing stored items. |
| `text` | ✖ | Optional title displayed above the shelf. |
| `tags` | ✖ | Freeform labels. |
| `anchor` | ✖ | Custom anchor. |
| `data` | ✖ | Additional metadata (e.g., retention policy). |

## Variants

### Variant A — Simple Shelf

```hcl
drakon "processing" {
  lane "pipeline" {
    shelf "cache" {
      contents = {
        payload = "Original request payload"
      }
    }
  }
}
```

### Variant B — Shelf with Multiple Entries

```hcl
drakon "processing_multi" {
  lane "pipeline" {
    shelf "cache" {
      text = "Cache"
      contents = {
        raw        = "Raw data"
        normalized = "Normalized data"
        errors     = "Validation errors"
      }
    }
  }
}
```

## Implementation Notes

- Render each `contents` entry as a row within the shelf body.
- Allow connectors to attach to the shelf’s edges; the icon itself does not alter control flow.

## Future Considerations

- Support `capacity "<size>"` metadata to model limits.
- Allow nested shelves to represent hierarchical storage.
