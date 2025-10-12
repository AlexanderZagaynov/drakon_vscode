import type { Diagram, Statement } from './types.js';
import { DiagramBuilder } from './diagram/builder.js';

export function buildDiagram(statements: Statement[], errors: string[]): Diagram | null {
  const builder = new DiagramBuilder(errors);
  return builder.build(statements);
}
