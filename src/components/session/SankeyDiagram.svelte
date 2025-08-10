<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { mount, unmount } from 'svelte';
    import { get } from 'svelte/store';
    import * as d3 from 'd3';
    import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
    import type { SessionAnalysis, SankeyNode, SankeyLink, NodeSelectEvent, LinkSelectEvent } from './types/visualization';
    import { transformToSankeyData, calculateNodeSize } from './utils/sankeyDataTransformer';
    import { OPACITY, COLORS, NODE_SIZE, LINK_CONFIG, getLinkPathGenerator, calculateLinkWidth, applyParallelLinkSpacing, createEnhancedLinkGenerator } from './config/visual-config';
    import LinkTooltip from './LinkTooltip.svelte';
    import { analysisActions, relatedActionsForSelectedLink, visualState } from '$lib/session/analysis-store';
    import SymptomNode from './nodes/SymptomNode.svelte';
    import DiagnosisNode from './nodes/DiagnosisNode.svelte';
    import TreatmentNode from './nodes/TreatmentNode.svelte';
    import ZoomControls from './ZoomControls.svelte';
    import { t } from '$lib/i18n';

    interface Props {
        data: SessionAnalysis;
        isMobile?: boolean;
        selectedNodeId?: string | null;
        focusedNodeIndex?: number;
        onnodeSelect?: (event: CustomEvent<NodeSelectEvent>) => void;
        onlinkSelect?: (event: CustomEvent<LinkSelectEvent>) => void;
        onselectionClear?: (event: CustomEvent) => void;
        onfocusChange?: (event: CustomEvent<{ index: number }>) => void;
    }

    let { 
        data, 
        isMobile = false, 
        selectedNodeId = null,
        focusedNodeIndex = -1,
        onnodeSelect,
        onlinkSelect,
        onselectionClear,
        onfocusChange
    }: Props = $props();

    let container = $state<HTMLElement>();
    let svg = $state<d3.Selection<SVGSVGElement, unknown, null, undefined>>();
    let width = $state(800);
    let height = $state(600);
    let sankeyData = $state(transformToSankeyData(data));
    
    // Update sankey data when data changes
    $effect(() => {
        sankeyData = transformToSankeyData(data);
    });
    // Subscribe to unified visual state and apply styling
    $effect(() => {
        const currentVisualState = $visualState;
        console.log('SankeyDiagram: Visual state changed:', {
            hasActive: !!currentVisualState.activeState,
            hasBackground: !!currentVisualState.backgroundState,
            shouldAnimate: currentVisualState.shouldAnimateTrigger,
            triggerType: currentVisualState.triggerItem?.type,
            triggerId: currentVisualState.triggerItem?.id
        });
        
        applyUnifiedVisualState(currentVisualState);
    });
    let tooltipData = $state<{
        relationshipType: string;
        relationshipLabel: string;
        actions: any[];
        visible: boolean;
        x: number;
        y: number;
    }>({
        relationshipType: '',
        relationshipLabel: '',
        actions: [],
        visible: false,
        x: 0,
        y: 0
    });
    let nodeComponents = $state(new Map<string, { component: any, container: HTMLDivElement }>());
    let resizeTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
    let resizeDebounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);
    let resizeObserver = $state<ResizeObserver | null>(null);
    let focusableNodes = $state<SankeyNode[]>([]);
    let zoomBehavior = $state<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    let currentZoomTransform = $state<d3.ZoomTransform>(d3.zoomIdentity);
    
    // Resize thresholds to prevent unnecessary re-renders
    const SIGNIFICANT_WIDTH_THRESHOLD = 50;  // px
    const SIGNIFICANT_HEIGHT_THRESHOLD = 50; // px
    const RESIZE_DEBOUNCE_DELAY = 150;       // ms
    
    // Zoom configuration
    const ZOOM_CONFIG = {
        scaleExtent: [0.2, 5] as [number, number],
        duration: 300,
        wheelDelta: -0.002,
        touchDelta: 0.005
    };

    // Derive focused node ID efficiently  
    const focusedNodeId = $derived(
        focusedNodeIndex >= 0 && focusedNodeIndex < focusableNodes.length
            ? focusableNodes[focusedNodeIndex].id
            : null
    );

    // Responsive margins based on screen size
    const margins = {
        top: isMobile ? 10 : 20,
        right: isMobile ? 5 : 15,
        bottom: isMobile ? 10 : 20,
        left: isMobile ? 5 : 15
    };

    onMount(() => {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            initializeSankey();
        });
        
        // Set up ResizeObserver for container
        if (container) {
            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        handleContainerResize(entry.contentRect);
                    }, 150);
                }
            });
            resizeObserver.observe(container);
        }
        
        // Add keyboard event listeners for zoom shortcuts
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle shortcuts when container is focused or contains active element
            if (!container?.contains(document.activeElement) && document.activeElement !== container) {
                return;
            }

            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case '+':
                    case '=':
                        event.preventDefault();
                        zoomIn();
                        break;
                    case '-':
                        event.preventDefault();
                        zoomOut();
                        break;
                    case '0':
                        event.preventDefault();
                        resetZoom();
                        break;
                }
            } else {
                switch (event.key) {
                    case 'f':
                        event.preventDefault();
                        zoomToFit();
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        panDirection(0, -50);
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        panDirection(0, 50);
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        panDirection(-50, 0);
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        panDirection(50, 0);
                        break;
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            document.removeEventListener('keydown', handleKeyDown);
        };
    });

    onDestroy(() => {
        cleanupNodeComponents();
    });

    // React to data changes and transform data (without triggering render)
    $effect(() => {
        if (data) {
            // Create a fresh copy to avoid mutation issues
            sankeyData = transformToSankeyData(JSON.parse(JSON.stringify(data)));
        }
    });

    // React to data structure changes and initial setup (avoid unnecessary re-renders)
    $effect(() => {
        if (svg && sankeyData && container) {
            renderSankey();
            buildFocusableNodesList();
            console.log('🎨 Full Sankey render triggered:', {
                reason: 'data/svg/container change',
                nodeCount: sankeyData.nodes?.length || 0,
                linkCount: sankeyData.links?.length || 0
            });
        }
    });

    // React to selectedNodeId changes to apply focus highlighting
    $effect(() => {
        if (svg && selectedNodeId) {
            // Apply focus highlighting when a node is selected
            applyFocusHighlighting(selectedNodeId);
        } else if (svg && selectedNodeId === null) {
            // Only reset if we had a selection and now we don't (and not hovering)
            // This prevents interfering with the initial state
            resetHighlighting();
        }
    });

    // React to focus changes with efficient DOM updates
    $effect(() => {
        if (svg) {
            updateNodeFocus(focusedNodeId);
        }
    });

    function initializeSankey() {
        if (!container) return;
        
        // Use both methods to ensure we get the correct width
        const bounds = container.getBoundingClientRect();
        width = Math.max(bounds.width, container.offsetWidth || 0);
        height = Math.max(bounds.height, container.offsetHeight || 0);
        
        /* console.log('InitializeSankey dimensions:', {
            boundsWidth: bounds.width,
            offsetWidth: container.offsetWidth,
            computedWidth: width,
            containerStyle: window.getComputedStyle(container).width
        }); */

        // Clear any existing SVG
        d3.select(container).selectAll('*').remove();

        svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('cursor', 'grab')
            .on('click', handleCanvasClick);

        // Enhanced zoom and pan for all devices
        zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent(ZOOM_CONFIG.scaleExtent)
            .wheelDelta((event) => -event.deltaY * ZOOM_CONFIG.wheelDelta)
            .filter(zoomFilter)
            .constrain(constrainTransform)
            .on('zoom', handleZoom)
            .on('start', handleZoomStart)
            .on('end', handleZoomEnd);

        // Configure touch gestures for all devices
        zoomBehavior.touchable(() => true);

        svg.call(zoomBehavior);

        // Main group for all elements
        svg.append('g')
            .attr('class', 'main-group')
            .attr('transform', `translate(${margins.left}, ${margins.top})`)
            .on('click', handleCanvasClick);

        // Don't call renderSankey() here - let the effect handle it to avoid duplicate renders
    }

    function renderSankey() {
        if (!svg || !sankeyData) {
            console.warn('Missing svg or sankeyData:', { svg: !!svg, sankeyData: !!sankeyData });
            return;
        }
        
        // Clean up previous node components
        cleanupNodeComponents();

        // Validate data structure
        if (!sankeyData.nodes || !Array.isArray(sankeyData.nodes)) {
            console.error('Invalid nodes data:', sankeyData.nodes);
            return;
        }
        
        if (!sankeyData.links || !Array.isArray(sankeyData.links)) {
            console.error('Invalid links data:', sankeyData.links);
            return;
        }

        // Clear existing content in the main group
        const mainGroup = svg.select('g.main-group');
        mainGroup.selectAll('*').remove();
        
        // Create separate groups for proper z-ordering (links behind nodes)
        const linkGroup = mainGroup.append('g').attr('class', 'link-group');
        const nodeGroup = mainGroup.append('g').attr('class', 'node-group');

        // Debug logging
        /* console.log('Rendering Sankey with data:', {
            nodes: sankeyData.nodes.length,
            links: sankeyData.links.length,
            width: width,
            height: height,
            containerWidth: container?.getBoundingClientRect().width,
            nodeTypes: sankeyData.nodes.map(n => n.type),
            linkTypes: sankeyData.links.map(l => l.type),
            nodeDetails: sankeyData.nodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
            linkDetails: sankeyData.links.map(l => ({ source: l.source, target: l.target, value: l.value }))
        }); */

        const chartWidth = width - margins.left - margins.right;
        const chartHeight = height - margins.top - margins.bottom;

        // Fixed HTML node dimensions (won't scale with SVG)
        const htmlNodeWidth = isMobile ? 120 : 160;
        const htmlNodeHeight = isMobile ? 60 : 80;
        
        // Use full available width with equal spacing
        const availableWidth = chartWidth;
        const columnWidth = availableWidth / 3; // Three equal columns
        const columnCenterX = [
            columnWidth * 0.5,    // Center of first column
            columnWidth * 1.5,    // Center of second column  
            columnWidth * 2.5     // Center of third column
        ];
        
        // For D3 Sankey calculations, use a small nodeWidth since we override positioning
        const sankeyNodeWidth = 50; // Just for D3's internal calculations
        
        /* console.log('Layout calculations:', {
            availableWidth,
            columnWidth,
            columnCenterX,
            htmlNodeWidth,
            htmlNodeHeight
        }); */
        
        const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
            .nodeWidth(sankeyNodeWidth)
            .nodePadding(isMobile ? 8 : 12)
            .extent([[0, 0], [chartWidth, chartHeight]])
            .nodeId(d => d.id)
            .nodeSort((a: SankeyNode, b: SankeyNode) => {
                // Sort nodes in each column by their calculated value (descending)
                return (b.value || 50) - (a.value || 50);
            });

        // Transform data for D3 with error handling
        let sankeyResult: any;
        try {
            const nodesForD3 = sankeyData.nodes.map(d => ({ 
                ...d,
                // Ensure all required properties exist
                sourceLinks: [],
                targetLinks: [],
                // Use our calculated node value for height (default to 50 if not set)
                value: d.value || 50
            }));
            
            const linksForD3 = sankeyData.links.map(d => ({ 
                ...d,
                // Ensure source and target are properly set
                source: d.source,
                target: d.target,
                value: d.value || 1
            }));

            /* console.log('Input to D3 Sankey:', {
                nodes: nodesForD3.length,
                links: linksForD3.length,
                firstNode: nodesForD3[0],
                firstLink: linksForD3[0]
            }); */

            sankeyResult = sankeyGenerator({
                nodes: nodesForD3,
                links: linksForD3
            });

            /* console.log('D3 Sankey result (before override):', {
                nodes: sankeyResult.nodes?.length,
                links: sankeyResult.links?.length,
                firstProcessedNode: sankeyResult.nodes?.[0]
            }); */

            // Override D3's positioning to force correct column placement and height
            if (sankeyResult && sankeyResult.nodes) {
                sankeyResult.nodes.forEach((node: any) => {
                    // Force correct column positioning
                    const typeColumnMap = { symptom: 0, diagnosis: 1, treatment: 2 };
                    const targetColumn = typeColumnMap[node.type as keyof typeof typeColumnMap] ?? 1;
                    
                    // Center nodes in their columns with fixed HTML dimensions
                    const centerX = columnCenterX[targetColumn];
                    node.x0 = centerX - (htmlNodeWidth / 2);
                    node.x1 = centerX + (htmlNodeWidth / 2);
                    
                    // console.log(`Fixed node ${node.id} (${node.type}): column ${node.column} -> ${targetColumn}, x: ${node.x0}-${node.x1}`);
                });

                // Sort nodes by type and value within each column, then position them
                const nodesByColumn: { symptom: any[], diagnosis: any[], treatment: any[] } = { 
                    symptom: [], 
                    diagnosis: [], 
                    treatment: [] 
                };
                sankeyResult.nodes.forEach((node: any) => {
                    if (nodesByColumn[node.type as keyof typeof nodesByColumn]) {
                        nodesByColumn[node.type as keyof typeof nodesByColumn].push(node);
                    }
                });

                // Position nodes within each column based on their calculated value
                Object.values(nodesByColumn).forEach((columnNodes: any[]) => {
                    columnNodes.sort((a, b) => (b.value || 50) - (a.value || 50)); // Highest value first
                    
                    let currentY = 20; // Start with some padding
                    columnNodes.forEach((node) => {
                        // Ensure minimum height using our configured value
                        const calculatedHeight = node.value || NODE_SIZE.MIN_HEIGHT_PX;
                        const nodeHeight = Math.max(NODE_SIZE.MIN_HEIGHT_PX, calculatedHeight);
                        
                        node.y0 = currentY;
                        node.y1 = currentY + nodeHeight;
                        currentY = node.y1 + (isMobile ? 8 : 12); // Add padding between nodes
                        
                        // console.log(`Positioned node ${node.id}: y ${node.y0}-${node.y1} (height: ${nodeHeight}, value: ${node.value}, calculated: ${calculatedHeight})`);
                    });
                });

                // Update link positions to match our overridden node positions with proper height distribution
                if (sankeyResult.links) {
                    // Group links by source node to calculate positioning
                    const linksBySource = new Map<string, any[]>();
                    const linksByTarget = new Map<string, any[]>();
                    
                    sankeyResult.links.forEach((link: any) => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        
                        if (!linksBySource.has(sourceId)) linksBySource.set(sourceId, []);
                        if (!linksByTarget.has(targetId)) linksByTarget.set(targetId, []);
                        
                        linksBySource.get(sourceId)!.push(link);
                        linksByTarget.get(targetId)!.push(link);
                    });
                    
                    // Sort links by target node Y position to prevent crossing
                    linksBySource.forEach((links) => {
                        links.sort((a, b) => {
                            const aTargetY = (typeof a.target === 'object' ? a.target.y0 : 
                                sankeyResult.nodes.find((n: any) => n.id === a.target)?.y0) || 0;
                            const bTargetY = (typeof b.target === 'object' ? b.target.y0 : 
                                sankeyResult.nodes.find((n: any) => n.id === b.target)?.y0) || 0;
                            return aTargetY - bTargetY;
                        });
                    });
                    
                    // Sort links by source node Y position for target-side positioning
                    linksByTarget.forEach((links) => {
                        links.sort((a, b) => {
                            const aSourceY = (typeof a.source === 'object' ? a.source.y0 : 
                                sankeyResult.nodes.find((n: any) => n.id === a.source)?.y0) || 0;
                            const bSourceY = (typeof b.source === 'object' ? b.source.y0 : 
                                sankeyResult.nodes.find((n: any) => n.id === b.source)?.y0) || 0;
                            return aSourceY - bSourceY;
                        });
                    });
                    
                    sankeyResult.links.forEach((link: any) => {
                        const sourceNode = sankeyResult.nodes.find((n: any) => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
                        const targetNode = sankeyResult.nodes.find((n: any) => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
                        
                        if (sourceNode && targetNode) {
                            // Set link to connect to proper node positions
                            link.source = sourceNode;
                            link.target = targetNode;
                            
                            // Calculate link height based on strength/value relative to total node connections
                            const sourceLinks = linksBySource.get(sourceNode.id) || [];
                            const targetLinks = linksByTarget.get(targetNode.id) || [];
                            
                            const totalSourceValue = sourceLinks.reduce((sum, l) => sum + (l.value || 1), 0);
                            const totalTargetValue = targetLinks.reduce((sum, l) => sum + (l.value || 1), 0);
                            
                            // Calculate proportional height for this link with gaps
                            const sourceHeight = sourceNode.y1 - sourceNode.y0;
                            const targetHeight = targetNode.y1 - targetNode.y0;
                            
                            // Define gap size between links (responsive)
                            const linkGap = isMobile ? 2 : 3;
                            const availableSourceHeight = sourceHeight * 0.8; // 80% of node height for links
                            const availableTargetHeight = targetHeight * 0.8;
                            
                            // Calculate total gap space needed
                            const sourceTotalGaps = Math.max(0, sourceLinks.length - 1) * linkGap;
                            const targetTotalGaps = Math.max(0, targetLinks.length - 1) * linkGap;
                            
                            // Remaining height after gaps for actual links
                            const sourceLinkSpace = availableSourceHeight - sourceTotalGaps;
                            const targetLinkSpace = availableTargetHeight - targetTotalGaps;
                            
                            const sourceLinkHeight = Math.max(1, (link.value || 1) / totalSourceValue * sourceLinkSpace);
                            const targetLinkHeight = Math.max(1, (link.value || 1) / totalTargetValue * targetLinkSpace);
                            
                            link.width = Math.min(sourceLinkHeight, targetLinkHeight);
                            
                            // Position links within their respective nodes based on sorted order
                            const sourceIndex = sourceLinks.indexOf(link);
                            const targetIndex = targetLinks.indexOf(link);
                            
                            const sourceStartY = sourceNode.y0 + (sourceHeight * 0.1); // 10% padding from top
                            const targetStartY = targetNode.y0 + (targetHeight * 0.1);
                            
                            let sourceY = sourceStartY;
                            let targetY = targetStartY;
                            
                            // Calculate cumulative position including gaps
                            for (let i = 0; i < sourceIndex; i++) {
                                const prevLink = sourceLinks[i];
                                const prevLinkHeight = Math.max(1, (prevLink.value || 1) / totalSourceValue * sourceLinkSpace);
                                sourceY += prevLinkHeight + linkGap;
                            }
                            
                            for (let i = 0; i < targetIndex; i++) {
                                const prevLink = targetLinks[i];
                                const prevLinkHeight = Math.max(1, (prevLink.value || 1) / totalTargetValue * targetLinkSpace);
                                targetY += prevLinkHeight + linkGap;
                            }
                            
                            link.y0 = sourceY + link.width / 2;
                            link.y1 = targetY + link.width / 2;
                            
                            // console.log(`Updated link ${sourceNode.id} -> ${targetNode.id}: y ${link.y0} -> ${link.y1}, width: ${link.width}`);
                        }
                    });
                }
            }

            /* console.log('D3 Sankey result (after override):', {
                nodes: sankeyResult.nodes?.length,
                links: sankeyResult.links?.length,
                samplePositions: sankeyResult.nodes?.slice(0, 3).map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    x0: n.x0,
                    x1: n.x1,
                    y0: n.y0,
                    y1: n.y1,
                    value: n.value
                }))
            }); */
        } catch (error) {
            console.error('Error in D3 Sankey generation:', error);
            return;
        }

        if (!sankeyResult || !sankeyResult.nodes || !sankeyResult.links) {
            console.error('Invalid sankeyResult:', sankeyResult);
            return;
        }

        // Apply parallel link spacing before rendering
        applyParallelLinkSpacing(sankeyResult.links);

        // Get the appropriate link path generator
        const baseLinkGenerator = LINK_CONFIG.ALGORITHM === 'default' 
            ? sankeyLinkHorizontal()
            : getLinkPathGenerator(LINK_CONFIG.ALGORITHM, LINK_CONFIG.RENDER_MODE);
        
        // Create enhanced generator that handles parallel links
        const linkPathGenerator = LINK_CONFIG.ALGORITHM === 'default' 
            ? sankeyLinkHorizontal()
            : createEnhancedLinkGenerator(baseLinkGenerator);

        // Render links
        const linkSelection = linkGroup
            .selectAll('.link')
            .data(sankeyResult.links, (d: any) => `${d.source.id}-${d.target.id}`);

        linkSelection.enter()
            .append('path')
            .attr('class', (d: any) => {
                const relType = (d.type || 'default').toLowerCase().replace(/\s+/g, '_');
                return `link rel-${relType}`;
            })
            .merge(linkSelection as any)
            .attr('id', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                return `link-${sourceId}-${targetId}`;
            })
            .attr('data-source-id', (d: any) => typeof d.source === 'object' ? d.source.id : d.source)
            .attr('data-target-id', (d: any) => typeof d.target === 'object' ? d.target.id : d.target)
            .attr('d', (d: any) => {
                // Use configured link generator or fall back to D3's default
                if (LINK_CONFIG.ALGORITHM === 'default') {
                    return sankeyLinkHorizontal()(d);
                }
                return linkPathGenerator(d);
            })
            .style('stroke-width', (d: any) => {
                // For polygon mode, don't use stroke-width (it's built into the path)
                return LINK_CONFIG.RENDER_MODE === 'polygon' ? 0 : calculateLinkWidth(d.width || 2);
            })
            .style('cursor', 'pointer')
            .attr('data-relationship-type', (d: any) => d.type || 'default')
            .on('click', (event: MouseEvent, d: any) => handleLinkClick(event, d))
            .on('touchstart', (event: TouchEvent, d: any) => handleLinkClick(event, d))
            .on('mouseenter', (event: MouseEvent, d: any) => handleLinkHover(d, true))
            .on('mouseleave', (event: MouseEvent, d: any) => handleLinkHover(d, false));

        linkSelection.exit().remove();

        // Render nodes
        const nodeSelection = nodeGroup
            .selectAll('.node')
            .data(sankeyResult.nodes, (d: any) => d.id);

        const nodeEnter = nodeSelection.enter()
            .append('g')
            .attr('class', 'node')
            .attr('id', (d: any) => `node-${d.id}`)
            .attr('data-node-id', (d: any) => d.id)
            .attr('data-node-type', (d: any) => d.type)
            .style('cursor', 'pointer');

        // Node HTML content using foreignObject
        nodeEnter
            .append('foreignObject')
            .attr('class', 'node-html')
            .merge(nodeSelection.select('.node-html') as any)
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', htmlNodeWidth)
            .attr('height', (d: any) => d.y1! - d.y0!)
            .style('cursor', 'pointer')
            .html((d: any) => createNodeComponent(d))
            .on('click', (event: MouseEvent, d: any) => handleNodeClick(event, d))
            .on('touchstart', (event: TouchEvent, d: any) => handleNodeClick(event, d))
            .on('mouseenter', (event: MouseEvent, d: any) => handleNodeHover(d.id, true))
            .on('mouseleave', (event: MouseEvent, d: any) => handleNodeHover(d.id, false));

        // Priority indicators are now included in HTML content

        // Update positions and attributes for both new and existing nodes
        nodeSelection
            .merge(nodeEnter as any)
            .attr('id', (d: any) => `node-${d.id}`)
            .attr('data-node-id', (d: any) => d.id)
            .attr('data-node-type', (d: any) => d.type)
            .attr('transform', (d: any) => `translate(${d.x0}, ${d.y0})`);

        nodeSelection.exit().remove();
    }

    function createNodeComponent(node: SankeyNode): string {
        const isSelected = node.id === selectedNodeId;
        let nodeComponent;
        const nodeContainer = document.createElement('div');
        
        switch (node.type) {
            case 'symptom':
                nodeComponent = mount(SymptomNode, {
                    target: nodeContainer,
                    props: {
                        node,
                        symptom: node.data as any,
                        isSelected,
                        isMobile
                    }
                });
                break;
                
            case 'diagnosis':
                nodeComponent = mount(DiagnosisNode, {
                    target: nodeContainer,
                    props: {
                        node,
                        diagnosis: node.data as any,
                        isSelected,
                        isMobile
                    }
                });
                break;
                
            case 'treatment':
                nodeComponent = mount(TreatmentNode, {
                    target: nodeContainer,
                    props: {
                        node,
                        treatment: node.data as any,
                        isSelected,
                        isMobile
                    }
                });
                break;
                
            default:
                // Fallback for action nodes or unknown types
                nodeContainer.innerHTML = `
                    <div class="sankey-node" style="background-color: ${node.color};">
                        <div class="node-content">
                            <div class="node-title">${truncateText(node.name, isMobile ? 20 : 25)}</div>
                        </div>
                    </div>
                `;
                break;
        }
        
        // Store component reference for cleanup
        nodeComponents.set(node.id, { component: nodeComponent, container: nodeContainer });
        
        return nodeContainer.innerHTML;
    }


    function handleNodeClick(event: MouseEvent | TouchEvent, node: SankeyNode) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('SankeyDiagram: Node clicked, using unified selection system', node);
        
        // Use new unified selection system
        analysisActions.selectItem('node', node);
        
        // Also emit the event for backwards compatibility
        onnodeSelect?.(new CustomEvent('nodeSelect', {
            detail: {
                nodeId: node.id,
                node: node,
                event: event
            }
        }));
    }

    function handleLinkClick(event: MouseEvent | TouchEvent, link: SankeyLink) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('SankeyDiagram: Link clicked, using unified selection system', link);
        
        // Use new unified selection system
        analysisActions.selectItem('link', link);
        
        // Also emit the event for backwards compatibility
        onlinkSelect?.(new CustomEvent('linkSelect', {
            detail: {
                link: link,
                event: event
            }
        }));
    }

    function handleCanvasClick(event: MouseEvent) {
        // Ignore clicks that were part of a drag/zoom operation
        if (event.defaultPrevented) return;
        
        // Only clear selection if clicking on the SVG itself (not nodes or links)
        const target = event.target as SVGElement;
        const isClickableElement = target.classList?.contains('node-html') || 
                                  target.classList?.contains('link') ||
                                  target.tagName === 'path' ||
                                  target.closest('.node-html') ||
                                  target.closest('.link');
        
        // Clear selection if clicking on any non-interactive SVG element
        if (!isClickableElement) {
            // Clear the unified visual state system
            analysisActions.clearSelection();
            
            // Also notify parent component
            onselectionClear?.(new CustomEvent('selectionClear'));
        }
    }

    function buildFocusableNodesList() {
        if (!sankeyData.nodes) return;
        
        // Order nodes by medical workflow: symptoms -> diagnoses -> treatments
        const orderedNodes: SankeyNode[] = [];
        
        // Add symptoms first
        sankeyData.nodes.filter(n => n.type === 'symptom').forEach(node => {
            orderedNodes.push(node);
        });
        
        // Add diagnoses second
        sankeyData.nodes.filter(n => n.type === 'diagnosis').forEach(node => {
            orderedNodes.push(node);
        });
        
        // Add treatments third
        sankeyData.nodes.filter(n => n.type === 'treatment').forEach(node => {
            orderedNodes.push(node);
        });
        
        // Add any other node types at the end
        sankeyData.nodes.filter(n => !['symptom', 'diagnosis', 'treatment'].includes(n.type)).forEach(node => {
            orderedNodes.push(node);
        });
        
        focusableNodes = orderedNodes;
    }

    function updateNodeFocus(targetFocusedNodeId: string | null) {
        if (!svg) return;
        
        // Remove focus class from all nodes efficiently
        svg.selectAll('.node-html').classed('focused', false);
        
        // Add focus class to the specific node if one is focused
        if (targetFocusedNodeId) {
            svg.selectAll('.node-html')
                .filter((d: any) => d.id === targetFocusedNodeId)
                .classed('focused', true);
                
            console.log('🎯 Applied focus to node:', targetFocusedNodeId);
        }
    }

    function focusNextNode() {
        if (focusableNodes.length === 0) return;
        
        const nextIndex = (focusedNodeIndex + 1) % focusableNodes.length;
        onfocusChange?.(new CustomEvent('focusChange', { detail: { index: nextIndex }}));
    }

    function focusPreviousNode() {
        if (focusableNodes.length === 0) return;
        
        const prevIndex = focusedNodeIndex <= 0 ? focusableNodes.length - 1 : focusedNodeIndex - 1;
        onfocusChange?.(new CustomEvent('focusChange', { detail: { index: prevIndex }}));
    }

    function selectFocusedNode() {
        if (focusedNodeIndex >= 0 && focusedNodeIndex < focusableNodes.length) {
            const focusedNode = focusableNodes[focusedNodeIndex];
            onnodeSelect?.(new CustomEvent('nodeSelect', {
                detail: {
                    nodeId: focusedNode.id,
                    node: focusedNode,
                    event: new KeyboardEvent('keydown')
                }
            }));
        }
    }

    // Expose navigation functions to parent via global window object temporarily
    // This is a workaround since we can't pass functions up directly
    if (typeof window !== 'undefined') {
        (window as any).sankeyNavigationFunctions = {
            focusNext: focusNextNode,
            focusPrevious: focusPreviousNode,
            selectFocused: selectFocusedNode,
            clearSelection: () => {
                // Clear the unified visual state system
                analysisActions.clearSelection();
            }
        };
    }

    function getConnectedLinkIds(nodeId: string): Set<string> {
        if (!svg) return new Set();
        
        const connectedLinkIds = new Set<string>();
        
        // Find the node type
        let focusedNodeType = '';
        svg.selectAll('.node').each((d: any) => {
            if (d.id === nodeId) {
                focusedNodeType = d.type;
            }
        });
        
        // Build connection maps for directional traversal
        const nodeMap = new Map<string, any>();
        const forwardMap = new Map<string, Set<string>>();
        const backwardMap = new Map<string, Set<string>>();
        
        svg.selectAll('.node').each((d: any) => {
            nodeMap.set(d.id, d);
        });
        
        svg.selectAll('.link').each((d: any) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            
            if (!forwardMap.has(sourceId)) forwardMap.set(sourceId, new Set());
            if (!backwardMap.has(targetId)) backwardMap.set(targetId, new Set());
            
            forwardMap.get(sourceId)!.add(targetId);
            backwardMap.get(targetId)!.add(sourceId);
        });
        
        // Helper function to find forward connections
        const findForward = (nodeId: string, allowedTypes: string[]) => {
            const targets = forwardMap.get(nodeId) || new Set();
            targets.forEach(targetId => {
                const targetNode = nodeMap.get(targetId);
                if (targetNode && allowedTypes.includes(targetNode.type)) {
                    connectedLinkIds.add(`${nodeId}-${targetId}`);
                    
                    // Continue forward if we found a diagnosis and need treatments
                    if (targetNode.type === 'diagnosis') {
                        const treatmentTargets = forwardMap.get(targetId) || new Set();
                        treatmentTargets.forEach(treatmentId => {
                            const treatmentNode = nodeMap.get(treatmentId);
                            if (treatmentNode && treatmentNode.type === 'treatment') {
                                connectedLinkIds.add(`${targetId}-${treatmentId}`);
                            }
                        });
                    }
                }
            });
        };
        
        // Helper function to find backward connections
        const findBackward = (nodeId: string, allowedTypes: string[]) => {
            const sources = backwardMap.get(nodeId) || new Set();
            sources.forEach(sourceId => {
                const sourceNode = nodeMap.get(sourceId);
                if (sourceNode && allowedTypes.includes(sourceNode.type)) {
                    connectedLinkIds.add(`${sourceId}-${nodeId}`);
                    
                    // Continue backward if we found a diagnosis and need symptoms
                    if (sourceNode.type === 'diagnosis') {
                        const symptomSources = backwardMap.get(sourceId) || new Set();
                        symptomSources.forEach(symptomId => {
                            const symptomNode = nodeMap.get(symptomId);
                            if (symptomNode && symptomNode.type === 'symptom') {
                                connectedLinkIds.add(`${symptomId}-${sourceId}`);
                            }
                        });
                    }
                }
            });
        };
        
        // Apply directional logic based on node type
        if (focusedNodeType === 'symptom') {
            // Symptom -> Diagnoses -> Treatments
            findForward(nodeId, ['diagnosis', 'treatment']);
        } else if (focusedNodeType === 'diagnosis') {
            // Diagnosis -> Treatments AND Symptoms -> Diagnosis (bidirectional)
            findForward(nodeId, ['treatment']);
            findBackward(nodeId, ['symptom']);
        } else if (focusedNodeType === 'treatment') {
            // Symptoms -> Diagnoses -> Treatment (backward only)
            findBackward(nodeId, ['diagnosis', 'symptom']);
        } else if (focusedNodeType === 'action') {
            // Actions can connect to any node through relationships
            svg.selectAll('.node').each((d: any) => {
                if (d.relationships) {
                    d.relationships.forEach((rel: any) => {
                        if (rel.nodeId === nodeId) {
                            connectedLinkIds.add(`${rel.nodeId}-${nodeId}`);
                        }
                    });
                }
            });
            
            // Also check if this action has relationships to other nodes
            const focusedNode = nodeMap.get(nodeId);
            if (focusedNode?.relationships) {
                focusedNode.relationships.forEach((rel: any) => {
                    connectedLinkIds.add(`${nodeId}-${rel.nodeId}`);
                });
            }
        }
        
        return connectedLinkIds;
    }

    function isLinkActiveInFocusMode(link: any): boolean {
        const activeNodeId = selectedNodeId || focusedNodeId;
        if (!activeNodeId) return true; // Not in focus mode, show all tooltips
        
        const connectedLinks = getConnectedLinkIds(activeNodeId);
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const linkId = `${sourceId}-${targetId}`;
        
        return connectedLinks.has(linkId);
    }

    function handleLinkHover(link: any, isEntering: boolean) {
        console.log('handleLinkHover called:', { link: link?.type, isEntering });
        
        // Use unified hover system
        if (!isEntering) {
            analysisActions.clearHover();
            tooltipData.visible = false;
            // Explicitly remove hover classes and reset all states
            if (svg) {
                svg.selectAll('.link.hovered').classed('hovered', false);
                svg.selectAll('.node-html.hovered').classed('hovered', false);
                
                // Force reset all node states to default opacity
                svg.selectAll('.node-html')
                    .classed('inactive', false)
                    .classed('background-trigger', false)
                    .classed('background-path', false)
                    .classed('active-path', false)
                    .style('opacity', null)
                    .style('filter', null);
                
                svg.selectAll('.link')
                    .classed('inactive', false)
                    .classed('background-trigger', false)
                    .classed('background-path', false)
                    .classed('active-path', false)
                    .style('opacity', null)
                    .style('stroke-opacity', null)
                    .style('fill-opacity', null);
            }
            return;
        }
        
        // Set hover state using unified system
        analysisActions.hoverItem('link', link);
        
        // Check if this link should show tooltip based on focus mode
        if (isEntering && !isLinkActiveInFocusMode(link)) {
            // In focus mode but this link is inactive, don't show tooltip
            return;
        }
        
        if (link) {
            const sourceNode = link.source;
            const targetNode = link.target;
            
            // Get relationship type for all links
            const relationshipType = link.type || 'connection';
            const relationshipLabel = relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1);
            
            // Note: We don't set the hovered link as persistent selection
            // Only clicks should trigger persistent selection
            
            // Get related actions from the reactive store (only for symptom->diagnosis or diagnosis->treatment links)
            let relatedActions: any[] = [];
            if ((sourceNode.type === 'symptom' && targetNode.type === 'diagnosis') ||
                (sourceNode.type === 'diagnosis' && targetNode.type === 'treatment')) {
                // Get current value from the reactive store
                relatedActions = get(relatedActionsForSelectedLink);
            }
            
            // Calculate position - convert from Sankey coordinates to absolute page coordinates
            const sankeyMidX = (sourceNode.x1 + targetNode.x0) / 2;
            const sankeyMidY = (link.y0 + link.y1) / 2;
            
            // Get the container's absolute position
            const containerRect = container?.getBoundingClientRect();
            if (!containerRect) return;
            
            // Apply current zoom transform to coordinates
            const transformedX = sankeyMidX * currentZoomTransform.k + currentZoomTransform.x;
            const transformedY = sankeyMidY * currentZoomTransform.k + currentZoomTransform.y;
            
            // Convert to absolute coordinates, accounting for margins
            const absoluteX = containerRect.left + margins.left + transformedX;
            const absoluteY = containerRect.top + margins.top + transformedY;
            
            // Apply viewport boundary checking to keep tooltip on screen
            const tooltipWidth = isMobile ? 200 : 300;
            const tooltipHeight = 100; // Estimated height
            
            const clampedX = Math.max(
                tooltipWidth / 2 + 10, // Left boundary
                Math.min(absoluteX, window.innerWidth - tooltipWidth / 2 - 10) // Right boundary
            );
            
            const clampedY = Math.max(
                tooltipHeight / 2 + 10, // Top boundary  
                Math.min(absoluteY, window.innerHeight - tooltipHeight / 2 - 10) // Bottom boundary
            );
            
            // Update tooltip data - tooltip will be centered using CSS transform
            tooltipData = {
                relationshipType,
                relationshipLabel,
                actions: relatedActions,
                visible: true,
                x: clampedX,
                y: clampedY
            };
        }
    }


    
    function cleanupNodeComponents() {
        nodeComponents.forEach(({ component }) => {
            if (component) {
                try {
                    unmount(component);
                } catch (error) {
                    // Ignore unmount errors - component may already be unmounted
                    console.debug('Node component already unmounted:', error);
                }
            }
        });
        nodeComponents.clear();
    }

    function applyFocusHighlighting(focusedNodeId: string) {
        if (!svg) return;
        
        // Find the node type
        let focusedNodeType = '';
        svg.selectAll('.node').each((d: any) => {
            if (d.id === focusedNodeId) {
                focusedNodeType = d.type;
            }
        });
        
        // Get logically connected nodes based on medical flow
        const connectedNodeIds = new Set<string>();
        const connectedLinkIds = new Set<string>();
        
        // Start with the focused node
        connectedNodeIds.add(focusedNodeId);
        
        // Build connection maps for directional traversal
        const nodeMap = new Map<string, any>();
        const forwardMap = new Map<string, Set<string>>(); // source -> targets
        const backwardMap = new Map<string, Set<string>>(); // target -> sources
        
        svg.selectAll('.node').each((d: any) => {
            nodeMap.set(d.id, d);
        });
        
        svg.selectAll('.link').each((d: any) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            
            if (!forwardMap.has(sourceId)) forwardMap.set(sourceId, new Set());
            if (!backwardMap.has(targetId)) backwardMap.set(targetId, new Set());
            
            forwardMap.get(sourceId)!.add(targetId);
            backwardMap.get(targetId)!.add(sourceId);
        });
        
        // Helper function to find forward connections
        const findForward = (nodeId: string, allowedTypes: string[]) => {
            const targets = forwardMap.get(nodeId) || new Set();
            targets.forEach(targetId => {
                const targetNode = nodeMap.get(targetId);
                if (targetNode && allowedTypes.includes(targetNode.type)) {
                    connectedNodeIds.add(targetId);
                    connectedLinkIds.add(`${nodeId}-${targetId}`);
                    
                    // Continue forward if we found a diagnosis and need treatments
                    if (targetNode.type === 'diagnosis') {
                        const treatmentTargets = forwardMap.get(targetId) || new Set();
                        treatmentTargets.forEach(treatmentId => {
                            const treatmentNode = nodeMap.get(treatmentId);
                            if (treatmentNode && treatmentNode.type === 'treatment') {
                                connectedNodeIds.add(treatmentId);
                                connectedLinkIds.add(`${targetId}-${treatmentId}`);
                            }
                        });
                    }
                }
            });
        };
        
        // Helper function to find backward connections
        const findBackward = (nodeId: string, allowedTypes: string[]) => {
            const sources = backwardMap.get(nodeId) || new Set();
            sources.forEach(sourceId => {
                const sourceNode = nodeMap.get(sourceId);
                if (sourceNode && allowedTypes.includes(sourceNode.type)) {
                    connectedNodeIds.add(sourceId);
                    connectedLinkIds.add(`${sourceId}-${nodeId}`);
                    
                    // Continue backward if we found a diagnosis and need symptoms
                    if (sourceNode.type === 'diagnosis') {
                        const symptomSources = backwardMap.get(sourceId) || new Set();
                        symptomSources.forEach(symptomId => {
                            const symptomNode = nodeMap.get(symptomId);
                            if (symptomNode && symptomNode.type === 'symptom') {
                                connectedNodeIds.add(symptomId);
                                connectedLinkIds.add(`${symptomId}-${sourceId}`);
                            }
                        });
                    }
                }
            });
        };
        
        // Apply directional logic based on node type
        if (focusedNodeType === 'symptom') {
            // Symptom -> Diagnoses -> Treatments
            findForward(focusedNodeId, ['diagnosis', 'treatment']);
        } else if (focusedNodeType === 'diagnosis') {
            // Symptoms -> Diagnosis -> Treatments
            findBackward(focusedNodeId, ['symptom']);
            findForward(focusedNodeId, ['treatment']);
            
            // Also find treatments that investigate this diagnosis
            svg.selectAll('.node').each((d: any) => {
                if (d.type === 'treatment' && d.data && d.data.relationships) {
                    // Check if this treatment investigates the focused diagnosis
                    const investigatesRelation = d.data.relationships.find(
                        (rel: any) => rel.nodeId === focusedNodeId && rel.relationship === 'investigates' && rel.direction === 'outgoing'
                    );
                    if (investigatesRelation) {
                        connectedNodeIds.add(d.id);
                        // Investigation links are reversed: diagnosis -> treatment (investigation)
                        connectedLinkIds.add(`${focusedNodeId}-${d.id}`);
                    }
                }
            });
        } else if (focusedNodeType === 'treatment') {
            // For treatments, we need to find connections in two ways:
            // 1. Find diagnoses that lead to this treatment (incoming "treats" relationships)
            // 2. Find diagnoses that this treatment investigates (outgoing "investigates" relationships)
            
            // Method 1: Find diagnoses that lead to this treatment
            const treatmentSources = backwardMap.get(focusedNodeId) || new Set();
            treatmentSources.forEach(diagnosisId => {
                const diagnosisNode = nodeMap.get(diagnosisId);
                if (diagnosisNode && diagnosisNode.type === 'diagnosis') {
                    connectedNodeIds.add(diagnosisId);
                    connectedLinkIds.add(`${diagnosisId}-${focusedNodeId}`);
                    
                    // Find all symptoms that connect to this diagnosis
                    const diagnosisSources = backwardMap.get(diagnosisId) || new Set();
                    diagnosisSources.forEach(symptomId => {
                        const symptomNode = nodeMap.get(symptomId);
                        if (symptomNode && symptomNode.type === 'symptom') {
                            connectedNodeIds.add(symptomId);
                            connectedLinkIds.add(`${symptomId}-${diagnosisId}`);
                        }
                    });
                }
            });
            
            // Method 2: Check if this treatment investigates any diagnoses
            // Look at the treatment's own relationships
            const focusedNode = nodeMap.get(focusedNodeId);
            if (focusedNode && focusedNode.data && focusedNode.data.relationships) {
                focusedNode.data.relationships.forEach((rel: any) => {
                    if (rel.relationship === 'investigates' && rel.direction === 'outgoing') {
                        const investigatedNode = nodeMap.get(rel.nodeId);
                        if (investigatedNode && investigatedNode.type === 'diagnosis') {
                            connectedNodeIds.add(rel.nodeId);
                            // Investigation links are reversed: diagnosis -> treatment (investigation)
                            connectedLinkIds.add(`${rel.nodeId}-${focusedNodeId}`);
                            
                            // Find all symptoms that connect to this investigated diagnosis
                            const diagnosisSources = backwardMap.get(rel.nodeId) || new Set();
                            diagnosisSources.forEach(symptomId => {
                                const symptomNode = nodeMap.get(symptomId);
                                if (symptomNode && symptomNode.type === 'symptom') {
                                    connectedNodeIds.add(symptomId);
                                    connectedLinkIds.add(`${symptomId}-${rel.nodeId}`);
                                }
                            });
                        }
                    }
                });
            }
        }
        
        // Apply focus styling
        svg.selectAll('.node')
            .style('opacity', (d: any) => connectedNodeIds.has(d.id) ? OPACITY.FOCUS_ACTIVE : OPACITY.FOCUS_INACTIVE)
            .style('filter', (d: any) => connectedNodeIds.has(d.id) ? 'none' : `grayscale(${OPACITY.GRAYSCALE_FILTER})`);
        
        svg.selectAll('.link')
            .style('stroke-opacity', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                // For polygon mode, stroke-opacity should be 0
                return LINK_CONFIG.RENDER_MODE === 'polygon' ? 0 : 
                    (connectedLinkIds.has(linkId) ? OPACITY.FOCUS_LINK_ACTIVE : OPACITY.FOCUS_LINK_INACTIVE);
            })
            .style('fill-opacity', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                // For polygon mode, use fill-opacity instead of stroke-opacity
                return LINK_CONFIG.RENDER_MODE === 'polygon' ? 
                    (connectedLinkIds.has(linkId) ? OPACITY.FOCUS_LINK_ACTIVE : OPACITY.FOCUS_LINK_INACTIVE) : 0;
            })
            .style('filter', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                // Remove grayscale for connected links in focus mode
                return connectedLinkIds.has(linkId) ? 'none' : 'grayscale(1)';
            });
    }
    
    function resetHighlighting() {
        if (!svg) return;
        
        // Reset all nodes and links to default state
        svg.select('.node-group').selectAll('.node')
            .style('opacity', OPACITY.RESET_NODE)
            .style('filter', 'none');
        
        svg.select('.link-group').selectAll('.link')
            .style('stroke-opacity', LINK_CONFIG.RENDER_MODE === 'polygon' ? 0 : OPACITY.RESET_LINK)
            .style('fill-opacity', LINK_CONFIG.RENDER_MODE === 'polygon' ? OPACITY.RESET_LINK : 0);
    }

    function applyUnifiedVisualState(visualStateData: any) {
        if (!svg) {
            console.log('applyUnifiedVisualState: No svg element');
            return;
        }
        
        console.log('applyUnifiedVisualState: Starting with state:', visualStateData);
        
        // Clear all existing classes and transitions
        svg.select('.link-group').selectAll('.link')
            .classed('selected', false)
            .classed('in-path', false)
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false)
            .interrupt(); // Stop any running animations
            
        svg.select('.node-group').selectAll('.node')
            .classed('connected-to-selected', false)
            .classed('in-path', false)
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false);
            
        svg.selectAll('.node-html')
            .classed('connected-to-selected', false)
            .classed('in-path', false)
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false);
        
        const { activeState, backgroundState, shouldAnimateTrigger, triggerItem } = visualStateData;
        
        if (!activeState) {
            // No active state - reset to default
            resetToDefault();
            return;
        }
        
        const activePathNodes = activeState.path.nodes;
        const activePathLinks = activeState.path.links;
        const backgroundPathNodes = backgroundState?.path?.nodes || [];
        const backgroundPathLinks = backgroundState?.path?.links || [];
        
        console.log('applyUnifiedVisualState: Path data:', {
            activePathNodes,
            activePathLinks,
            triggerType: triggerItem?.type,
            triggerId: triggerItem?.id
        });
        
        // Apply styling with priority: trigger > active path > background path > default
        svg.select('.link-group').selectAll('.link')
            .classed('selected', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                return triggerItem?.type === 'link' && triggerItem.id === linkId;
            })
            .classed('in-path', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                return activePathLinks.includes(linkId);
            })
            .classed('active-path', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                const isTrigger = triggerItem?.type === 'link' && triggerItem.id === linkId;
                const isInActivePath = activePathLinks.includes(linkId);
                return isTrigger || isInActivePath;
            })
            .classed('background-trigger', false) // Links don't have background trigger state
            .classed('background-path', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                const isInActivePath = activePathLinks.includes(linkId);
                const isTrigger = triggerItem?.type === 'link' && triggerItem.id === linkId;
                const isInBackgroundPath = backgroundPathLinks.includes(linkId);
                return !isTrigger && !isInActivePath && isInBackgroundPath;
            })
            .classed('inactive', (d: any) => {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                const isTrigger = triggerItem?.type === 'link' && triggerItem.id === linkId;
                const isInActivePath = activePathLinks.includes(linkId);
                const isInBackgroundPath = backgroundPathLinks.includes(linkId);
                return !isTrigger && !isInActivePath && !isInBackgroundPath;
            });
        
        // Apply node styling
        svg.select('.node-group').selectAll('.node')
            .classed('selected', (d: any) => {
                const isSelected = triggerItem?.type === 'node' && triggerItem.id === d.id;
                return isSelected;
            })
            .each(function(d: any) {
                // Move selected node to end to ensure it renders on top
                const isSelected = triggerItem?.type === 'node' && triggerItem.id === d.id;
                if (isSelected) {
                    d3.select(this).raise(); // D3 method to move element to end of parent
                    d3.select(this).select('.node-html').raise(); // Also raise the foreignObject
                }
            })
            .classed('connected-to-selected', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                return isTrigger || isInActivePath;
            })
            .classed('in-path', (d: any) => {
                return activePathNodes.includes(d.id) || backgroundPathNodes.includes(d.id);
            })
            .style('opacity', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                const isInBackgroundPath = backgroundPathNodes.includes(d.id);
                
                if (isTrigger) {
                    return 1.0; // Trigger node always full opacity
                } else if (isInActivePath) {
                    return 1.0; // Active path nodes full opacity
                } else if (isInBackgroundPath) {
                    return 0.6; // Background path nodes medium opacity
                } else {
                    return 0.3; // Other nodes more visible (was 0.2)
                }
            });
            
        svg.selectAll('.node-html')
            .classed('selected', (d: any) => {
                // Node is selected if:
                // 1. It's the trigger in background state (was selected and now something else is hovered), OR
                // 2. It's the trigger in active state and should animate (was just clicked/selected)
                const isBackgroundTrigger = backgroundState?.trigger?.type === 'node' && backgroundState.trigger.id === d.id;
                const isActiveTriggerWithAnimation = activeState?.trigger?.type === 'node' && activeState.trigger.id === d.id && shouldAnimateTrigger;
                
                return isBackgroundTrigger || isActiveTriggerWithAnimation;
            })
            .classed('hovered', (d: any) => {
                // Node is currently being hovered (but not selected, or hovered while something else is selected)
                return activeState?.trigger?.type === 'node' && activeState.trigger.id === d.id && !shouldAnimateTrigger;
            })
            .classed('connected-to-selected', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                return isTrigger || isInActivePath;
            })
            .classed('active-path', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                return isTrigger || isInActivePath;
            })
            .classed('background-trigger', (d: any) => {
                const isBackgroundTrigger = backgroundState?.trigger?.type === 'node' && backgroundState.trigger.id === d.id;
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                return isBackgroundTrigger && !isTrigger && !isInActivePath;
            })
            .classed('background-path', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                const isInBackgroundPath = backgroundPathNodes.includes(d.id);
                const isBackgroundTrigger = backgroundState?.trigger?.type === 'node' && backgroundState.trigger.id === d.id;
                return !isTrigger && !isInActivePath && !isBackgroundTrigger && isInBackgroundPath;
            })
            .classed('inactive', (d: any) => {
                const isTrigger = triggerItem?.type === 'node' && triggerItem.id === d.id;
                const isInActivePath = activePathNodes.includes(d.id);
                const isInBackgroundPath = backgroundPathNodes.includes(d.id);
                const isBackgroundTrigger = backgroundState?.trigger?.type === 'node' && backgroundState.trigger.id === d.id;
                return !isTrigger && !isInActivePath && !isInBackgroundPath && !isBackgroundTrigger;
            });
        
        // Add animation class to trigger item if needed
        if (shouldAnimateTrigger && triggerItem?.type === 'link') {
            // Apply animation to the specific selected link
            svg.selectAll('.link').each(function(d: any) {
                const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                const linkId = `${sourceId}-${targetId}`;
                const isAnimatedLink = linkId === triggerItem.id;
                
                if (isAnimatedLink) {
                    // Clear conflicting inline styles and add animation class
                    d3.select(this)
                        .classed('animate-pulse', true)
                        .style('fill', null)           // Clear inline fill color
                        .style('fill-opacity', null)   // Clear inline fill opacity
                        .style('stroke', null)         // Clear inline stroke color  
                        .style('stroke-opacity', null) // Clear inline stroke opacity
                        .style('filter', null);        // Clear inline filter
                } else {
                    d3.select(this).classed('animate-pulse', false);
                }
            });
        } else {
            // Clear animation from all links
            svg.select('.link-group').selectAll('.link').classed('animate-pulse', false);
        }
        
        console.log('applyUnifiedVisualState: Applied styling for', {
            activeNodes: activePathNodes.length,
            activeLinks: activePathLinks.length,
            backgroundNodes: backgroundPathNodes.length,
            backgroundLinks: backgroundPathLinks.length,
            shouldAnimate: shouldAnimateTrigger
        });
    }
    
    function resetToDefault() {
        if (!svg) return;
        
        // Clear all visual state classes from links and reset opacity
        svg.select('.link-group').selectAll('.link')
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false)
            .classed('hovered', false)
            .style('opacity', null)
            .style('stroke-opacity', null)
            .style('fill-opacity', null)
            .interrupt();
            
        // Clear all visual state classes from SVG nodes and reset opacity
        svg.select('.node-group').selectAll('.node')
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false)
            .classed('connected-to-selected', false)
            .style('opacity', null);
            
        // Clear all visual state classes from HTML nodes and reset opacity
        svg.selectAll('.node-html')
            .classed('active-path', false)
            .classed('background-trigger', false)
            .classed('background-path', false)
            .classed('inactive', false)
            .classed('hovered', false)
            .classed('connected-to-selected', false)
            .style('opacity', null)
            .style('filter', null);
    }
    
    

    function handleNodeHover(nodeId: string, isEntering: boolean) {
        console.log('handleNodeHover called:', { nodeId, isEntering });
        
        if (!svg) return;
        
        // Use new unified hover system
        if (!isEntering) {
            analysisActions.clearHover();
            // Explicitly remove hover classes and reset all opacity states
            svg.selectAll('.node-html.hovered').classed('hovered', false);
            svg.selectAll('.link.hovered').classed('hovered', false);
            
            // Force reset all node states to default opacity
            svg.selectAll('.node-html')
                .classed('inactive', false)
                .classed('background-trigger', false)
                .classed('background-path', false)
                .classed('active-path', false)
                .style('opacity', null)  // Remove any inline opacity styles
                .style('filter', null);   // Remove any inline filter styles
            
            svg.selectAll('.link')
                .classed('inactive', false)
                .classed('background-trigger', false)
                .classed('background-path', false)
                .classed('active-path', false)
                .style('opacity', null)
                .style('stroke-opacity', null)
                .style('fill-opacity', null);
            
            return;
        }
        
        // Find the node object for hovering
        const allNodeArrays = [
            sankeyData?.nodes || [],
        ].flat();
        const nodeObject = allNodeArrays.find(n => n.id === nodeId);
        
        console.log('Found node object:', { nodeObject, totalNodes: allNodeArrays.length });
        
        if (nodeObject) {
            console.log('Calling analysisActions.hoverItem with node:', nodeObject);
            analysisActions.hoverItem('node', nodeObject);
        } else {
            console.log('Node object not found for ID:', nodeId);
        }
    }

    function handleContainerResize(contentRect: DOMRectReadOnly) {
        const newWidth = Math.max(contentRect.width, 300);
        const newHeight = Math.max(contentRect.height, 200);
        
        // Update viewBox immediately for smooth visual feedback during resize
        if (svg) {
            svg.attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
        }
        
        // Clear existing debounce timer
        if (resizeDebounceTimer) {
            clearTimeout(resizeDebounceTimer);
        }
        
        // Check if resize is significant enough to require full re-render
        const significantWidthChange = Math.abs(newWidth - width) > SIGNIFICANT_WIDTH_THRESHOLD;
        const significantHeightChange = Math.abs(newHeight - height) > SIGNIFICANT_HEIGHT_THRESHOLD;
        
        if (significantWidthChange || significantHeightChange) {
            // Debounce expensive recalculation for significant changes
            resizeDebounceTimer = setTimeout(() => {
                console.log('📐 Significant resize detected, triggering re-render:', {
                    oldSize: { width, height },
                    newSize: { width: newWidth, height: newHeight },
                    widthChange: Math.abs(newWidth - width),
                    heightChange: Math.abs(newHeight - height)
                });
                
                // This will trigger the main effect to re-render
                width = newWidth;
                height = newHeight;
                
                resizeDebounceTimer = null;
            }, RESIZE_DEBOUNCE_DELAY);
        }
    }

    function truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    // Zoom event handlers
    function handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        currentZoomTransform = event.transform;
        if (svg) {
            svg.select('g.main-group')
                .attr('transform', event.transform.toString());
        }
    }

    function handleZoomStart() {
        if (svg) {
            svg.style('cursor', 'grabbing');
        }
    }

    function handleZoomEnd() {
        if (svg) {
            svg.style('cursor', 'grab');
        }
    }

    // Zoom utility functions
    function zoomToFit() {
        if (!svg || !sankeyData.nodes.length || !zoomBehavior) return;
        
        const mainGroupElement = svg.select('.main-group').node() as SVGGElement;
        if (!mainGroupElement) return;
        
        const bounds = mainGroupElement.getBBox();
        
        const padding = isMobile ? 40 : 80;
        const scaleX = (width - padding * 2) / bounds.width;
        const scaleY = (height - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, ZOOM_CONFIG.scaleExtent[1]);
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const translateX = width / 2 - scale * centerX;
        const translateY = height / 2 - scale * centerY;
        
        const transform = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale);
        
        svg.transition()
            .duration(ZOOM_CONFIG.duration)
            .call(zoomBehavior.transform, transform);
    }

    function zoomIn() {
        if (!svg || !zoomBehavior) return;
        svg.transition()
            .duration(ZOOM_CONFIG.duration)
            .call(zoomBehavior.scaleBy, 1.5);
    }

    function zoomOut() {
        if (!svg || !zoomBehavior) return;
        svg.transition()
            .duration(ZOOM_CONFIG.duration)
            .call(zoomBehavior.scaleBy, 1 / 1.5);
    }

    function resetZoom() {
        if (!svg || !zoomBehavior) return;
        svg.transition()
            .duration(ZOOM_CONFIG.duration)
            .call(zoomBehavior.transform, d3.zoomIdentity);
    }

    // Pan in a specific direction
    function panDirection(deltaX: number, deltaY: number) {
        if (!svg || !zoomBehavior) return;
        
        const transform = d3.zoomIdentity
            .translate(currentZoomTransform.x + deltaX, currentZoomTransform.y + deltaY)
            .scale(currentZoomTransform.k);
        
        svg.transition()
            .duration(200)
            .call(zoomBehavior.transform, transform);
    }

    // Zoom filter to prevent conflicts with node/link interactions
    function zoomFilter(event: any): boolean {
        // Allow zoom on right click, wheel, or touch
        if (event.type === 'wheel') return true;
        if (event.type === 'dblclick') return true;
        if (event.touches?.length >= 2) return true; // Multi-touch
        
        // For mouse/single touch, only allow if not on interactive elements
        const target = event.target as Element;
        const isInteractiveElement = 
            target.closest('.node-html') ||
            target.closest('.link') ||
            target.classList.contains('node-html') ||
            target.classList.contains('link');
        
        // Allow drag if not on interactive elements or if it's a right click
        return !isInteractiveElement || event.button === 2;
    }

    // Transform constraint function to keep content within reasonable bounds
    function constrainTransform(transform: d3.ZoomTransform): d3.ZoomTransform {
        if (!sankeyData.nodes.length) return transform;
        
        // Calculate content bounds
        const padding = isMobile ? 100 : 200;
        const contentWidth = width - margins.left - margins.right;
        const contentHeight = height - margins.top - margins.bottom;
        
        // Allow some panning beyond content bounds for better UX
        const maxTranslateX = padding;
        const minTranslateX = -contentWidth * transform.k + width - padding;
        const maxTranslateY = padding;
        const minTranslateY = -contentHeight * transform.k + height - padding;
        
        const constrainedX = Math.max(minTranslateX, Math.min(maxTranslateX, transform.x));
        const constrainedY = Math.max(minTranslateY, Math.min(maxTranslateY, transform.y));
        
        return transform.k === 1 && Math.abs(constrainedX) < 10 && Math.abs(constrainedY) < 10
            ? d3.zoomIdentity // Snap to center at 1:1 zoom
            : d3.zoomIdentity.translate(constrainedX, constrainedY).scale(transform.k);
    }

    // Expose zoom functions for external control
    if (typeof window !== 'undefined') {
        (window as any).sankeyZoomFunctions = {
            zoomIn,
            zoomOut,
            zoomToFit,
            resetZoom,
            panDirection,
            getCurrentZoom: () => currentZoomTransform.k
        };
    }

