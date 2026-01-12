/**
 * Information about a Figma text node
 */
export interface TextNodeInfo {
  id: string;
  name: string;
  characters: string;
}

/**
 * Mapping between a Contentful field and a Figma node
 */
export interface FieldMapping {
  field: string;
  node: string;
  contentTypeId?: string;
}
