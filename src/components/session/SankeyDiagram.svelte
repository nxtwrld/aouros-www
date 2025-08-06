<script lang="ts">
    import { onMount, afterUpdate } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import * as d3 from 'd3';
    import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
    import type { SessionAnalysis, SankeyNode, SankeyLink, NodeSelectEvent, LinkSelectEvent } from './types/visualization';
    import { transformToSankeyData, calculateNodeSize, getLinkColor } from './utils/sankeyDataTransformer';

    export let data: SessionAnalysis;
    export let isMobile: boolean = false;
    export let selectedNodeId: string | null = null;

    const dispatch = createEventDispatcher<{
        nodeSelect: NodeSelectEvent;
        linkSelect: LinkSelectEvent;
    }>();

    let container: HTMLElement;
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    let width: number = 800;
    let height: number = 600;
    let sankeyData = transformToSankeyData(data);
    let hoveredNodeId: string | null = null;
    let hoveredLink: any = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

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
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    });

    afterUpdate(() => {
        if (svg && sankeyData) {
            renderSankey();
        }
    });

    $: if (data) {
        sankeyData = transformToSankeyData(data);
        if (svg) renderSankey();
    }

    function initializeSankey() {
        if (!container) return;
        
        // Use both methods to ensure we get the correct width
        const bounds = container.getBoundingClientRect();
        width = Math.max(bounds.width, container.offsetWidth || 0);
        height = Math.max(bounds.height, container.offsetHeight || 0);
        
        console.log('InitializeSankey dimensions:', {
            boundsWidth: bounds.width,
            offsetWidth: container.offsetWidth,
            computedWidth: width,
            containerStyle: window.getComputedStyle(container).width
        });

        // Clear any existing SVG
        d3.select(container).selectAll('*').remove();

        svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Add zoom and pan for mobile
        if (isMobile) {
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.3, 3])
                .on('zoom', (event) => {
                    svg.select('g.main-group')
                        .attr('transform', event.transform);
                });

            svg.call(zoom);
        }

        // Main group for all elements
        svg.append('g')
            .attr('class', 'main-group')
            .attr('transform', `translate(${margins.left}, ${margins.top})`);

        renderSankey();
    }

    function renderSankey() {
        if (!svg || !sankeyData) {
            console.warn('Missing svg or sankeyData:', { svg: !!svg, sankeyData: !!sankeyData });
            return;
        }

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

        // Debug logging
        console.log('Rendering Sankey with data:', {
            nodes: sankeyData.nodes.length,
            links: sankeyData.links.length,
            width: width,
            height: height,
            containerWidth: container?.getBoundingClientRect().width,
            nodeTypes: sankeyData.nodes.map(n => n.type),
            linkTypes: sankeyData.links.map(l => l.type),
            nodeDetails: sankeyData.nodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
            linkDetails: sankeyData.links.map(l => ({ source: l.source, target: l.target, value: l.value }))
        });

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
        
        console.log('Layout calculations:', {
            availableWidth,
            columnWidth,
            columnCenterX,
            htmlNodeWidth,
            htmlNodeHeight
        });
        
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

            console.log('Input to D3 Sankey:', {
                nodes: nodesForD3.length,
                links: linksForD3.length,
                firstNode: nodesForD3[0],
                firstLink: linksForD3[0]
            });

            sankeyResult = sankeyGenerator({
                nodes: nodesForD3,
                links: linksForD3
            });

            console.log('D3 Sankey result (before override):', {
                nodes: sankeyResult.nodes?.length,
                links: sankeyResult.links?.length,
                firstProcessedNode: sankeyResult.nodes?.[0]
            });

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
                    
                    console.log(`Fixed node ${node.id} (${node.type}): column ${node.column} -> ${targetColumn}, x: ${node.x0}-${node.x1}`);
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
                        const nodeHeight = Math.max(30, node.value || 50); // Use our calculated value for height
                        node.y0 = currentY;
                        node.y1 = currentY + nodeHeight;
                        currentY = node.y1 + (isMobile ? 8 : 12); // Add padding between nodes
                        
                        console.log(`Positioned node ${node.id}: y ${node.y0}-${node.y1} (height: ${nodeHeight}, value: ${node.value})`);
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
                            
                            console.log(`Updated link ${sourceNode.id} -> ${targetNode.id}: y ${link.y0} -> ${link.y1}, width: ${link.width}`);
                        }
                    });
                }
            }

            console.log('D3 Sankey result (after override):', {
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
            });
        } catch (error) {
            console.error('Error in D3 Sankey generation:', error);
            return;
        }

        if (!sankeyResult || !sankeyResult.nodes || !sankeyResult.links) {
            console.error('Invalid sankeyResult:', sankeyResult);
            return;
        }

        // Render links
        const linkSelection = mainGroup
            .selectAll('.link')
            .data(sankeyResult.links, (d: any) => `${d.source.id}-${d.target.id}`);

        linkSelection.enter()
            .append('path')
            .attr('class', 'link')
            .merge(linkSelection as any)
            .attr('d', sankeyLinkHorizontal())
            .style('stroke', '#000000') // Black color for all links
            .style('stroke-width', (d: any) => Math.max(1, d.width || 2))
            .style('stroke-opacity', 0.2) // Low opacity by default
            .style('fill', 'none')
            .style('cursor', 'pointer')
            .attr('data-relationship-type', (d: any) => d.type || 'default')
            .on('click', (event: MouseEvent, d: any) => handleLinkClick(event, d))
            .on('touchstart', (event: TouchEvent, d: any) => handleLinkClick(event, d))
            .on('mouseenter', (event: MouseEvent, d: any) => handleLinkHover(d, true))
            .on('mouseleave', (event: MouseEvent, d: any) => handleLinkHover(d, false));

        linkSelection.exit().remove();

        // Render nodes
        const nodeSelection = mainGroup
            .selectAll('.node')
            .data(sankeyResult.nodes, (d: any) => d.id);

        const nodeEnter = nodeSelection.enter()
            .append('g')
            .attr('class', 'node')
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
            .html((d: any) => createNodeHTML(d))
            .on('click', (event: MouseEvent, d: any) => handleNodeClick(event, d))
            .on('touchstart', (event: TouchEvent, d: any) => handleNodeClick(event, d))
            .on('mouseenter', (event: MouseEvent, d: any) => handleNodeHover(d.id, true))
            .on('mouseleave', (event: MouseEvent, d: any) => handleNodeHover(d.id, false));

        // Priority indicators are now included in HTML content

        // Update positions
        nodeSelection
            .merge(nodeEnter as any)
            .attr('transform', (d: any) => `translate(${d.x0}, ${d.y0})`);

        nodeSelection.exit().remove();
    }

    function createNodeHTML(node: SankeyNode): string {
        const isSelected = node.id === selectedNodeId;
        const typeLabel = node.type.charAt(0).toUpperCase() + node.type.slice(1);
        
        const selectedClass = isSelected ? 'selected' : '';
        const typeClass = `node-${node.type}`;
        const sizeClass = isMobile ? 'mobile' : 'desktop';
        
        return `
            <div class="sankey-node ${typeClass} ${selectedClass} ${sizeClass}" style="background-color: ${node.color};">
                <div class="node-header">
                    <div class="node-indicators">
                        ${node.priority <= 2 ? `<div class="priority-indicator priority-${node.priority}" style="background-color: ${getPriorityColor(node.priority)};"></div>` : ''}
                        ${node.type === 'symptom' && node.source ? `<div class="source-indicator source-${node.source}" style="background-color: ${getSourceColor(node.source)};"></div>` : ''}
                    </div>
                    ${node.confidence ? `<div class="node-confidence">${Math.round(node.confidence * 100)}%</div>` : ''}
                </div>
                <div class="node-content">
                    <div class="node-title">${truncateText(node.name, isMobile ? 20 : 25)}</div>
                </div>
            </div>
        `;
    }

    function getPriorityColor(priority: number): string {
        if (priority <= 2) return '#dc2626'; // Red for critical
        if (priority <= 4) return '#ea580c'; // Orange for high  
        if (priority <= 6) return '#3b82f6'; // Blue for medium
        return '#10b981'; // Green for low
    }

    function handleNodeClick(event: MouseEvent | TouchEvent, node: SankeyNode) {
        event.preventDefault();
        event.stopPropagation();
        
        dispatch('nodeSelect', {
            nodeId: node.id,
            node: node,
            event: event
        });
    }

    function handleLinkClick(event: MouseEvent | TouchEvent, link: SankeyLink) {
        event.preventDefault();
        event.stopPropagation();
        
        dispatch('linkSelect', {
            link: link,
            event: event
        });
    }

    function handleLinkHover(link: any, isEntering: boolean) {
        hoveredLink = isEntering ? link : null;
        
        // Remove any existing action tooltips
        if (svg) {
            svg.selectAll('.link-actions-tooltip').remove();
            
            if (hoveredLink) {
                // Show actions for both diagnostic and treatment links
                const sourceNode = hoveredLink.source;
                const targetNode = hoveredLink.target;
                
                // Only show actions for symptom->diagnosis or diagnosis->treatment links
                if ((sourceNode.type === 'symptom' && targetNode.type === 'diagnosis') ||
                    (sourceNode.type === 'diagnosis' && targetNode.type === 'treatment')) {
                    
                    // Find related actions for this link
                    const relatedActions = getRelatedActions(hoveredLink);
                    
                    if (relatedActions.length > 0) {
                        // Calculate middle point of the link
                        const midX = (sourceNode.x1 + targetNode.x0) / 2;
                        const midY = (hoveredLink.y0 + hoveredLink.y1) / 2;
                        
                        // Create HTML content for actions
                        const actionsHTML = createActionsHTML(relatedActions);
                        
                        // Add foreignObject for HTML content
                        svg.select('g.main-group')
                            .append('foreignObject')
                            .attr('class', 'link-actions-tooltip')
                            .attr('x', midX - (isMobile ? 100 : 150))
                            .attr('y', midY - (relatedActions.length * (isMobile ? 12 : 15)) / 2)
                            .attr('width', isMobile ? 200 : 300)
                            .attr('height', relatedActions.length * (isMobile ? 24 : 30) + 10)
                            .style('pointer-events', 'none')
                            .html(actionsHTML);
                    }
                }
            }
        }
    }

    function getRelatedActions(link: any): any[] {
        const sourceNode = link.source;
        const targetNode = link.target;
        const sourceId = typeof sourceNode === 'object' ? sourceNode.id : sourceNode;
        const targetId = typeof targetNode === 'object' ? targetNode.id : targetNode;
        
        const actions = data.nodes?.actions || [];
        
        const relatedActions = actions.filter(action => {
            if (!action.relationships) return false;
            
            // For symptom->diagnosis links: show diagnostic questions
            if (sourceNode.type === 'symptom' && targetNode.type === 'diagnosis') {
                // Include actions that relate to either the symptom or the diagnosis
                return action.relationships.some(rel => 
                    rel.nodeId === sourceId || rel.nodeId === targetId
                ) && action.actionType === 'question'; // Only diagnostic questions
            }
            
            // For diagnosis->treatment links: show treatment-related actions (alerts, contraindications)
            if (sourceNode.type === 'diagnosis' && targetNode.type === 'treatment') {
                // Include actions that relate to the treatment
                return action.relationships.some(rel => 
                    rel.nodeId === targetId
                ); // Both questions and alerts for treatments
            }
            
            return false;
        });
        
        // Sort by priority (1 = highest priority)
        return relatedActions.sort((a, b) => (a.priority || 10) - (b.priority || 10));
    }

    function createActionsHTML(actions: any[]): string {
        const actionItems = actions.map(action => {
            const priorityClass = action.priority <= 2 ? 'high-priority' : 'normal-priority';
            const typeClass = action.actionType === 'alert' ? 'action-alert' : 'action-question';
            
            return `
                <div class="action-item ${priorityClass} ${typeClass}">
                    <div class="action-text">${truncateText(action.text, isMobile ? 30 : 45)}</div>
                    <div class="action-meta">
                        <span class="action-type">${action.actionType}</span>
                        <span class="action-priority">P${action.priority || 5}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="actions-tooltip">
                ${actionItems}
            </div>
        `;
    }

    function handleNodeHover(nodeId: string, isEntering: boolean) {
        hoveredNodeId = isEntering ? nodeId : null;
        
        if (svg) {
            // Get connected node IDs for the hovered node
            const connectedNodeIds = new Set<string>();
            connectedNodeIds.add(nodeId); // Include the hovered node itself
            
            if (hoveredNodeId) {
                svg.selectAll('.link').each((d: any) => {
                    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                    
                    if (sourceId === nodeId) connectedNodeIds.add(targetId);
                    if (targetId === nodeId) connectedNodeIds.add(sourceId);
                });
            }
            
            // Update all nodes based on hover state
            svg.selectAll('.node')
                .style('opacity', (d: any) => {
                    if (!hoveredNodeId) return 1.0; // Default full opacity
                    
                    // If this node is connected to the hovered node, keep it visible
                    if (connectedNodeIds.has(d.id)) {
                        return 1.0;
                    }
                    
                    return 0.3; // Dim unconnected nodes
                })
                .style('filter', (d: any) => {
                    if (!hoveredNodeId) return 'none'; // No filter by default
                    
                    // If this node is connected, no filter
                    if (connectedNodeIds.has(d.id)) {
                        return 'none';
                    }
                    
                    return 'grayscale(0.8)'; // Gray out unconnected nodes
                });
            
            // Update all links based on hover state
            svg.selectAll('.link')
                .style('stroke', (d: any) => {
                    if (!hoveredNodeId) return '#000000'; // Default black
                    
                    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                    
                    // If this link is connected to the hovered node, show in color
                    if (sourceId === hoveredNodeId || targetId === hoveredNodeId) {
                        // For treatment links, use the diagnosis color
                        if (typeof d.target === 'object' && d.target.type === 'treatment') {
                            return typeof d.source === 'object' ? d.source.color : getLinkColor(d.type || 'default');
                        }
                        return getLinkColor(d.type || 'default');
                    }
                    
                    return '#000000'; // Keep other links black
                })
                .style('stroke-opacity', (d: any) => {
                    if (!hoveredNodeId) return 0.2; // Default low opacity
                    
                    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
                    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
                    
                    // If this link is connected to the hovered node, highlight it
                    if (sourceId === hoveredNodeId || targetId === hoveredNodeId) {
                        return 0.9;
                    }
                    
                    return 0.2; // Keep other links at low opacity
                });
        }
    }

    function handleResize() {
        if (!container) return;
        
        // Debounce resize events
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
            const bounds = container.getBoundingClientRect();
            const newWidth = Math.max(bounds.width, container.offsetWidth || 0);
            const newHeight = Math.max(bounds.height, container.offsetHeight || 0);
            
            console.log('Resize detected:', { 
                oldWidth: width, 
                newWidth: newWidth,
                oldHeight: height,
                newHeight: newHeight,
                boundsWidth: bounds.width,
                offsetWidth: container.offsetWidth
            });
            
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                
                if (svg) {
                    svg.attr('viewBox', `0 0 ${width} ${height}`);
                    renderSankey();
                }
            }
        }, 100);
    }

    function truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    function getSourceColor(source: string): string {
        switch (source) {
            case 'transcript': return '#10b981';
            case 'medical_history': return '#3b82f6';
            case 'family_history': return '#8b5cf6';
            case 'social_history': return '#f59e0b';
            case 'medication_history': return '#06b6d4';
            case 'suspected': return '#f97316';
            default: return '#6b7280';
        }
    }
