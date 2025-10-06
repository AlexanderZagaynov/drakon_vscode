# DRAKON Diagram Viewer

Render plain-text `.drakon` diagrams as interactive visuals inside VS Code.

## Features

- Associates `.drakon` files with a custom editor that renders a live diagram.
- Parses a small text DSL to define nodes and edges.
- Shows parsing errors inline and updates instantly as you type.

## Text DSL

Each line in a `.drakon` file can describe a node or an edge:

```text
# Comments start with '#'
node start start "Begin"
node s1 action "Gather input"
node d1 question "Is data valid?"
node s2 action "Process data"
node end end "Finish"

edge start -> s1
edge s1 -> d1
edge d1 -> s2 yes
edge d1 -> end no
edge s2 -> end
```

- `node <id> <type> "<label>"` registers a node.
  - Supported types: `start`, `action`, `question`, `end`.
  - Use `\n` inside the quoted label to insert line breaks.
- `edge <from> -> <to> [label]` connects two nodes. The optional label is useful for yes/no answers from questions.

Invalid statements are surfaced in the Problems section at the bottom of the viewer.

## Development

```bash
npm install
npm run watch
```

Press `F5` to launch a new VS Code instance with the extension loaded.

## License

MIT
