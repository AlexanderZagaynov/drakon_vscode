# DRAKON Diagram Viewer

Render plain-text `.drakon` diagrams as interactive visuals inside VS Code.

## Features

- Associates `.drakon` files with a custom editor that renders a live diagram.
- Parses a small text DSL to define nodes and edges.
- Shows parsing errors inline and updates instantly as you type.

## Text DSL

We are drafting a rich text DSL that mirrors the official DRAKON icon set (Action, Question, Choice, Duration, Timer, etc.). The full proposal, including grammar, block keywords, connector options, and an end-to-end example, lives in [`docs/dsl-spec.md`](docs/dsl-spec.md).

> The current TypeScript renderer still understands only the legacy `node` / `edge` syntax. The HCL-compatible DSL in this repository is the target format; extending the parser to consume it (or providing a converter) is the next implementation phase.

### Block Reference

Every icon has a dedicated reference document with exhaustive variants and DSL examples under [`docs/blocks`](docs/blocks). For instance, [`docs/blocks/question.md`](docs/blocks/question.md) shows how to swap the Yes/No connector orientation.

> Embed diagrams in Markdown with fenced code blocks like:
>
> ````
> ```drakon
> drakon "example" {
>   lane "main" {
>    action "demo" {
>      text = "Preview"
>    }
>  }
> }
> ```
> ````

## Development

```bash
npm install
npm run watch
```

Press `F5` to launch a new VS Code instance with the extension loaded.

## License

MIT
