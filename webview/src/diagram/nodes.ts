import type { BlockStatement, DiagramNode } from '../types.js';
import type { DiagramBuildContext } from './context.js';

function ensureAnchoredAlias(builder: DiagramBuildContext, node: DiagramNode, fallbackAnchor: string | null = null): void {
  const currentAnchor =
    typeof node.attributes.anchor === 'string' && node.attributes.anchor.trim()
      ? node.attributes.anchor.trim()
      : null;
  if (currentAnchor) {
    builder.registerAlias(currentAnchor, node.id);
    return;
  }
  if (fallbackAnchor) {
    node.attributes.anchor = fallbackAnchor;
    builder.registerAlias(fallbackAnchor, node.id);
  }
}

export function ensureStartNode(builder: DiagramBuildContext, implicitStartLabel: string): void {
  let startNode = builder.diagram.nodes.find((node) => node.type === 'start');
  if (!startNode) {
    const implicitStart: DiagramNode = {
      id: `${builder.diagramAnchorBase}@start`,
      type: 'start',
      column: builder.primaryColumn,
      label: implicitStartLabel,
      attributes: {
        implicit: true,
        anchor: `${builder.diagramAnchorBase}@start`,
        text: implicitStartLabel
      },
      block: {
        type: 'block',
        name: 'start',
        labels: ['start'],
        body: []
      }
    };
    if (builder.registerNode(builder.primaryColumn, implicitStart, 'prepend')) {
      builder.registerAlias('start', implicitStart.id);
      startNode = implicitStart;
    }
  } else {
    startNode.label = implicitStartLabel;
    if (!startNode.attributes || typeof startNode.attributes !== 'object') {
      startNode.attributes = {};
    }
    startNode.attributes.text = implicitStartLabel;
    ensureAnchoredAlias(builder, startNode, `${builder.diagramAnchorBase}@start`);
    builder.registerAlias('start', startNode.id);
  }
  builder.startNode = startNode ?? null;
}

export function ensureEndNodes(builder: DiagramBuildContext): void {
  const endNodes = builder.diagram.nodes.filter((node) => node.type === 'end');
  if (!endNodes.length) {
    const implicitEnd: DiagramNode = {
      id: `${builder.diagramAnchorBase}@end`,
      type: 'end',
      column: builder.primaryColumn,
      label: 'End',
      attributes: {
        implicit: true,
        anchor: `${builder.diagramAnchorBase}@end`
      },
      block: {
        type: 'block',
        name: 'end',
        labels: ['end'],
        body: []
      }
    };
    if (builder.registerNode(builder.primaryColumn, implicitEnd)) {
      builder.registerAlias('end', implicitEnd.id);
    }
  } else {
    endNodes.forEach((node, index) => {
      ensureAnchoredAlias(builder, node, index === 0 ? `${builder.diagramAnchorBase}@end` : null);
    });
  }
}

export function processForEachBody(
  builder: DiagramBuildContext,
  column: number,
  node: DiagramNode,
  blocks: BlockStatement[]
): void {
  if (!blocks.length) {
    return;
  }

  blocks.forEach((child) => {
    builder.createColumnNode(column, child);
  });

  const baseId = `${node.id}_end`;
  let loopEndId = baseId;
  let counter = 1;
  while (builder.nodeById.has(loopEndId)) {
    loopEndId = `${baseId}_${counter}`;
    counter += 1;
  }

  const loopEndNode: DiagramNode = {
    id: loopEndId,
    type: 'loop_end',
    column,
    label: '',
    attributes: {
      implicit: true,
      loop: node.id
    },
    block: {
      type: 'block',
      name: 'loop_end',
      labels: [loopEndId],
      body: []
    }
  };

  builder.registerNode(column, loopEndNode);
  node.attributes.loop_end = loopEndId;
}
