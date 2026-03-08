/**
 * Parse PostgreSQL array format to JavaScript array
 * PostgreSQL returns array as: {"item1","item2","item3"}
 * This function converts it to: ["item1", "item2", "item3"]
 */
export function parsePostgresArray(value: any): string[] {
  // If already an array, return it
  if (Array.isArray(value)) {
    return value;
  }

  // If null or undefined, return empty array
  if (!value) {
    return [];
  }

  // If it's a string in PostgreSQL array format
  if (typeof value === 'string') {
    // Remove leading/trailing braces
    const trimmed = value.trim();
    
    // Check if it's a PostgreSQL array format
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      // Remove braces
      const content = trimmed.slice(1, -1);
      
      // If empty array
      if (content.trim() === '') {
        return [];
      }
      
      // Split by comma and clean up quotes
      return content
        .split(',')
        .map(item => item.trim())
        .map(item => {
          // Remove quotes if present
          if ((item.startsWith('"') && item.endsWith('"')) || 
              (item.startsWith("'") && item.endsWith("'"))) {
            return item.slice(1, -1);
          }
          return item;
        })
        .filter(item => item.length > 0);
    }
    
    // If it's a single string, wrap it in array
    return [value];
  }

  // Fallback: return empty array
  return [];
}

/**
 * Normalize image_url to always be an array
 * Handles: string, string[], PostgreSQL array format, null, undefined
 */
export function normalizeImageUrls(imageUrl: any): string[] {
  return parsePostgresArray(imageUrl);
}
