import type { BodyPartReference, AnatomySuggestion } from './types.d';
import anatomyObjects from '$components/anatomy/objects.json';
import { chatActions } from './store';
import ui from '$lib/ui';
import focused from '$lib/focused';

// Common body part mappings for natural language processing
const bodyPartMappings: Record<string, string[]> = {
  // Skeletal system
  'knee': ['L_patella', 'R_patella', 'cartilage_knee', 'ligaments_knee'],
  'back': ['lumbar_spine', 'thoracic_spine', 'cervical_spine', 'intervertebral_disks'],
  'spine': ['lumbar_spine', 'thoracic_spine', 'cervical_spine', 'intervertebral_disks'],
  'shoulder': ['L_scapula', 'R_scapula', 'L_clavicle', 'R_clavicle', 'ligaments_shoulder'],
  'hip': ['ilium', 'L_femur', 'R_femur', 'cartilage_hip'],
  'ankle': ['L_talus', 'R_talus', 'cartilage_ankle', 'ligaments_foot'],
  'wrist': ['L_wrist', 'R_wrist', 'ligaments_wrist'],
  'elbow': ['L_humerus', 'R_humerus', 'L_ulna', 'R_ulna', 'cartilage_elbow'],
  
  // Organs
  'heart': ['heart', 'vascular_system'],
  'lungs': ['lungs', 'bronchi'],
  'liver': ['liver_left', 'liver_right', 'liver_ligament'],
  'kidney': ['kidneys', 'ureter'],
  'brain': ['brain', 'skull'],
  'stomach': ['stomach', 'digestive_system'],
  'bladder': ['bladder', 'urethra'],
  
  // Muscular system
  'chest': ['R_pectoralis_major', 'L_pectoralis_major'],
  'arm': ['R_bicep_brachii_long_head', 'L_bicep_brachii_long_head', 'R_triceps_long_head', 'L_triceps_long_head'],
  'leg': ['R_quadriceps', 'L_quadriceps', 'R_hamstring', 'L_hamstring'],
  'abdominal': ['rectus_abdominis', 'external_oblique', 'internal_oblique'],
  
  // Additional mappings
  'foot': ['L_phalanges', 'R_phalanges', 'L_metatarsal_bones', 'R_metatarsal_bones'],
  'hand': ['L_finger_bones', 'R_finger_bones', 'L_metacarpal_bones', 'R_metacarpal_bones'],
  'head': ['skull', 'brain'],
  'neck': ['cervical_spine', 'thyroid'],
  'pelvis': ['ilium', 'pubic_symphysis', 'sacrum'],
};

export class AnatomyIntegration {
  /**
   * Detect body part references in text
   */
  static detectBodyParts(text: string): BodyPartReference[] {
    const lowercaseText = text.toLowerCase();
    const references: BodyPartReference[] = [];

    for (const [commonName, anatomyIds] of Object.entries(bodyPartMappings)) {
      // Check for exact word matches
      const regex = new RegExp(`\\b${commonName}\\b`, 'gi');
      const matches = lowercaseText.match(regex);
      
      if (matches) {
        // Get the first matching anatomy ID for primary reference
        const primaryId = anatomyIds[0];
        
        references.push({
          text: commonName,
          bodyPartId: primaryId,
          confidence: this.calculateConfidence(commonName, text),
        });
      }
    }

    // Also check for direct anatomy object names
    Object.entries(anatomyObjects).forEach(([system, config]) => {
      config.objects.forEach(objectName => {
        if (lowercaseText.includes(objectName.toLowerCase())) {
          references.push({
            text: objectName,
            bodyPartId: objectName,
            confidence: 0.9,
          });
        }
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueReferences = references.filter((ref, index, self) => 
      index === self.findIndex(r => r.bodyPartId === ref.bodyPartId)
    );

    return uniqueReferences.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for body part detection
   */
  private static calculateConfidence(term: string, fullText: string): number {
    const baseConfidence = 0.7;
    const medicalTerms = ['pain', 'ache', 'surgery', 'injury', 'condition', 'problem'];
    const contextBonus = medicalTerms.some(term => fullText.toLowerCase().includes(term)) ? 0.2 : 0;
    
    return Math.min(baseConfidence + contextBonus, 1.0);
  }

  /**
   * Generate anatomy visualization suggestions
   */
  static suggestAnatomyView(bodyParts: BodyPartReference[]): AnatomySuggestion | null {
    if (bodyParts.length === 0) return null;

    const primaryPart = bodyParts[0];
    const system = this.getAnatomySystem(primaryPart.bodyPartId);
    
    return {
      bodyParts,
      suggestion: `I can show you the ${primaryPart.text} on our 3D anatomy model to help you understand better.`,
      actionText: `Show ${primaryPart.text} on 3D model`,
    };
  }

  /**
   * Get anatomy system for a body part
   */
  private static getAnatomySystem(bodyPartId: string): string {
    for (const [system, config] of Object.entries(anatomyObjects)) {
      if (config.objects.includes(bodyPartId)) {
        return system;
      }
    }
    return 'unknown';
  }

  /**
   * Open and focus anatomy model on specific body part
   */
  static async openAndFocus(bodyPartId: string): Promise<void> {
    try {
      // Set focused body part
      focused.set({ object: bodyPartId });
      
      // Update chat state
      chatActions.setFocusedBodyPart(bodyPartId);
      chatActions.toggleAnatomyModel();
      
      // Emit viewer event to open anatomy model
      ui.emit('viewer', { object: bodyPartId });
      
      console.log(`Anatomy model focused on: ${bodyPartId}`);
    } catch (error) {
      console.error('Failed to focus anatomy model:', error);
    }
  }

  /**
   * Sync chat with anatomy model state
   */
  static syncWithChat(anatomyState: any): void {
    if (anatomyState.focused) {
      chatActions.setFocusedBodyPart(anatomyState.focused);
    }
  }

  /**
   * Get related body parts for comprehensive visualization
   */
  static getRelatedBodyParts(bodyPartId: string): string[] {
    // Find which mapping contains this body part
    for (const [commonName, anatomyIds] of Object.entries(bodyPartMappings)) {
      if (anatomyIds.includes(bodyPartId)) {
        return anatomyIds.filter(id => id !== bodyPartId);
      }
    }
    return [];
  }

  /**
   * Check if body part is valid in anatomy model
   */
  static isValidBodyPart(bodyPartId: string): boolean {
    return Object.values(anatomyObjects).some(config => 
      config.objects.includes(bodyPartId)
    );
  }

  /**
   * Get anatomy context for AI chat
   */
  static getAnatomyContext(bodyParts: string[]): any {
    return {
      focusedBodyParts: bodyParts,
      availableSystems: Object.keys(anatomyObjects),
      relatedParts: bodyParts.flatMap(part => this.getRelatedBodyParts(part)),
    };
  }
}

export default AnatomyIntegration;