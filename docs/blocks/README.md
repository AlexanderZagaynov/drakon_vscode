# Block Reference Library

Each file in this directory documents a single DRAKON block or attachment in depth:

- Overview of semantics and how the block maps to the official icon.
- DSL syntax (HCL-compatible), required/optional attributes, and metadata hooks.
- Variants with textual diagram examples that exercise different layouts or behaviours.
- Implementation notes to guide renderer and tooling work.

Use these files as the authoritative source when updating the parser, renderer, or docs. Add new files when additional icons are introduced, and keep examples up to date as the DSL evolves. Because the syntax is valid HCL, you can experiment with examples inside generic HCL tooling or fence them as either `drakon` or `hcl` in Markdown.

> **Note:** Start and end terminators are implicit and no longer have corresponding DSL blocks. The renderer inserts a start node before the first authored block and closes the primary lane with an implicit end.
