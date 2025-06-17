// Smart analysis merger for gradual refinement without jumpy UI
export interface MergedItem {
    id: string;
    data: any;
    confidence?: number;
    isNew: boolean;
    isUpdated: boolean;
    updateCount: number;
    firstSeen: number;
    lastUpdated: number;
}

export interface MergeResult {
    items: MergedItem[];
    hasNewItems: boolean;
    hasUpdatedItems: boolean;
    summary: {
        added: number;
        updated: number;
        total: number;
    };
}

// Generate stable ID based on item content
function generateStableId(item: any, type: string): string {
    const keyContent = type === 'diagnosis' ? item.name?.toLowerCase() :
                      type === 'treatment' ? item.description?.toLowerCase() :
                      type === 'medication' ? `${item.name}_${item.dosage}`.toLowerCase() :
                      type === 'followUp' ? item.name?.toLowerCase() :
                      type === 'clarifyingQuestions' ? item.question?.toLowerCase() :
                      type === 'doctorRecommendations' ? item.recommendation?.toLowerCase() :
                      JSON.stringify(item).toLowerCase();
    
    // Simple hash for stable ID generation
    let hash = 0;
    if (keyContent) {
        for (let i = 0; i < keyContent.length; i++) {
            const char = keyContent.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
    }
    return `${type}_${Math.abs(hash).toString(36)}`;
}

// Check if two items are similar enough to be considered the same
function areItemsSimilar(item1: any, item2: any, type: string): boolean {
    const threshold = 0.8; // 80% similarity threshold
    
    const getKeyText = (item: any) => {
        switch (type) {
            case 'diagnosis': return item.name?.toLowerCase() || '';
            case 'treatment': return item.description?.toLowerCase() || '';
            case 'medication': return `${item.name} ${item.dosage}`.toLowerCase();
            case 'followUp': return item.name?.toLowerCase() || '';
            case 'clarifyingQuestions': return item.question?.toLowerCase() || '';
            case 'doctorRecommendations': return item.recommendation?.toLowerCase() || '';
            default: return JSON.stringify(item).toLowerCase();
        }
    };
    
    const text1 = getKeyText(item1);
    const text2 = getKeyText(item2);
    
    if (!text1 || !text2) return false;
    
    // Simple similarity check - you could enhance this with more sophisticated algorithms
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return true;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length >= threshold;
}

// Simple Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    return track[str2.length][str1.length];
}

export class AnalysisMerger {
    private mergedItems: Map<string, Map<string, MergedItem>> = new Map();
    
    constructor() {
        // Initialize collections for each item type
        const itemTypes = ['diagnosis', 'treatment', 'medication', 'followUp', 'clarifyingQuestions', 'doctorRecommendations'];
        itemTypes.forEach(type => {
            this.mergedItems.set(type, new Map());
        });
    }
    
    // Merge new analysis with existing items
    mergeItemArray(newItems: any[], type: string): MergeResult {
        const existingItems = this.mergedItems.get(type) || new Map();
        const result: MergeResult = {
            items: [],
            hasNewItems: false,
            hasUpdatedItems: false,
            summary: { added: 0, updated: 0, total: 0 }
        };
        
        const now = Date.now();
        const processedIds = new Set<string>();
        
        // Process new items
        for (const newItem of newItems || []) {
            const newId = generateStableId(newItem, type);
            let merged: MergedItem;
            
            // Check if this item already exists (by ID or similarity)
            if (existingItems.has(newId)) {
                // Direct match by ID
                const existing = existingItems.get(newId)!;
                merged = {
                    ...existing,
                    data: { ...existing.data, ...newItem }, // Merge data
                    confidence: newItem.probability || newItem.confidence || existing.confidence,
                    isNew: false,
                    isUpdated: true,
                    updateCount: existing.updateCount + 1,
                    lastUpdated: now
                };
                result.hasUpdatedItems = true;
                result.summary.updated++;
            } else {
                // Check for similar items
                const similarItem = Array.from(existingItems.values()).find(item => 
                    areItemsSimilar(item.data, newItem, type)
                );
                
                if (similarItem) {
                    // Update similar item
                    merged = {
                        ...similarItem,
                        data: { ...similarItem.data, ...newItem },
                        confidence: newItem.probability || newItem.confidence || similarItem.confidence,
                        isNew: false,
                        isUpdated: true,
                        updateCount: similarItem.updateCount + 1,
                        lastUpdated: now
                    };
                    // Remove old entry and add with new ID
                    existingItems.delete(similarItem.id);
                    result.hasUpdatedItems = true;
                    result.summary.updated++;
                } else {
                    // New item
                    merged = {
                        id: newId,
                        data: { ...newItem, id: newId }, // Add ID to the data
                        confidence: newItem.probability || newItem.confidence,
                        isNew: true,
                        isUpdated: false,
                        updateCount: 1,
                        firstSeen: now,
                        lastUpdated: now
                    };
                    result.hasNewItems = true;
                    result.summary.added++;
                }
            }
            
            existingItems.set(merged.id, merged);
            processedIds.add(merged.id);
        }
        
        // Collect all items (existing + new/updated)
        result.items = Array.from(existingItems.values()).map(item => ({
            ...item,
            isNew: processedIds.has(item.id) && item.isNew,
            isUpdated: processedIds.has(item.id) && item.isUpdated && !item.isNew
        }));
        
        result.summary.total = result.items.length;
        
        // Update the stored items
        this.mergedItems.set(type, existingItems);
        
        return result;
    }
    
    // Get all items of a specific type
    getItems(type: string): MergedItem[] {
        const items = this.mergedItems.get(type) || new Map();
        return Array.from(items.values());
    }
    
    // Get the actual data array for a type (for use in components)
    getItemsData(type: string): any[] {
        return this.getItems(type).map(item => item.data);
    }
    
    // Clear all stored analysis
    clear(): void {
        this.mergedItems.clear();
        const itemTypes = ['diagnosis', 'treatment', 'medication', 'followUp', 'clarifyingQuestions', 'doctorRecommendations'];
        itemTypes.forEach(type => {
            this.mergedItems.set(type, new Map());
        });
    }
    
    // Get statistics about the current state
    getStats() {
        const stats: any = {};
        for (const [type, items] of this.mergedItems) {
            const itemArray = Array.from(items.values());
            stats[type] = {
                total: itemArray.length,
                new: itemArray.filter(item => item.isNew).length,
                updated: itemArray.filter(item => item.isUpdated).length,
                avgConfidence: itemArray.reduce((sum, item) => sum + (item.confidence || 0), 0) / itemArray.length || 0
            };
        }
        return stats;
    }
} 