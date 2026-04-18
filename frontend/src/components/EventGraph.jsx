import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, GitBranch, ZoomIn, ZoomOut } from 'lucide-react';
import * as d3Force from 'd3-force';
import { CATEGORY_COLORS } from '../services/api';

const EDGE_LABELS = {
  causes: { color: '#FF3B30', dash: '' },
  escalates: { color: '#FF8A00', dash: '' },
  affects: { color: '#F59E0B', dash: '5,3' },
  responds_to: { color: '#3B82F6', dash: '5,3' },
  linked_to: { color: '#94A3B8', dash: '3,3' },
};

export default function EventGraph({ isOpen, onClose, allEvents = [], onNodeClick }) {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [scale, setScale] = useState(1);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const scaleRef = useRef(1);
  const ctxRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const panMovedRef = useRef(false);

  const handleWheelZoom = useCallback((event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    setScale(prev => Math.min(2.5, Math.max(0.35, prev + delta)));
  }, []);

  const handlePanStart = useCallback((event) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    panMovedRef.current = false;
  }, []);

  const handlePanMove = useCallback((event) => {
    if (!isPanning) return;
    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) panMovedRef.current = true;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };

    const ctx = ctxRef.current;
    const { width, height } = canvasSizeRef.current;
    if (ctx && nodesRef.current.length && edgesRef.current.length) {
      draw(ctx, nodesRef.current, edgesRef.current, width, height);
    }
  }, [isPanning]);

  const handleCanvasClick = useCallback((event) => {
    if (isPanning || panMovedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !nodesRef.current.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { width, height } = canvasSizeRef.current;

    const nodes = nodesRef.current;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const padding = 36;
    const fitScale = Math.min(
      (width - padding * 2) / boundsWidth,
      (height - padding * 2) / boundsHeight,
      1
    );
    const zoomScale = Math.max(0.35, scaleRef.current * fitScale);
    const pan = panRef.current;

    const worldX = (x - width / 2 - pan.x) / zoomScale + (minX + maxX) / 2;
    const worldY = (y - height / 2 - pan.y) / zoomScale + (minY + maxY) / 2;

    let hitNode = null;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const n = nodes[i];
      const r = 12 + (n.intensity || 5) * 0.8;
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      if (dx * dx + dy * dy <= r * r) {
        hitNode = n;
        break;
      }
    }

    if (hitNode?.event && onNodeClick) {
      onNodeClick(hitNode.event);
    }
  }, [isPanning, onNodeClick]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Build a simple relationship graph from the loaded events (demo)
  const buildGraph = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      if (!allEvents.length) { setLoading(false); return; }

      const nodes = allEvents.slice(0, 20).map(e => ({
        id: e.id,
        label: e.title.substring(0, 40),
        category: e.category,
        country: e.country,
        intensity: e.severity || 3,
        event: e,
      }));

      // Build edges between events that share the same country
      const edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].country === nodes[j].country) {
            edges.push({
              source: nodes[i].id,
              target: nodes[j].id,
              label: 'linked_to',
              strength: 1,
            });
          }
        }
      }

      setGraphData({ nodes, edges });
      setLoading(false);
    }, 500);
  }, [allEvents]);

  useEffect(() => {
    if (isOpen && !graphData) buildGraph();
  }, [isOpen, graphData, buildGraph]);

  useEffect(() => {
    scaleRef.current = scale;
    const ctx = ctxRef.current;
    const { width, height } = canvasSizeRef.current;
    if (ctx && nodesRef.current.length && edgesRef.current.length) {
      draw(ctx, nodesRef.current, edgesRef.current, width, height);
    }
  }, [scale]);

  useEffect(() => {
    if (!graphData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    canvasSizeRef.current = { width, height };

    const nodes = graphData.nodes.map(n => ({ ...n, x: Math.random() * width, y: Math.random() * height }));
    const edges = graphData.edges.map(e => ({ ...e }));
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const simulation = d3Force.forceSimulation(nodes)
      .force('charge', d3Force.forceManyBody().strength(-200))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('link', d3Force.forceLink(edges).id(d => d.id).distance(120).strength(0.5))
      .force('collision', d3Force.forceCollide().radius(30))
      .on('tick', () => draw(ctx, nodes, edges, width, height));

    simulationRef.current = simulation;
    return () => simulation.stop();
  }, [graphData]);

  const draw = (ctx, nodes, edges, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const padding = 36;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const boundsWidth = Math.max(1, maxX - minX);
    const boundsHeight = Math.max(1, maxY - minY);
    const fitScale = Math.min(
      (w - padding * 2) / boundsWidth,
      (h - padding * 2) / boundsHeight,
      1
    );
    const zoomScale = Math.max(0.35, scaleRef.current * fitScale);
    const pan = panRef.current;

    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

    // Draw edges
    edges.forEach(e => {
      const source = typeof e.source === 'object' ? e.source : nodes.find(n => n.id === e.source);
      const target = typeof e.target === 'object' ? e.target : nodes.find(n => n.id === e.target);
      if (!source || !target) return;

      const edgeStyle = EDGE_LABELS[e.label] || EDGE_LABELS.linked_to;
      ctx.beginPath();
      ctx.strokeStyle = edgeStyle.color + '60';
      ctx.lineWidth = (e.strength || 1) * 0.8;
      if (edgeStyle.dash) ctx.setLineDash(edgeStyle.dash.split(',').map(Number));
      else ctx.setLineDash([]);
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      // Edge label
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      ctx.font = '8px "JetBrains Mono"';
      ctx.fillStyle = edgeStyle.color + '80';
      ctx.textAlign = 'center';
      ctx.fillText(e.label || '', mx, my - 3);
    });

    ctx.setLineDash([]);

    // Draw nodes
    nodes.forEach(n => {
      const color = CATEGORY_COLORS[n.category] || '#3B82F6';
      const r = 12 + (n.intensity || 5) * 0.8;
      const isHovered = hoveredNode && hoveredNode.id === n.id;

      // Glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '15';
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + (isHovered ? 'ff' : 'cc');
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.font = '9px "IBM Plex Sans"';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      const label = (n.label || '').substring(0, 25);
      ctx.fillText(label, n.x, n.y + r + 14);

      // Country tag
      if (n.country) {
        ctx.font = '7px "JetBrains Mono"';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(n.country, n.x, n.y + r + 24);
      }
    });

    ctx.restore();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-8 z-50 glass-panel rounded-xl overflow-hidden flex flex-col"
          data-testid="event-graph-panel"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-[var(--cat-political)]" />
              <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Chivo' }}>Event Relationship Graph</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[var(--cat-political)]/20 text-[var(--cat-political)]">Demo</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setScale(s => Math.min(s + 0.2, 2))} className="p-2 glass-light rounded-md hover:bg-[var(--bg-elevated)]">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="p-2 glass-light rounded-md hover:bg-[var(--bg-elevated)]">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => { setGraphData(null); buildGraph(); }} className="text-xs font-mono text-[var(--cat-political)] px-3 py-1.5 glass-light rounded-md hover:bg-[var(--bg-elevated)]" data-testid="graph-refresh-btn">
                Regenerate
              </button>
              <button onClick={onClose} className="p-2 glass-light rounded-md hover:bg-[var(--bg-elevated)]" data-testid="graph-close-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-2 border-b border-[var(--border-default)] flex items-center gap-4 flex-shrink-0">
            {Object.entries(EDGE_LABELS).map(([label, style]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: style.color }} />
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">{label}</span>
              </div>
            ))}
          </div>

          {/* Graph Canvas */}
          <div
            className="flex-1 relative"
            onWheel={handleWheelZoom}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onClick={handleCanvasClick}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--cat-political)] mx-auto" />
                  <p className="text-sm text-[var(--text-secondary)] font-mono">Building event relationships...</p>
                </div>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                data-testid="graph-canvas"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
