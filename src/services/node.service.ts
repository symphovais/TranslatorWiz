import { ContentfulConfig } from '../types/config.types';
import { Translation } from '../types/contentful.types';
import { TextNodeInfo, FieldMapping } from '../types/figma.types';

/**
 * Get count of text nodes matching the configured pattern
 * @param config - Contentful configuration with NODE_NAME_PATTERN
 * @returns Number of translatable nodes found
 */
export function getTranslatableNodeCount(config: ContentfulConfig): number {
  try {
    if (!figma.currentPage) return 0;

    const pattern = new RegExp(config.NODE_NAME_PATTERN);

    // Use findAllWithCriteria for faster search
    const allTextNodes = figma.currentPage.findAllWithCriteria({
      types: ['TEXT']
    }) as TextNode[];

    // Filter by pattern
    const textNodes = allTextNodes.filter(n => n.name && pattern.test(n.name));
    return textNodes.length;
  } catch (error) {
    console.error('Error counting translatable nodes:', error);
    return 0;
  }
}

/**
 * Get all text nodes on the current page
 * @returns Array of text node info objects
 */
export function getAllTextNodes(): TextNodeInfo[] {
  // Use findAllWithCriteria for faster search
  const textNodes = figma.currentPage.findAllWithCriteria({
    types: ['TEXT']
  }) as TextNode[];

  return textNodes.map(node => ({
    id: node.id,
    name: node.name,
    characters: node.characters
  }));
}

/**
 * Get translatable nodes matching the pattern from config
 * @param config - Contentful configuration with NODE_NAME_PATTERN
 * @returns Array of text node info objects matching the pattern
 */
export function getTranslatableNodes(config: ContentfulConfig): TextNodeInfo[] {
  const pattern = new RegExp(config.NODE_NAME_PATTERN);

  // Use findAll with filter to get all TEXT nodes matching the pattern
  const textNodes = figma.currentPage.findAll((n) =>
    n.type === 'TEXT' && pattern.test(n.name)
  ) as TextNode[];

  return textNodes.map(node => ({
    id: node.id,
    name: node.name,
    characters: node.characters
  }));
}

/**
 * Apply translations to matching text nodes
 * @param translations - Array of key-value translations
 * @param config - Contentful configuration
 * @returns Number of nodes updated
 * @throws Error if no nodes found or all translations failed
 */
export async function applyTranslations(translations: Translation[], config: ContentfulConfig): Promise<number> {
  const translationMap = new Map<string, string>();
  for (const t of translations) {
    if (t.key && t.value) {
      translationMap.set(t.key, t.value);
    }
  }

  const pattern = new RegExp(config.NODE_NAME_PATTERN);

  // Use findAllWithCriteria for faster search
  const allTextNodes = figma.currentPage.findAllWithCriteria({
    types: ['TEXT']
  }) as TextNode[];

  const textNodes = allTextNodes.filter(n => pattern.test(n.name));

  if (textNodes.length === 0) {
    throw new Error('No translatable text nodes found on current page');
  }

  let count = 0;
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const node of textNodes) {
    // Check if node is locked
    if (node.locked) {
      skipped.push(`${node.name}: Locked`);
      continue;
    }

    const translation = translationMap.get(node.name);
    if (translation) {
      try {
        // Handle mixed fonts in text nodes
        if (node.hasMissingFont) {
          errors.push(`${node.name}: Missing font`);
          continue;
        }

        // Load all unique fonts in the text node
        const fontName = node.fontName;
        if (fontName === figma.mixed) {
          // Text has mixed fonts, load all ranges
          const uniqueFonts = new Set<string>();
          for (let i = 0; i < node.characters.length; i++) {
            const font = node.getRangeFontName(i, i + 1) as FontName;
            uniqueFonts.add(`${font.family}:${font.style}`);
            await figma.loadFontAsync(font);
          }
        } else {
          await figma.loadFontAsync(fontName as FontName);
        }

        node.characters = translation;
        count++;
      } catch (fontError) {
        errors.push(`${node.name}: ${fontError instanceof Error ? fontError.message : 'Font error'}`);
      }
    }
  }

  if (count === 0) {
    if (errors.length > 0) {
      throw new Error(`Translation failed: ${errors[0]}`);
    }
    if (skipped.length > 0) {
      throw new Error(`All nodes skipped: ${skipped[0]}`);
    }
    throw new Error('No matching translations found for text nodes');
  }

  return count;
}

