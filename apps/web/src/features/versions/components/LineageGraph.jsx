import React, { useMemo, useRef, useEffect, useState } from 'react';
import { cn } from '@canopy/ui';
import { versionTitle } from '../../workspace/services/workspaceData.js';

const NODE_W = 120;
const NODE_H = 36;
const GAP_X = 160;
const GAP_Y = 72;
const PAD = 40;

/**
 * Pure-SVG lineage DAG graph.
 * Renders versions as nodes and edges as connectors.
 * No external graph library required.
 */
export function LineageGraph({ versions = [], edges = [], selectedVersionId, onSelectVersion }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // --- Layout: assign x/y positions using a topological sort + lane assignment ---
  const layout = useMemo(() => {
    if (!versions.length) return { nodes: [], edgeLines: [], width: 0, height: 0 };

    const byId = new Map(versions.map((v) => [v.id, v]));
    const parentMap = new Map();
    const childMap = new Map();
    for (const edge of edges) {
      if (!parentMap.has(edge.version_id)) parentMap.set(edge.version_id, []);
      parentMap.get(edge.version_id).push(edge.parent_version_id);
      if (!childMap.has(edge.parent_version_id)) childMap.set(edge.parent_version_id, []);
      childMap.get(edge.parent_version_id).push(edge.version_id);
    }

    // Topological sort (Kahn's algorithm)
    const inDegree = new Map(versions.map((v) => [v.id, 0]));
    for (const edge of edges) {
      inDegree.set(edge.version_id, (inDegree.get(edge.version_id) || 0) + 1);
    }
    const queue = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }
    const sorted = [];
    while (queue.length) {
      const id = queue.shift();
      sorted.push(id);
      for (const childId of childMap.get(id) || []) {
        inDegree.set(childId, inDegree.get(childId) - 1);
        if (inDegree.get(childId) === 0) queue.push(childId);
      }
    }

    // Assign depths (longest path from root)
    const depth = new Map();
    for (const id of sorted) {
      const parents = parentMap.get(id) || [];
      const maxParentDepth = parents.reduce((max, pid) => Math.max(max, depth.get(pid) ?? -1), -1);
      depth.set(id, maxParentDepth + 1);
    }

    // Assign lanes (avoid overlaps at same depth)
    const depthLanes = new Map();
    const lane = new Map();
    for (const id of sorted) {
      const d = depth.get(id);
      if (!depthLanes.has(d)) depthLanes.set(d, 0);
      lane.set(id, depthLanes.get(d));
      depthLanes.set(d, depthLanes.get(d) + 1);
    }

    const maxDepth = Math.max(...[...depth.values()], 0);
    const maxLane = Math.max(...[...lane.values()], 0);

    const nodes = sorted.map((id) => ({
      id,
      version: byId.get(id),
      x: PAD + depth.get(id) * GAP_X,
      y: PAD + lane.get(id) * GAP_Y,
      isBranch: (childMap.get(id)?.length || 0) > 1,
      isMerge: (parentMap.get(id)?.length || 0) > 1,
      isRoot: !parentMap.has(id) || parentMap.get(id).length === 0
    }));

    const nodePos = new Map(nodes.map((n) => [n.id, n]));

    const edgeLines = edges.map((edge) => {
      const from = nodePos.get(edge.parent_version_id);
      const to = nodePos.get(edge.version_id);
      if (!from || !to) return null;
      return {
        key: `${edge.parent_version_id}-${edge.version_id}`,
        x1: from.x + NODE_W,
        y1: from.y + NODE_H / 2,
        x2: to.x,
        y2: to.y + NODE_H / 2,
        role: edge.role || 'primary'
      };
    }).filter(Boolean);

    return {
      nodes,
      edgeLines,
      width: PAD * 2 + (maxDepth + 1) * GAP_X,
      height: PAD * 2 + (maxLane + 1) * GAP_Y
    };
  }, [versions, edges]);

  // Pan handling
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  // Auto-center on selected node
  useEffect(() => {
    if (!selectedVersionId || !containerRef.current) return;
    const node = layout.nodes.find((n) => n.id === selectedVersionId);
    if (!node) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - node.x - NODE_W / 2,
      y: rect.height / 2 - node.y - NODE_H / 2
    });
  }, [selectedVersionId, layout.nodes]);

  if (!versions.length) {
    return <div className="flex items-center justify-center p-8 text-xs text-canopy-muted">No lineage data yet.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-full w-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        width={layout.width}
        height={layout.height}
        className="absolute top-0 left-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        <defs>
          <marker id="arrow-primary" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3DDC84" opacity="0.6" />
          </marker>
          <marker id="arrow-merge" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" opacity="0.6" />
          </marker>
        </defs>

        {/* Edges */}
        {layout.edgeLines.map((edge) => {
          const isMergeLine = edge.role === 'merge_source';
          const midX = (edge.x1 + edge.x2) / 2;
          return (
            <path
              key={edge.key}
              d={`M ${edge.x1} ${edge.y1} C ${midX} ${edge.y1}, ${midX} ${edge.y2}, ${edge.x2} ${edge.y2}`}
              fill="none"
              stroke={isMergeLine ? '#a78bfa' : '#3DDC84'}
              strokeWidth={isMergeLine ? 1.5 : 2}
              strokeDasharray={isMergeLine ? '6 3' : 'none'}
              opacity={0.5}
              markerEnd={isMergeLine ? 'url(#arrow-merge)' : 'url(#arrow-primary)'}
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const isSelected = node.id === selectedVersionId;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                className={cn(
                  'cursor-pointer transition-all',
                  isSelected ? 'fill-[#3DDC84]/20 stroke-[#3DDC84]' : 'fill-[#1a1f2b] stroke-[#2a2f3d] hover:stroke-[#3DDC84]/50'
                )}
                strokeWidth={isSelected ? 2 : 1}
                onClick={(e) => { e.stopPropagation(); onSelectVersion(node.id); }}
              />
              {/* Branch indicator */}
              {node.isBranch && (
                <circle cx={NODE_W - 8} cy={8} r={4} fill="#f59e0b" opacity={0.8} />
              )}
              {/* Merge indicator */}
              {node.isMerge && (
                <circle cx={NODE_W - 8} cy={NODE_H - 8} r={4} fill="#a78bfa" opacity={0.8} />
              )}
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn('text-[11px] font-semibold pointer-events-none', isSelected ? 'fill-white' : 'fill-[#94a3b8]')}
              >
                {versionTitle(node.version)}
              </text>
              <text
                x={NODE_W / 2}
                y={NODE_H / 2 + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] fill-[#64748b] pointer-events-none"
              >
                {node.version?.action_type || 'version'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