</script>

<div class="sankey-container" bind:this={container}>
    {#if !sankeyData.nodes.length}
        <div class="empty-state">
            <p>No data to visualize</p>
        </div>
    {/if}
</div>

<style>
    .sankey-container {
        width: 100%;
        height: 100%;
        min-height: 400px;
        min-width: 300px;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
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
        stroke-opacity: 0.8 !important;
    }

    :global(.sankey-container .node) {
        transition: opacity 0.2s ease;
    }

    :global(.sankey-container .node:hover) {
        opacity: 0.9;
    }

    :global(.sankey-container .node-rect) {
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        transition: filter 0.2s ease;
    }

    :global(.sankey-container .node:hover .node-rect) {
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
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

    /* Sankey Node HTML Styles */
    :global(.sankey-node) {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 6px;
        padding: 6px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        font-family: system-ui, sans-serif;
        border: 1px solid #333;
    }

    :global(.sankey-node.selected) {
        border-width: 3px;
        border-color: var(--color-primary, #3b82f6);
    }

    :global(.sankey-node .node-header) {
        position: absolute;
        top: 2px;
        right: 2px;
        left: 2px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 16px;
        pointer-events: none;
    }

    :global(.sankey-node .node-indicators) {
        display: flex;
        gap: 4px;
        align-items: center;
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
        color: #333;
        line-height: 1.2;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
    }

    :global(.sankey-node .node-confidence) {
        color: #666;
        font-size: 0.75em;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.8);
        padding: 1px 4px;
        border-radius: 3px;
    }

    /* Priority Indicator */
    :global(.sankey-node .priority-indicator) {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        flex-shrink: 0;
    }

    /* Source Indicator */
    :global(.sankey-node .source-indicator) {
        width: 4px;
        height: 16px;
        border-radius: 2px;
        opacity: 0.8;
        flex-shrink: 0;
    }

    /* Responsive sizing */
    :global(.sankey-node.mobile .node-title) {
        font-size: 10px;
    }

    :global(.sankey-node.mobile .node-confidence) {
        font-size: 8px;
    }

    :global(.sankey-node.desktop .node-title) {
        font-size: 12px;
    }

    :global(.sankey-node.desktop .node-confidence) {
        font-size: 9px;
    }

    /* Node Type Variations - placeholder for future styling */
    /* :global(.sankey-node.node-symptom) { } */
    /* :global(.sankey-node.node-diagnosis) { } */
    /* :global(.sankey-node.node-treatment) { } */

    /* Action Tooltip Styles */
    :global(.actions-tooltip) {
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #333;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: system-ui, sans-serif;
        max-height: 200px;
        overflow-y: auto;
    }

    :global(.action-item) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 6px;
        margin-bottom: 4px;
        border-radius: 3px;
        font-size: 11px;
        line-height: 1.3;
    }

    :global(.action-item:last-child) {
        margin-bottom: 0;
    }

    :global(.action-item.high-priority) {
        background: rgba(220, 38, 38, 0.2);
        border-left: 3px solid #dc2626;
    }

    :global(.action-item.normal-priority) {
        background: rgba(107, 114, 128, 0.2);
        border-left: 3px solid #6b7280;
    }

    :global(.action-item.action-alert) {
        border-left-color: #ef4444;
    }

    :global(.action-item.action-question) {
        border-left-color: #3b82f6;
    }

    :global(.action-text) {
        color: #fff;
        flex: 1;
        margin-right: 8px;
        font-weight: 500;
    }

    :global(.action-meta) {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-shrink: 0;
    }

    :global(.action-type) {
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 2px;
        text-transform: uppercase;
        font-weight: 600;
    }

    :global(.action-alert .action-type) {
        background: #ef4444;
        color: white;
    }

    :global(.action-question .action-type) {
        background: #3b82f6;
        color: white;
    }

    :global(.action-priority) {
        font-size: 9px;
        color: #9ca3af;
        font-weight: 500;
    }

    /* Mobile adjustments */
    @media (max-width: 640px) {
        :global(.actions-tooltip) {
            padding: 6px;
            max-height: 150px;
        }

        :global(.action-item) {
            font-size: 10px;
            padding: 3px 4px;
        }

        :global(.action-type), :global(.action-priority) {
            font-size: 8px;
        }
    }
</style>