/**
 * Apply record field values to mapped nodes
 * @param mappings - Array of field-to-node mappings
 * @param recordFields - Record field values to apply
 */
export async function applyRecordToNodes(mappings: FieldMapping[], recordFields: Record<string, unknown>): Promise<void> {
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      const node = await figma.getNodeByIdAsync(mapping.node) as TextNode | null;

      if (!node || node.type !== 'TEXT') {
        errors.push(`Node not found: ${mapping.node}`);
        continue;
      }

      if (node.locked) {
        errors.push(`Node is locked: ${node.name}`);
        continue;
      }

      const fieldValue = recordFields[mapping.field];
      if (fieldValue === undefined || fieldValue === null) {
        continue; // Skip if field value doesn't exist
      }

      const textValue = String(fieldValue);

      // Handle fonts
      if (node.hasMissingFont) {
        errors.push(`Missing font in node: ${node.name}`);
        continue;
      }

      const fontName = node.fontName;
      if (fontName === figma.mixed) {
        // Text has mixed fonts, load all ranges
        const uniqueFonts = new Set<string>();
        for (let i = 0; i < node.characters.length; i++) {
          const font = node.getRangeFontName(i, i + 1) as FontName;
          uniqueFonts.add(`${font.family}:${font.style}`);
          await figma.loadFontAsync(font);
        }
      } else {
        await figma.loadFontAsync(fontName as FontName);
      }

      node.characters = textValue;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error applying to node: ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Some mappings failed:', errors);
  }
}

/**
 * Update multiple nodes with the same text value
 * @param nodeIds - Array of node IDs to update
 * @param newText - Text to apply to all nodes
 * @returns Result with success count and any errors
 */
export async function updateMultipleNodes(nodeIds: string[], newText: string): Promise<{
  success: boolean;
  count: number;
  errors?: string[];
  error?: string;
}> {
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    return {
      success: false,
      count: 0,
      error: 'Invalid node IDs'
    };
  }

  let successCount = 0;
  const errors: string[] = [];

  for (const nodeId of nodeIds) {
    try {
      const node = await figma.getNodeByIdAsync(nodeId);

      if (!node || !('type' in node) || node.type !== 'TEXT') {
        errors.push(`Node ${nodeId}: Not found or not a text node`);
        continue;
      }

      const textNode = node as TextNode;

      if (textNode.hasMissingFont) {
        errors.push(`${node.name}: Missing font`);
        continue;
      }

      // Load fonts (handle mixed fonts)
      const fontName = textNode.fontName;
      if (fontName === figma.mixed) {
        // Text has mixed fonts, load all ranges
        for (let i = 0; i < textNode.characters.length; i++) {
          const font = textNode.getRangeFontName(i, i + 1) as FontName;
          await figma.loadFontAsync(font);
        }
      } else {
        await figma.loadFontAsync(fontName as FontName);
      }

      // Update the text
      textNode.characters = newText;
      successCount++;

    } catch (nodeError) {
      const errorMsg = nodeError instanceof Error ? nodeError.message : String(nodeError);
      errors.push(`Node ${nodeId}: ${errorMsg}`);
    }
  }

  return {
    success: successCount > 0,
    count: successCount,
    errors: errors.length > 0 ? errors : undefined,
    error: successCount === 0 ? errors[0] : undefined
  };
}

/**
 * Select a node in Figma and scroll to it
 * @param nodeId - ID of the node to select
 */
export async function selectNode(nodeId: string): Promise<void> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node && 'type' in node) {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  } catch (error) {
    console.error('Error selecting node:', error);
  }
}
