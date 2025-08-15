<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import { d3DAGData, dagActions, dagMetrics } from '$lib/session/stores/dag-execution-store';
  import { 
    DAG_VISUAL_CONFIG, 
    getNodeStyle, 
    getLinkStyle,
    getNodeRadius,
    calculateFixedPosition,
    TRANSITIONS,
    ZOOM_CONFIG
  } from './config/dag-visual-config';
  // Removed shouldAnimateNode import - not needed for CSS animations
  import type { D3DAGNode, D3DAGLink } from './types/dag';
  import { t } from '$lib/i18n';

  // Icon mapping for different node types
  function getNodeIcon(node: D3DAGNode): string {
    const iconMap: Record<string, string> = {
      'input': 'transcript',
      'detector': 'diagnosis',
      'primary': 'model-gp',
      'safety': 'encrypt',
      'consensus': 'checked',
      'output': 'registration-form'
    };
    return iconMap[node.type] || 'model-gp';
  }

  interface Props {
    sessionId?: string;
    width?: number;
    height?: number;
    enableZoom?: boolean;
    enableInteractions?: boolean;
    onnodeSelect?: (node: D3DAGNode) => void;
    onlinkSelect?: (link: D3DAGLink) => void;
  }

  let {
    sessionId = '',
    width = DAG_VISUAL_CONFIG.layout.width,
    height = DAG_VISUAL_CONFIG.layout.height,
    enableZoom = true,
    enableInteractions = true,
    onnodeSelect,
    onlinkSelect
  }: Props = $props();

  let container = $state<HTMLElement>();
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let g: d3.Selection<SVGGElement, unknown, null, undefined>; // Main group for zoom/pan
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  
  // Track selected elements
  let selectedNode = $state<D3DAGNode | null>(null);
  let selectedLink = $state<D3DAGLink | null>(null);
  let hoveredNode = $state<D3DAGNode | null>(null);

  // No animation tracking needed - using CSS
  // Remove unused pulseIntervals reference
  const pulseIntervals = new Map<string, number>();

  onMount(() => {
    initializeVisualization();

    // Initialize DAG for session if provided
    if (sessionId) {
      dagActions.initialize(sessionId);
    }

    // Subscribe to store changes after initialization
    const unsubscribe = d3DAGData.subscribe((data) => {
      console.log('📊 DAG data updated:', data);
      if (g && data) {
        console.log('📊 Updating visualization with', data.nodes.length, 'nodes and', data.links.length, 'links');
        updateVisualization(data);
      } else {
        console.log('📊 No data or no group element:', { hasG: !!g, hasData: !!data });
      }
    });

    return () => {
      cleanup();
      unsubscribe();
    };
  });

  onDestroy(() => {
    cleanup();
  });

  function cleanup() {
    // No intervals to clear - using CSS animations
  }

  function initializeVisualization() {
    // Create SVG - responsive to container
    svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)  // Use viewBox for responsive scaling
      .attr('preserveAspectRatio', 'xMidYMid meet')  // Center and scale proportionally
      .attr('class', 'dag-svg');

    // Define arrow markers for links
    const defs = svg.append('defs');
    
    // Define arrow markers for each link type
    const arrowTypes = [
      { id: 'arrowhead-data_flow', fill: '#10B981' },
      { id: 'arrowhead-analysis_input', fill: '#3B82F6' },
      { id: 'arrowhead-safety_input', fill: '#EC4899' },
      { id: 'arrowhead-triggers', fill: '#3B82F6' },
      { id: 'arrowhead-refines', fill: '#EF4444' },
      { id: 'arrowhead-contributes', fill: '#6366F1' },
      { id: 'arrowhead-merges', fill: '#8B5CF6' }
    ];

    arrowTypes.forEach(arrow => {
      const marker = defs.append('marker')
        .attr('id', arrow.id)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', '10')  // Position at tip
        .attr('refY', '5')   // Center vertically
        .attr('markerWidth', '15')  // Bigger arrow
        .attr('markerHeight', '15')
        .attr('orient', 'auto')
        .attr('markerUnits', 'userSpaceOnUse');  // Fixed size, not relative to stroke
        
      marker.append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')  // Full triangle
        .attr('fill', arrow.fill);
    });

    // Create main group for zoom/pan
    g = svg.append('g')
      .attr('class', 'dag-main-group');

    // Setup zoom behavior
    if (enableZoom) {
      zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent(ZOOM_CONFIG.scaleExtent)
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      
      svg.call(zoom);
    }

    // Create groups for links and nodes (links first so they appear behind nodes)
    g.append('g').attr('class', 'dag-links');
    g.append('g').attr('class', 'dag-particles'); // For animated particles
    g.append('g').attr('class', 'dag-nodes');

    // No force simulation needed - using fixed positioning
  }

  function updateVisualization(data: { nodes: D3DAGNode[], links: D3DAGLink[] }) {
    if (!g || !container) return;

    // Use actual container dimensions or fallback to props
    const actualWidth = container.clientWidth || width;
    const actualHeight = container.clientHeight || height;

    // Update SVG viewBox to match container
    if (svg) {
      svg.attr('viewBox', `0 0 ${actualWidth} ${actualHeight}`);
    }

    // Calculate fixed positions for all nodes
    const nodesWithPositions = data.nodes.map(node => {
      const position = calculateFixedPosition(node, actualWidth, actualHeight);
      return {
        ...node,
        x: position.x,
        y: position.y
      };
    });

    // Update links to use positioned nodes (filter out links with missing nodes)
    const linksWithPositions = data.links
      .map(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const sourceNode = nodesWithPositions.find(n => n.id === sourceId);
        const targetNode = nodesWithPositions.find(n => n.id === targetId);
        
        if (sourceNode && targetNode) {
          return {
            ...link,
            source: sourceNode,
            target: targetNode
          };
        }
        return null;
      })
      .filter(link => link !== null) as D3DAGLink[];
    
    // Update links
    const linkSelection = g.select('.dag-links')
      .selectAll<SVGPathElement, D3DAGLink>('.dag-link')
      .data(linksWithPositions, d => d.id);

    // Exit
    linkSelection.exit()
      .transition()
      .duration(TRANSITIONS.linkExit.duration)
      .style('opacity', TRANSITIONS.linkExit.finalOpacity)
      .remove();

    // Enter
    const linkEnter = linkSelection.enter()
      .append('path')
      .attr('class', d => `dag-link link-${d.type}`)
      .attr('marker-end', d => `url(#arrowhead-${d.type})`);

    // Update + Enter
    const linkUpdate = linkEnter.merge(linkSelection);
    
    linkUpdate
      .attr('class', d => `dag-link link-${d.type}`)
      .attr('marker-end', d => `url(#arrowhead-${d.type})`)
      .attr('d', d => {
        // Calculate path using fixed positions
        const source = d.source as D3DAGNode;
        const target = d.target as D3DAGNode;
        if (!source || !target) return '';
        
        // Get radii for source and target nodes
        const sourceRadius = getNodeRadius(source);
        const targetRadius = getNodeRadius(target);
        
        // Calculate angle from source to target
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate connection points at circle edges
        const sourceX = source.x + Math.cos(angle) * sourceRadius;
        const sourceY = source.y + Math.sin(angle) * sourceRadius;
        // Stop the line at the circle edge - arrow will extend from here
        const targetX = target.x - Math.cos(angle) * targetRadius;
        const targetY = target.y - Math.sin(angle) * targetRadius;
        
        // Create smooth curved arrow for better visual flow
        if (d.direction === 'bidirectional' || d.type === 'refines') {
          const dr = Math.sqrt(dx * dx + dy * dy);
          return `M${sourceX},${sourceY}A${dr * 0.3},${dr * 0.3} 0 0,1 ${targetX},${targetY}`;
        }
        
        // Check if this is a mostly vertical link (small horizontal difference)
        const isVerticalLink = Math.abs(dx) < 50; // Less than 50px horizontal difference
        
        if (isVerticalLink) {
          // Straight line for vertical connections
          return `M${sourceX},${sourceY}L${targetX},${targetY}`;
        }
        
        // Create curved path for horizontal flows - curve direction based on flow relative to center
        const midX = (sourceX + targetX) / 2;
        const centerX = actualWidth / 2;
        const isFlowingOutward = (source.x < centerX && target.x < source.x) || (source.x > centerX && target.x > source.x);
        const curveOffset = isFlowingOutward ? -15 : 15; // Curve up when flowing outward, down when flowing inward
        const midY = (sourceY + targetY) / 2 + curveOffset;
        return `M${sourceX},${sourceY}Q${midX},${midY} ${targetX},${targetY}`;
      })
      .on('click', handleLinkClick)
      .transition()
      .duration(TRANSITIONS.linkUpdate.duration)
      .style('opacity', d => getLinkStyle(d).opacity);

    // Update nodes
    const nodeSelection = g.select('.dag-nodes')
      .selectAll<SVGGElement, D3DAGNode>('.dag-node')
      .data(nodesWithPositions, d => d.id);

    // Exit
    nodeSelection.exit()
      .transition()
      .duration(TRANSITIONS.nodeExit.duration)
      .attr('transform', 'scale(0)')
      .style('opacity', TRANSITIONS.nodeExit.finalOpacity)
      .remove();

    // Enter
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'dag-node')
      .attr('transform', d => `translate(${d.x},${d.y}) scale(0)`);

    // Add circle to new nodes
    nodeEnter.append('circle')
      .attr('class', 'dag-node-circle')
      .attr('r', d => getNodeRadius(d));

    // Add SVG icon to new nodes
    nodeEnter.append('use')
      .attr('class', 'dag-node-icon')
      .style('pointer-events', 'none')
      .attr('href', d => `/icons-o.svg#${getNodeIcon(d)}`);

    // Add text label below the icon
    nodeEnter.append('text')
      .attr('class', 'dag-node-label')
      .attr('y', 20)  // Position closer to icon, above arrow connection points
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('pointer-events', 'none');

    // Add status icon for new nodes
    nodeEnter.append('text')
      .attr('class', 'dag-node-status')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px');

    // Update + Enter
    const nodeUpdate = nodeEnter.merge(nodeSelection);
    
    nodeUpdate
      .attr('class', d => `dag-node node-${d.state}`)
      .on('click', handleNodeClick)
      .on('mouseenter', handleNodeHover)
      .on('mouseleave', handleNodeLeave);

    // Update node visuals
    nodeUpdate.select('.dag-node-circle')
      .attr('fill', d => getNodeStyle(d).fill)
      .attr('stroke', d => getNodeStyle(d).stroke)
      .attr('stroke-width', d => getNodeStyle(d).strokeWidth)
      .attr('opacity', d => getNodeStyle(d).opacity)
      .attr('r', d => getNodeRadius(d));

    // Update icon reference
    nodeUpdate.select('.dag-node-icon')
      .attr('href', d => `/icons-o.svg#${getNodeIcon(d)}`);

    nodeUpdate.select('.dag-node-label')
      .text(d => d.name)
      .style('fill', d => d.state === 'pending' ? '#6B7280' : '#1F2937');

    nodeUpdate.select('.dag-node-status')
      .text(d => {
        if (d.state === 'running') return '⚡';
        if (d.state === 'completed') return '✓';
        if (d.state === 'failed') return '✗';
        return '';
      })
      .style('fill', d => {
        if (d.state === 'running') return '#F59E0B';
        if (d.state === 'completed') return '#10B981';
        if (d.state === 'failed') return '#EF4444';
        return 'transparent';
      });

    // Animate entering nodes with fixed positions
    nodeUpdate
      .transition()
      .duration(TRANSITIONS.nodeEnter.duration)
      .delay((d, i) => TRANSITIONS.nodeEnter.delay(d, i))
      .attr('transform', d => `translate(${d.x},${d.y}) scale(1)`);

    // Add CSS classes based on node state
    nodeUpdate.each(function(d) {
      const nodeGroup = d3.select(this);
      const circle = nodeGroup.select('.dag-node-circle');
      
      // Apply state classes
      nodeGroup.classed('node-pending', d.state === 'pending');
      nodeGroup.classed('node-running', d.state === 'running');
      nodeGroup.classed('node-completed', d.state === 'completed');
      nodeGroup.classed('node-failed', d.state === 'failed');
    });

    // Fixed positioning doesn't need to save positions to store

    // No particles needed - just visual states
  }

  // Removed complex animations - CSS handles everything

  // Drag functionality removed - using fixed positioning

  function handleNodeClick(event: MouseEvent, node: D3DAGNode) {
    event.stopPropagation();
    selectedNode = node;
    selectedLink = null;
    onnodeSelect?.(node);
  }

  function handleLinkClick(event: MouseEvent, link: D3DAGLink) {
    event.stopPropagation();
    selectedLink = link;
    selectedNode = null;
    onlinkSelect?.(link);
  }

  function handleNodeHover(_event: MouseEvent, node: D3DAGNode) {
    hoveredNode = node;
    
    // Highlight connected links
    g.selectAll<SVGPathElement, D3DAGLink>('.dag-link')
      .style('opacity', d => {
        const source = typeof d.source === 'object' ? d.source.id : d.source;
        const target = typeof d.target === 'object' ? d.target.id : d.target;
        return source === node.id || target === node.id ? 0.9 : 0.2;
      });
    
    // Dim non-connected nodes
    g.selectAll<SVGGElement, D3DAGNode>('.dag-node')
      .style('opacity', d => {
        if (d.id === node.id) return 1;
        
        // Check if connected
        const isConnected = $d3DAGData.links.some(link => {
          const source = typeof link.source === 'object' ? link.source.id : link.source;
          const target = typeof link.target === 'object' ? link.target.id : link.target;
          return (source === node.id && target === d.id) || 
                 (target === node.id && source === d.id);
        });
        
        return isConnected ? 0.8 : 0.3;
      });
  }

  function handleNodeLeave() {
    hoveredNode = null;
    
    // Reset opacity to default
    g.selectAll('.dag-link')
      .style('opacity', null);  // Let CSS handle default opacity
    
    g.selectAll('.dag-node')
      .style('opacity', 1);
  }

  // Reactive metrics display
  const metrics = $derived($dagMetrics);
