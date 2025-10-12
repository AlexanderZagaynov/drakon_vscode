import { baseAnchor } from '../shared.js';
import type { DiagramEdge } from '../types.js';
import type { ChoiceCaseRecord } from './models.js';
import type { DiagramBuildContext } from './context.js';

export function resolveQuestionNextTargets(builder: DiagramBuildContext): void {
  builder.questionBranchInfo.forEach((info, questionId) => {
    if (info.nextRaw) {
      const resolved = builder.resolveReference(info.nextRaw, `Question "${questionId}" next`);
      if (resolved) {
        info.nextResolved = resolved;
      }
    }
  });
}

export function resolveChoiceNextTargets(builder: DiagramBuildContext): Map<string, { full: string; base: string }> {
  const choiceNextResolved = new Map<string, { full: string; base: string }>();
  builder.choiceNextRecords.forEach(({ choiceId, nextRaw }) => {
    const resolved = builder.resolveReference(nextRaw, `Choice "${choiceId}" next`);
    if (resolved) {
      choiceNextResolved.set(choiceId, resolved);
    }
  });
  const choiceCaseInfo = d3.group(builder.choiceCaseRecords, (record) => record.choiceId);
  choiceCaseInfo.forEach((records) => {
    records.forEach((record) => {
      if (record.nextRaw) {
        const resolved = builder.resolveReference(record.nextRaw, `Case "${record.id}" next`);
        if (resolved) {
          record.nextResolved = resolved;
        }
      }
    });
  });
  return choiceNextResolved;
}

export function connectImplicitColumnEdges(builder: DiagramBuildContext): void {
  builder.columnNodes.forEach((nodes) => {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const fromNode = nodes[index];
      const toNode = nodes[index + 1];
      if (
        (fromNode.type === 'question' && builder.questionBranchInfo.has(fromNode.id)) ||
        (fromNode.type === 'choice' && builder.choiceCaseRecords.some((record) => record.choiceId === fromNode.id))
      ) {
        continue;
      }
      const key = `${fromNode.id}>${toNode.id}`;
      if (builder.explicitEdgeSet.has(key)) {
        continue;
      }
      const edge: DiagramEdge = {
        from: fromNode.id,
        to: toNode.id,
        kind: 'main',
        label: '',
        note: '',
        handle: '',
        attributes: { implicit: true },
        fromBase: fromNode.id,
        toBase: toNode.id
      };
      builder.diagram.edges.push(edge);
      builder.explicitEdgeSet.add(key);
    }
  });
}

export function buildQuestionEdges(builder: DiagramBuildContext, defaultEndId: string | null): void {
  builder.questionBranchInfo.forEach((info, questionId) => {
    const targetFull = info.nextResolved?.full ?? defaultEndId;
    const targetBase = info.nextResolved?.base ?? defaultEndId;
    if (!targetFull || !targetBase) {
      return;
    }

    const mainKey = `${questionId}>${targetBase}`;
    if (!builder.explicitEdgeSet.has(mainKey)) {
      const mainLabel = info.defaultKind === 'yes' ? 'Yes' : 'No';
      builder.diagram.edges.push({
        from: questionId,
        to: targetFull,
        kind: info.defaultKind,
        label: mainLabel,
        note: '',
        handle: '',
        attributes: { implicit: true, branch: info.defaultKind, branch_main: true },
        fromBase: questionId,
        toBase: targetBase
      });
      builder.explicitEdgeSet.add(mainKey);
    }

    if (info.direct) {
      const branchLabel = info.branchKind === 'yes' ? 'Yes' : 'No';
      builder.diagram.edges.push({
        from: questionId,
        to: targetFull,
        kind: info.branchKind,
        label: branchLabel,
        note: '',
        handle: '',
        attributes: { implicit: true, branch: info.branchKind, branch_direct: true },
        fromBase: questionId,
        toBase: targetBase
      });
      return;
    }

    if (!info.branchEndId || info.branchEndId === targetBase) {
      return;
    }

    const rejoinKey = `${info.branchEndId}>${targetBase}`;
    if (builder.explicitEdgeSet.has(rejoinKey)) {
      return;
    }

    builder.diagram.edges.push({
      from: info.branchEndId,
      to: targetFull,
      kind: 'main',
      label: '',
      note: '',
      handle: '',
      attributes: { implicit: true, branch: info.branchKind, rejoin: true },
      fromBase: info.branchEndId,
      toBase: targetBase
    });
    builder.explicitEdgeSet.add(rejoinKey);
  });
}

export function buildChoiceEdges(
  builder: DiagramBuildContext,
  choiceCaseInfo: Map<string, ChoiceCaseRecord[]>,
  choiceNextResolved: Map<string, { full: string; base: string }>,
  defaultEndId: string | null
): void {
  choiceCaseInfo.forEach((records, choiceId) => {
    const defaultTarget = choiceNextResolved.get(choiceId);
    const fallbackTarget = defaultTarget ?? (defaultEndId ? { full: defaultEndId, base: defaultEndId } : undefined);

    records.forEach((record) => {
      const branchEdgeKey = `${choiceId}>${record.id}`;
      if (!builder.explicitEdgeSet.has(branchEdgeKey)) {
        builder.diagram.edges.push({
          from: choiceId,
          to: record.id,
          kind: record.kind,
          label: '',
          note: '',
          handle: '',
          attributes: { implicit: true, branch: record.kind, branch_case: true },
          fromBase: choiceId,
          toBase: record.id
        });
        builder.explicitEdgeSet.add(branchEdgeKey);
      }

      const resolvedTarget = record.nextResolved ?? fallbackTarget;
      if (!resolvedTarget) {
        return;
      }

      if (record.direct) {
        const directKey = `${record.id}>${resolvedTarget.base}`;
        if (!builder.explicitEdgeSet.has(directKey)) {
          builder.diagram.edges.push({
            from: record.id,
            to: resolvedTarget.full,
            kind: record.kind,
            label: '',
            note: '',
            handle: '',
            attributes: { implicit: true, branch: record.kind, branch_direct: true },
            fromBase: record.id,
            toBase: resolvedTarget.base
          });
          builder.explicitEdgeSet.add(directKey);
        }
        return;
      }

      const branchEnd = record.branchEndId;
      if (!branchEnd || branchEnd === resolvedTarget.base) {
        return;
      }

      const rejoinKeyCase = `${branchEnd}>${resolvedTarget.base}`;
      if (builder.explicitEdgeSet.has(rejoinKeyCase)) {
        return;
      }

      builder.diagram.edges.push({
        from: branchEnd,
        to: resolvedTarget.full,
        kind: 'main',
        label: '',
        note: '',
        handle: '',
        attributes: { implicit: true, branch: record.kind, rejoin: true },
        fromBase: branchEnd,
        toBase: resolvedTarget.base
      });
      builder.explicitEdgeSet.add(rejoinKeyCase);
    });
  });
}

export function finalizeEdgeAnchors(builder: DiagramBuildContext): void {
  builder.diagram.edges.forEach((edge) => {
    const fromId = edge.fromBase ?? baseAnchor(edge.from);
    const toId = edge.toBase ?? baseAnchor(edge.to);
    edge.fromBase = fromId;
    edge.toBase = toId;
    if (!builder.nodeById.has(fromId)) {
      builder.errors.push(`Line references unknown source "${edge.from}".`);
    }
    if (!builder.nodeById.has(toId)) {
      builder.errors.push(`Line references unknown target "${edge.to}".`);
    }
  });
}