</script>

<div class="sankey-container" 
     bind:this={container}
     tabindex="0"
     role="application"
     aria-label="Interactive Sankey diagram with zoom and pan controls"
     style="--hover-link-opacity: {OPACITY.CSS_HOVER_LINK}; --hover-node-opacity: {OPACITY.CSS_HOVER_NODE}; --shadow-light-opacity: {OPACITY.SHADOW_LIGHT}; --shadow-medium-opacity: {OPACITY.SHADOW_MEDIUM}">
    {#if !sankeyData.nodes.length}
        <div class="empty-state">
            <p>{$t('session.empty-states.no-data')}</p>
        </div>
    {:else}
        <ZoomControls
            {isMobile}
            currentZoom={currentZoomTransform.k}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomToFit={zoomToFit}
            onResetZoom={resetZoom}
        />
    {/if}
</div>

<!-- Persistent tooltip component -->
{#if tooltipData.visible}
    <div class="link-tooltip" style="left: {tooltipData.x}px; top: {tooltipData.y}px; transform: translate(-50%, -50%);">
        <LinkTooltip 
            relationshipType={tooltipData.relationshipType}
            relationshipLabel={tooltipData.relationshipLabel}
            actions={tooltipData.actions}
            {isMobile}
        />
    </div>
{/if}

<style>
    .sankey-container {
        width: 100%;
        height: 100%;
        min-height: 400px;
        min-width: 300px;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        touch-action: none; /* Prevent browser default touch behaviors */
        user-select: none; /* Prevent text selection during pan */
    }

    .sankey-container:focus {
        outline: 2px solid rgba(59, 130, 246, 0.5);
        outline-offset: -2px;
    }

    .sankey-container:focus-visible {
        outline: 2px solid rgba(59, 130, 246, 0.8);
    }

    .link-tooltip {
        position: fixed;
        z-index: 1000;
        pointer-events: none;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 8px;
        font-size: 12px;
        max-width: 300px;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-secondary, #6b7280);
        font-size: 14px;
    }

    /* Global styles for D3 elements */
    :global(.sankey-container .link) {
        transition: stroke-opacity 0.2s ease;
    }

    :global(.sankey-container .link:hover) {
        stroke-opacity: var(--hover-link-opacity, 0.8) !important;
    }

    :global(.sankey-container .node) {
        transition: opacity 0.2s ease;
    }

    :global(.sankey-container .node:hover) {
        opacity: var(--hover-node-opacity, 0.9);
    }

    :global(.sankey-container .node-rect) {
        filter: drop-shadow(0 2px 4px rgba(0,0,0,var(--shadow-light-opacity, 0.1)));
        transition: filter 0.2s ease;
    }

    :global(.sankey-container .node:hover .node-rect) {
        filter: drop-shadow(0 4px 8px rgba(0,0,0,var(--shadow-medium-opacity, 0.2)));
    }

    :global(.sankey-container .node-label) {
        user-select: none;
    }

    /* Mobile touch targets */
    @media (pointer: coarse) {
        :global(.sankey-container .node) {
            min-width: 44px;
            min-height: 44px;
        }
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
        .sankey-container {
            min-height: 300px;
        }
    }

    /* Focus styles for keyboard navigation - applied via CSS classes */
    :global(.node-html.focused .treatment-node) {
        outline: 2px dashed rgba(59, 130, 246, 0.6);
        outline-offset: 1px;
    }

    :global(.node-html.focused.selected .treatment-node) {
        outline: 2px dashed rgba(59, 130, 246, 0.8);
    }

    :global(.node-html.focused .symptom-node) {
        outline: 2px dashed rgba(34, 197, 94, 0.6);
        outline-offset: 1px;
    }

    :global(.node-html.focused.selected .symptom-node) {
        outline: 2px dashed rgba(34, 197, 94, 0.8);
    }

    :global(.node-html.focused .diagnosis-node) {
        outline: 2px dashed rgba(239, 68, 68, 0.6);
        outline-offset: 1px;
    }

    :global(.node-html.focused.selected .diagnosis-node) {
        outline: 2px dashed rgba(239, 68, 68, 0.8);
    }

    /* Fallback styles for action nodes or unknown types */
    :global(.sankey-node) {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 6px;
        padding: 6px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        font-family: system-ui, sans-serif;
        border: 2px solid rgba(255, 255, 255, 0.3);
        text-align: center;
    }

    :global(.sankey-node .node-content) {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
    }

    :global(.sankey-node .node-title) {
        font-weight: 600;
        color: #1f2937;
        line-height: 1.2;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 11px;
    }

    /* Link animation now handled by global CSS in session.css */

    :global(.node.connected-to-selected) {
        filter: none !important; /* Remove grayscale for connected nodes */
        opacity: 1.0 !important; /* Ensure full opacity */
    }

    /* 
       Note: Node interactive styles (hover, selected, connected-to-selected) 
       and link animations are now handled by src/css/session.css 
    */

</style>