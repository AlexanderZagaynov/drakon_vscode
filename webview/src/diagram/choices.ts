import type { DiagramNode, BlockStatement } from '../types.js';
import type { ChoiceCaseRecord } from './models.js';
import type { DiagramBuildContext } from './context.js';
import { splitStatements, deriveLabel } from './utils.js';

export function processChoiceCases(
  builder: DiagramBuildContext,
  column: number,
  node: DiagramNode,
  attributes: Record<string, unknown>,
  blocks: BlockStatement[]
): void {
  const nextAttr = typeof attributes.next === 'string' ? attributes.next.trim() : '';
  if (nextAttr) {
    builder.choiceNextRecords.push({ choiceId: node.id, nextRaw: nextAttr });
  }

  const cases: ChoiceCaseRecord[] = [];

  blocks.forEach((block, index) => {
    if (block.name !== 'case' && block.name !== 'else') {
      builder.createColumnNode(column, block);
      return;
    }

    const caseParts = splitStatements(block.body);
    const caseId = block.labels[0] ?? `${node.id}_${block.name}_${cases.length + 1}`;
    const caseLabel = deriveLabel(caseParts.attributes, caseId);
    const branchColumn = index === 0 ? column : builder.allocateColumn();

    const caseNode: DiagramNode = {
      id: caseId,
      type: block.name === 'case' ? 'choice_case' : 'choice_else',
      column: branchColumn,
      label: caseLabel,
      attributes: caseParts.attributes,
      block
    };

    if (!builder.registerNode(branchColumn, caseNode)) {
      return;
    }

    const nestedBlocks = caseParts.blocks;
    let firstChildId: string | null = null;
    let lastChildId: string | null = caseNode.id;

    nestedBlocks.forEach((child) => {
      const childNode = builder.createColumnNode(branchColumn, child);
      if (!childNode) {
        return;
      }
      if (!firstChildId) {
        firstChildId = childNode.id;
      }
      lastChildId = childNode.id;
    });

    const caseNextAttr = typeof caseParts.attributes.next === 'string' ? caseParts.attributes.next.trim() : '';

    cases.push({
      id: caseNode.id,
      label: caseLabel,
      kind: block.name === 'case' ? 'case' : 'else',
      branchStartId: firstChildId,
      branchEndId: lastChildId,
      direct: !firstChildId,
      nextRaw: caseNextAttr || undefined
    });
  });

  if (cases.length) {
    cases.forEach((record) => {
      builder.choiceCaseRecords.push({ choiceId: node.id, ...record });
    });
  }
}
