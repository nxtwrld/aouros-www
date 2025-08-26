/**
 * Sankey Diagram Zoom Utilities
 * Clean, simple zoom functions for D3 Sankey diagrams
 */

import * as d3 from 'd3';

export interface ZoomConfig {
    scaleExtent: [number, number];
    duration: number;
    wheelDelta: number;
    touchDelta: number;
}

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
    scaleExtent: [0.2, 5],
    duration: 300,
    wheelDelta: -0.002,
    touchDelta: 0.1
};

/**
 * Zoom filter to prevent conflicts with node/link interactions
 */
export function zoomFilter(event: any): boolean {
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

/**
 * Transform constraint function to keep content within reasonable bounds
 */
export function constrainTransform(
    transform: d3.ZoomTransform,
    width: number,
    height: number,
    margins: { left: number; right: number; top: number; bottom: number },
    sankeyData: any,
    isMobile: boolean = false
): d3.ZoomTransform {
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

/**
 * Create zoom behavior with proper configuration
 */
export function createZoomBehavior(
    config: ZoomConfig,
    onZoom: (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => void,
    onZoomStart: () => void,
    onZoomEnd: () => void,
    constrainFn: (transform: d3.ZoomTransform) => d3.ZoomTransform
): d3.ZoomBehavior<SVGSVGElement, unknown> {
    return d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent(config.scaleExtent)
        .wheelDelta((event) => {
            // Detect if this is a touchpad/trackpad
            let isTouchpad = false;
            
            if (event.ctrlKey) {
                // Mac touchpad pinch gesture
                isTouchpad = true;
            } else if (Math.abs(event.deltaY) < 50 && event.deltaY % 1 !== 0) {
                // Fractional deltaY values are common for touchpads
                isTouchpad = true;
            } else if ((event as any).wheelDeltaY && Math.abs((event as any).wheelDeltaY) % 3 === 0 && Math.abs((event as any).wheelDeltaY) !== 120) {
                // wheelDeltaY multiples of 3 (but not 120) indicate touchpad
                isTouchpad = true;
            }
            
            if (isTouchpad) {
                // Use touchDelta for touchpad events (make it more sensitive)
                return event.deltaY * config.wheelDelta * (1 + config.touchDelta * 10);
            } else {
                // Regular mouse wheel - use normal wheelDelta
                return event.deltaY * config.wheelDelta;
            }
        })
        .filter(zoomFilter)
        .constrain(constrainFn)
        .on('zoom', onZoom)
        .on('start', onZoomStart)
        .on('end', onZoomEnd);
}

/**
 * Zoom in function
 */
export function zoomIn(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    config: ZoomConfig
) {
    if (!svg || !zoom) return;
    svg.transition()
        .duration(config.duration)
        .call(zoom.scaleBy, 1.5);
}

/**
 * Zoom out function
 */
export function zoomOut(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    config: ZoomConfig
) {
    if (!svg || !zoom) return;
    svg.transition()
        .duration(config.duration)
        .call(zoom.scaleBy, 1 / 1.5);
}

/**
 * Reset zoom to identity
 */
export function resetZoom(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    config: ZoomConfig
) {
    if (!svg || !zoom) return;
    svg.transition()
        .duration(config.duration)
        .call(zoom.transform, d3.zoomIdentity);
}

/**
 * Zoom to fit content
 */
export function zoomToFit(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    config: ZoomConfig,
    width: number,
    height: number,
    sankeyData: any,
    isMobile: boolean = false
) {
    if (!svg || !sankeyData.nodes.length || !zoom) return;
    
    const mainGroupElement = svg.select('.main-group').node() as SVGGElement;
    if (!mainGroupElement) return;
    
    const bounds = mainGroupElement.getBBox();
    
    const padding = isMobile ? 40 : 80;
    const scaleX = (width - padding * 2) / bounds.width;
    const scaleY = (height - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY, config.scaleExtent[1]);
    
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const translateX = width / 2 - scale * centerX;
    const translateY = height / 2 - scale * centerY;
    
    const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
    
    svg.transition()
        .duration(config.duration)
        .call(zoom.transform, transform);
}

/**
 * Pan in a specific direction
 */
export function panBy(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    deltaX: number,
    deltaY: number,
    currentTransform: d3.ZoomTransform
) {
    if (!svg || !zoom) return;
    
    const transform = d3.zoomIdentity
        .translate(currentTransform.x + deltaX, currentTransform.y + deltaY)
        .scale(currentTransform.k);
    
    svg.transition()
        .duration(200)
        .call(zoom.transform, transform);
}