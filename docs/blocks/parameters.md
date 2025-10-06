# Parameters Section

## Summary

- Declare formal inputs inside the root `drakon` block using a single `parameters` attribute.
- The renderer synthesises a Parameters node immediately after the implicit Start terminator and connects it into the main liana.
- Use either a string, a list of lines, or an object with rich metadata to describe the parameters.
- Legacy `parameters { ... }` blocks are no longer supported; migrate existing diagrams to the attribute form.

## Syntax

### Simple Text

```hcl
drakon "intake" {
  parameters = <<-TEXT
    customer_id = "Guid"
    locale      = "ISO Language"
    channel     = "Enum<web|mobile|retail>"
  TEXT
}
```

### Structured Object

```hcl
drakon "checkout" {
  parameters = {
    id    = "signature"
    text  = "Checkout"
    lines = [
      "cart      = CartId",
      "customer  = CustomerId",
      "currency  = ISO-4217"
    ]
    tags   = ["api", "public"]
    anchor = "signature"
    data = {
      version = "v2"
      owner   = "Payments"
    }
  }
}
```

## Attribute Reference

| Field | Required | Description |
|-------|----------|-------------|
| string / heredoc | ✖ | Treat the value as the node caption (multi-line strings are supported via heredoc). |
| list | ✖ | Provide the caption as an ordered list of lines. |
| `text` | ✖ | Explicit caption string (dedented automatically). |
| `lines` | ✖ | Array of strings rendered line-by-line inside the icon. |
| `id` | ✖ | Override the generated node id (defaults to `parameters`). |
| `anchor` | ✖ | Custom anchor for connectors (defaults to `<diagram-id>@parameters`). |
| `tags` | ✖ | Freeform labels for search/automation. |
| `data` | ✖ | Arbitrary metadata passed through to tooling. |

## Behaviour

- The renderer creates a Parameters node even when other lanes omit it, guaranteeing a single shared definition.
- The node appears to the right of the Start/header terminator and connects via a horizontal spur, matching the canonical DRAKON layout.
- Sequential wiring is implicit: `Start → Parameters → next block` unless you override it with explicit `line` statements.
- The parser still binds the alias `parameters` to the node, so existing connectors that target `parameters` continue to resolve.

## Implementation Notes

- Reject `parameters` blocks inside lanes; emit a diagnostic instructing authors to use the root attribute instead.
- Lane (“shampur”) blocks never host Start, End, Parameters, or Silhouette loop icons—those are handled implicitly by the renderer.
- Dedent heredoc and `text` values before rendering so multi-line examples respect editor indentation.
- Preserve user-provided `anchor`, `tags`, `data`, and any custom fields on the generated node.
- Default anchors follow the same pattern as other implicit nodes (`<diagram-id>@parameters`) for stability.
