# Simple Diagram Examples

The `.drakon` snippets in this directory act as focused smoke tests for the renderer while demonstrating how core icons look in the DSL. Each file can be opened directly in VS Code with the custom editor to see the rendered diagram.

## Included Samples
- [`action.drakon`](./action.drakon) – single action icon with a heredoc label; shows how indentation is stripped automatically.
- [`choice.drakon`](./choice.drakon) – choice icon with named cases, an implicit `else`, and a `next` transition.
- [`comment.drakon`](./comment.drakon) – standalone comment balloon with multiline text.
- [`empty.drakon`](./empty.drakon) – minimal diagram skeleton used for parser sanity checks.
- [`parameters.drakon`](./parameters.drakon) – illustrates the `parameters` attribute and automatic anchor wiring.
- [`insertion.drakon`](./insertion.drakon) – external flow call using the insertion icon to trigger `Publish report`.
- [`question_default.drakon`](./question_default.drakon) – question icon with an explicit branch and default fall-through.
- [`question_empty.drakon`](./question_empty.drakon) – question icon with an empty branch showing automatic connector labelling.
- [`question_reverse.drakon`](./question_reverse.drakon) – question icon with the `yes` branch routed into a side lane.

## Tips
- Run `npm run watch` so the webview bundle stays in sync while you tweak the samples.
- Use the toolbar export buttons in the custom editor to snapshot each example as SVG/PNG/WebP for documentation.
