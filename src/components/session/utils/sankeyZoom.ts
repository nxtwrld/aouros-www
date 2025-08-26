/**
 * Sankey Diagram Zoom Utilities
 * Handles zoom, pan, and viewport management
 */

import * as d3 from 'd3';

export interface ZoomConfig {
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    enableDoubleClickZoom: boolean;
    enableWheelZoom: boolean;
}

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
    minZoom: 0.1,
    maxZoom: 4,
    zoomStep: 0.2,
    enableDoubleClickZoom: false,
    enableWheelZoom: true
};

export class ZoomController {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    private config: ZoomConfig;
    private containerWidth: number = 0;
    private containerHeight: number = 0;
    private contentBounds: { width: number; height: number } = { width: 0, height: 0 };
    
    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
        config: Partial<ZoomConfig> = {}
    ) {
        this.svg = svg;
        this.mainGroup = mainGroup;
        this.config = { ...DEFAULT_ZOOM_CONFIG, ...config };
        
        // Initialize zoom behavior
        this.zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([this.config.minZoom, this.config.maxZoom])
            .on('zoom', this.handleZoom.bind(this))
            .on('start', this.handleZoomStart.bind(this))
            .on('end', this.handleZoomEnd.bind(this))
            .filter(this.zoomFilter.bind(this));
        
        // Apply zoom behavior to SVG
        this.svg.call(this.zoom);
    }
    
    private handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        const transform = this.constrainTransform(event.transform);
        this.mainGroup.attr('transform', transform.toString());
    }
    
    private handleZoomStart() {
        this.svg.classed('zooming', true);
    }
    
    private handleZoomEnd() {
        this.svg.classed('zooming', false);
    }
    
    private zoomFilter(event: any): boolean {
        // Allow all events except:
        // - Double click (if disabled)
        // - Wheel events (if disabled)
        if (!this.config.enableDoubleClickZoom && event.type === 'dblclick') {
            return false;
        }
        if (!this.config.enableWheelZoom && event.type === 'wheel') {
            return false;
        }
        
        // Allow wheel events only with ctrl/cmd key
        if (event.type === 'wheel') {
            return event.ctrlKey || event.metaKey;
        }
        
        // Prevent accidental zoom on touch devices
        if (event.touches && event.touches.length < 2) {
            return false;
        }
        
        return true;
    }
    
    private constrainTransform(transform: d3.ZoomTransform): d3.ZoomTransform {
        const scale = transform.k;
        
        // Calculate bounds for panning based on scale
        const scaledWidth = this.contentBounds.width * scale;
        const scaledHeight = this.contentBounds.height * scale;
        
        // Allow panning within reasonable bounds
        const maxTranslateX = Math.max(0, (scaledWidth - this.containerWidth) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - this.containerHeight) / 2);
        
        let x = transform.x;
        let y = transform.y;
        
        // Constrain x
        if (scaledWidth <= this.containerWidth) {
            x = (this.containerWidth - scaledWidth) / 2;
        } else {
            x = Math.min(maxTranslateX, Math.max(-maxTranslateX, x));
        }
        
        // Constrain y
        if (scaledHeight <= this.containerHeight) {
            y = (this.containerHeight - scaledHeight) / 2;
        } else {
            y = Math.min(maxTranslateY, Math.max(-maxTranslateY, y));
        }
        
        return d3.zoomIdentity.translate(x, y).scale(scale);
    }
    
    updateBounds(containerWidth: number, containerHeight: number, contentBounds?: { width: number; height: number }) {
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        if (contentBounds) {
            this.contentBounds = contentBounds;
        }
    }
    
    zoomIn() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy,
            1 + this.config.zoomStep
        );
    }
    
    zoomOut() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy,
            1 - this.config.zoomStep
        );
    }
    
    zoomToFit(padding: number = 0.9) {
        const bounds = (this.mainGroup.node() as SVGGElement).getBBox();
        const fullWidth = this.containerWidth;
        const fullHeight = this.containerHeight;
        const width = bounds.width;
        const height = bounds.height;
        
        if (width === 0 || height === 0) return;
        
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;
        
        const scale = padding * Math.min(fullWidth / width, fullHeight / height);
        const clampedScale = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, scale));
        
        const translate: [number, number] = [
            fullWidth / 2 - clampedScale * midX,
            fullHeight / 2 - clampedScale * midY
        ];
        
        const transform = d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(clampedScale);
        
        this.svg.transition().duration(750).call(
            this.zoom.transform,
            transform
        );
    }
    
    resetZoom() {
        this.svg.transition().duration(750).call(
            this.zoom.transform,
            d3.zoomIdentity
        );
    }
    
    panTo(x: number, y: number) {
        const currentTransform = d3.zoomTransform(this.svg.node() as Element);
        const newTransform = currentTransform.translate(x, y);
        
        this.svg.transition().duration(300).call(
            this.zoom.transform,
            newTransform
        );
    }
    
    panBy(deltaX: number, deltaY: number) {
        const currentTransform = d3.zoomTransform(this.svg.node() as Element);
        const newTransform = currentTransform.translate(deltaX, deltaY);
        
        this.svg.transition().duration(300).call(
            this.zoom.transform,
            newTransform
        );
    }
    
    getCurrentTransform(): { x: number; y: number; scale: number } {
        const transform = d3.zoomTransform(this.svg.node() as Element);
        return {
            x: transform.x,
            y: transform.y,
            scale: transform.k
        };
    }
    
    destroy() {
        // Remove zoom behavior
        this.svg.on('.zoom', null);
    }
}