</script>

<div class="dag-visualizer" bind:this={container}>
  {#if metrics}
    <div class="dag-metrics">
      <div class="metric">
        <span class="metric-label">{$t('session.dag.status')}:</span>
        <span class="metric-value status-{metrics.status}">{metrics.status}</span>
      </div>
      <div class="metric">
        <span class="metric-label">{$t('session.dag.nodes')}:</span>
        <span class="metric-value">
          {metrics.completedNodes}/{metrics.totalNodes}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">{$t('session.dag.cost')}:</span>
        <span class="metric-value">${metrics.totalCost.toFixed(4)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">{$t('session.dag.duration')}:</span>
        <span class="metric-value">{(metrics.totalDuration / 1000).toFixed(1)}s</span>
      </div>
      
      <!-- Development Controls -->
      {#if typeof window !== 'undefined' && window.location.hostname === 'localhost'}
        <button 
          class="simulate-btn"
          onclick={() => {
            console.log('🎭 Starting DAG simulation manually');
            import('$lib/session/dag/dag-event-processor').then(({ simulateDAGExecution }) => {
              simulateDAGExecution(sessionId || 'dev-session', 2500);
            });
          }}
        >
          Simulate DAG
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* DAG Node Circle - Hidden but used for link calculations */
  :global(.dag-node-circle) {
    fill: transparent;
    stroke: transparent;
  }

  /* DAG Node Icon Styles */
  :global(.dag-node-icon) {
    transform: translate(-50%, calc(-50% - 1rem)) scale(.05);
    transform-origin: center;
    fill: currentColor;
    color: #374151;
  }

  :global(.dag-node.node-running .dag-node-icon) {
    color: #F59E0B;
  }

  :global(.dag-node.node-completed .dag-node-icon) {
    color: #10B981;
  }

  :global(.dag-node.node-failed .dag-node-icon) {
    color: #EF4444;
  }

  /* DAG Link Styles */
  :global(.dag-link) {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  :global(.dag-link.link-data_flow) {
    stroke: #10B981;
    stroke-width: 3px;
    opacity: 0.8;
  }

  :global(.dag-link.link-analysis_input) {
    stroke: #3B82F6;
    stroke-width: 3px;
    opacity: 0.8;
  }

  :global(.dag-link.link-safety_input) {
    stroke: #EC4899;
    stroke-width: 3px;
    opacity: 0.8;
  }

  :global(.dag-link.link-triggers) {
    stroke: #3B82F6;
    stroke-width: 4px;
    stroke-dasharray: 5,3;
    opacity: 0.7;
  }

  :global(.dag-link.link-contributes) {
    stroke: #6366F1;
    stroke-width: 4px;
    stroke-dasharray: 6,3;
    opacity: 0.7;
  }

  :global(.dag-link.link-refines) {
    stroke: #EF4444;
    stroke-width: 4px;
    stroke-dasharray: 8,4;
    opacity: 0.7;
  }

  :global(.dag-link.link-merges) {
    stroke: #8B5CF6;
    stroke-width: 5px;
    opacity: 0.7;
  }

  .dag-visualizer {
    width: 100%;
    height: 100%;
    min-height: 600px;  /* Ensure minimum height */
    position: relative;
    background: var(--color-surface, #fff);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .dag-metrics {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    gap: 16px;
    font-size: 12px;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    color: var(--color-text-secondary, #6b7280);
    font-weight: 500;
  }

  .metric-value {
    color: var(--color-text-primary, #1f2937);
    font-weight: 600;
  }

  .metric-value.status-idle {
    color: #6b7280;
  }

  .metric-value.status-initializing {
    color: #3b82f6;
  }

  .metric-value.status-running {
    color: #f59e0b;
  }

  .metric-value.status-completed {
    color: #10b981;
  }

  .metric-value.status-failed {
    color: #ef4444;
  }

  :global(.dag-svg) {
    width: 100%;
    height: 100%;
    max-width: 100%;  /* Respect container width */
    display: block;   /* Remove inline-block spacing */
  }

  :global(.dag-node) {
    cursor: pointer;
    transition: opacity 0.3s ease;
  }

  :global(.dag-node-circle) {
    transition: all 0.3s ease;
  }

  :global(.dag-node:hover .dag-node-circle) {
    filter: brightness(1.1);
  }

  /* Link base styles */
  :global(.dag-link) {
    cursor: pointer;
    transition: all 0.3s ease;
    fill: none;
  }

  /* Link type styles - reduced thickness */
  :global(.link-data_flow) {
    stroke: #10B981;
    stroke-width: 4px;  /* Much thinner */
    opacity: 0.8;
  }

  :global(.link-triggers) {
    stroke: #3B82F6;
    stroke-width: 3px;  /* Much thinner */
    opacity: 0.8;
  }

  :global(.link-refines) {
    stroke: #EF4444;
    stroke-width: 2px;  /* Much thinner */
    stroke-dasharray: 8, 4;
    opacity: 0.7;
  }

  :global(.link-contributes) {
    stroke: #6366F1;
    stroke-width: 2px;  /* Much thinner */
    stroke-dasharray: 6, 3;
    opacity: 0.7;
  }

  :global(.link-merges) {
    stroke: #8B5CF6;
    stroke-width: 3px;  /* Much thinner */
    opacity: 0.8;
  }

  /* Simple CSS animations for node states */
  :global(.node-running .dag-node-circle) {
    animation: node-pulse 2s ease-in-out infinite;
  }

  @keyframes node-pulse {
    0%, 100% { 
      transform: scale(1);
      opacity: 1;
    }
    50% { 
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  :global(.node-completed .dag-node-circle) {
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }

  :global(.node-failed .dag-node-circle) {
    animation: node-error 0.5s ease-in-out 3;
  }

  @keyframes node-error {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }

  .simulate-btn {
    background: var(--color-primary, #3b82f6);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    margin-left: 8px;
  }

  .simulate-btn:hover {
    background: var(--color-primary-dark, #2563eb);
  }
</style>