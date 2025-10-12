import type { DiagramEdge, DiagramNode, Statement } from '../types.js';
import type { BranchKind } from './models.js';
import { splitStatements } from './utils.js';
import type { DiagramBuildContext } from './context.js';

function toStatementArray(value: unknown): Statement[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const statements: Statement[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const candidate = entry as Statement;
    if (candidate.type !== 'attribute' && candidate.type !== 'block') {
      return null;
    }
    statements.push(candidate);
  }
  return statements;
}

interface BranchDescriptor {
  kind: BranchKind;
  statements: Statement[];
}

export function processQuestionBranches(
  builder: DiagramBuildContext,
  column: number,
  node: DiagramNode,
  attributes: Record<string, unknown>
): void {
  const yesStatements = toStatementArray(attributes.yes);
  const noStatements = toStatementArray(attributes.no);
  const nextAttr = typeof attributes.next === 'string' ? attributes.next.trim() : '';

  if (!yesStatements && !noStatements) {
    const branchLabel = 'No';
    builder.questionBranchInfo.set(node.id, {
      branchKind: 'no',
      branchStartId: null,
      branchEndId: null,
      defaultKind: 'yes',
      direct: true,
      nextRaw: nextAttr || undefined
    });
    attributes.no = {
      direct: true,
      label: branchLabel
    };
    return;
  }

  const branches: BranchDescriptor[] = [];
  if (yesStatements) {
    if (yesStatements.length) {
      branches.push({ kind: 'yes', statements: yesStatements });
    } else {
      builder.errors.push(`Question "${node.id}" branch "yes" must include at least one block.`);
    }
  }
  if (noStatements) {
    if (noStatements.length) {
      branches.push({ kind: 'no', statements: noStatements });
    } else {
      builder.errors.push(`Question "${node.id}" branch "no" must include at least one block.`);
    }
  }

  if (!branches.length) {
    return;
  }

  if (branches.length > 1) {
    builder.errors.push(`Question "${node.id}" cannot define both "yes" and "no" branch blocks. Choose one explicit branch.`);
    return;
  }

  const branch = branches[0];
  const branchParts = splitStatements(branch.statements);
  const branchBlocks = branchParts.blocks;

  if (!branchBlocks.length) {
    const branchLabel = branch.kind === 'yes' ? 'Yes' : 'No';
    builder.questionBranchInfo.set(node.id, {
      branchKind: branch.kind,
      branchStartId: null,
      branchEndId: null,
      defaultKind: branch.kind === 'yes' ? 'no' : 'yes',
      direct: true,
      nextRaw: nextAttr || undefined
    });
    attributes[branch.kind] = {
      direct: true,
      label: branchLabel
    };
    return;
  }

  const requestedColumn =
    typeof branchParts.attributes.column === 'number' ? (branchParts.attributes.column as number) : undefined;
  const branchColumn =
    requestedColumn !== undefined && Number.isFinite(requestedColumn)
      ? requestedColumn
      : builder.allocateColumn();
  builder.ensureColumn(branchColumn);

  const startIndex = builder.columnNodes.get(branchColumn)?.length ?? 0;
  branchBlocks.forEach((child) => {
    if (child.name === 'line' || child.name === 'attach' || child.name === 'note') {
      builder.errors.push(
        `Block "${child.name}" is not supported inside question branch "${branch.kind}" of "${node.id}".`
      );
      return;
    }
    builder.createColumnNode(branchColumn, child);
  });

  const branchColumnNodes = builder.columnNodes.get(branchColumn) ?? [];
  const createdNodes = branchColumnNodes.slice(startIndex);
  if (!createdNodes.length) {
    builder.errors.push(`Question "${node.id}" branch "${branch.kind}" did not create any nodes.`);
    return;
  }

  const branchStart = createdNodes[0];
  const branchEnd = createdNodes[createdNodes.length - 1];

  const existingEdge = builder.diagram.edges.some(
    (edge: DiagramEdge) => (edge.fromBase ?? edge.from) === node.id && (edge.toBase ?? edge.to) === branchStart.id
  );
  if (!existingEdge) {
    const branchLabel = branch.kind === 'yes' ? 'Yes' : 'No';
    builder.diagram.edges.push({
      from: node.id,
      to: branchStart.id,
      kind: branch.kind,
      label: branchLabel,
      note: '',
      handle: '',
      attributes: { implicit: true, branch: branch.kind, branch_lane: true },
      fromBase: node.id,
      toBase: branchStart.id
    });
  }

  builder.questionBranchInfo.set(node.id, {
    branchKind: branch.kind,
    branchStartId: branchStart.id,
    branchEndId: branchEnd.id,
    defaultKind: branch.kind === 'yes' ? 'no' : 'yes',
    direct: false,
    nextRaw: nextAttr || undefined
  });

  attributes[branch.kind] = {
    column: branchColumn,
    start: branchStart.id,
    end: branchEnd.id
  };
}
