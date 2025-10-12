// CSI: shapes registry — maps diagram node types to their drawing specs so the
// renderer can construct consistent SVG geometry.

import type { Selection } from 'd3';
import type { DiagramNode, NodeGeometry, NodeSpec } from '../types.js';
import { defaultSpec } from './default.js';
import { startSpec } from './start.js';
import { endSpec } from './end.js';
import { actionSpec } from './action.js';
import { parametersSpec } from './parameters.js';
import { commentSpec } from './comment.js';
import { questionSpec } from './question.js';
import { choiceSpec } from './choice.js';
import { choiceCaseSpec } from './choice_case.js';
import { insertionSpec } from './insertion.js';
import { forEachSpec } from './for_each.js';
import { loopEndSpec } from './loop_end.js';
import { parallelSpec } from './parallel.js';
import { inputSpec } from './input.js';
import { outputSpec } from './output.js';
import { simpleInputSpec } from './simple_input.js';
import { simpleOutputSpec } from './simple_output.js';
import { shelfSpec } from './shelf.js';
import { processSpec } from './process.js';
import { ctrlPeriodStartSpec } from './ctrl_period_start.js';
import { ctrlPeriodEndSpec } from './ctrl_period_end.js';
import { durationSpec } from './duration.js';
import { pauseSpec } from './pause.js';
import { timerSpec } from './timer.js';
import { groupDurationSpec } from './group_duration.js';

const NODE_LIBRARY: Record<string, NodeSpec> = {
  default: defaultSpec,
  start: startSpec,
  end: endSpec,
  action: actionSpec,
  parameters: parametersSpec,
  comment: commentSpec,
  question: questionSpec,
  choice: choiceSpec,
  choice_case: choiceCaseSpec,
  choice_else: choiceCaseSpec,
  insertion: insertionSpec,
  for_each: forEachSpec,
  loop_end: loopEndSpec,
  parallel: parallelSpec,
  input: inputSpec,
  output: outputSpec,
  simple_input: simpleInputSpec,
  simple_output: simpleOutputSpec,
  shelf: shelfSpec,
  process: processSpec,
  ctrl_period_start: ctrlPeriodStartSpec,
  ctrl_period_end: ctrlPeriodEndSpec,
  duration: durationSpec,
  pause: pauseSpec,
  timer: timerSpec,
  group_duration: groupDurationSpec
};

export function getNodeSpec(type: string): NodeSpec {
  // CSI: spec lookup — fall back to default visuals when an unknown node type
  // is encountered.
  return NODE_LIBRARY[type] ?? defaultSpec;
}

export function drawNode(group: Selection<SVGGElement, unknown, null, undefined>, node: DiagramNode): void {
  // CSI: geometry contract — layout attaches `geometry` before render; treat it
  // as required to keep drawing math predictable.
  group.selectAll('*').remove();
  const geometry = node.geometry as NodeGeometry;
  const {
    width,
    height,
    spec,
    lines,
    lineHeight,
    textYOffset,
    paddingTop,
    paddingLeft,
    paddingRight,
    wrappedLines
  } = geometry;
  // CSI: drawing delegate — use the node-specific draw routine, defaulting to
  // the generic shape when custom art is missing.
  const draw = spec.draw ?? defaultSpec.draw;
  draw(group, width, height, node);

  const labelLines = wrappedLines && wrappedLines.length ? wrappedLines : [''];
  const baselineMode = spec.textBaseline ?? 'center';
  const alignMode = spec.textAlign ?? 'center';
  const anchor = alignMode === 'left' ? 'start' : alignMode === 'right' ? 'end' : 'middle';
  let baseX = 0;
  if (alignMode === 'left') {
    baseX = -width / 2 + paddingLeft;
  } else if (alignMode === 'right') {
    baseX = width / 2 - paddingRight;
  }
  const text = group
    .append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', anchor);

  if (baselineMode === 'top') {
    // CSI: top baseline — stack tspans from the upper padding for timeline-
    // style shapes.
    text.attr('dominant-baseline', 'text-before-edge').attr('y', -height / 2 + paddingTop).attr('x', baseX);
    labelLines.forEach((line, index) => {
      text
        .append('tspan')
        .attr('x', baseX)
        .attr('dy', index === 0 ? 0 : lineHeight)
        .text(line);
    });
  } else {
    // CSI: centered baseline — default flow keeps labels vertically centered
    // while respecting custom offsets.
    const lineCount = Math.max(1, lines);
    const initialDy = -((lineCount - 1) / 2) * lineHeight;
    text.attr('dominant-baseline', 'middle').attr('y', textYOffset).attr('x', baseX);
    labelLines.forEach((line, index) => {
      text
        .append('tspan')
        .attr('x', baseX)
        .attr('dy', index === 0 ? initialDy : lineHeight)
        .text(line);
    });
  }
}
