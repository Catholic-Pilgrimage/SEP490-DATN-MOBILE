/**
 * Parse PostgreSQL array format to JavaScript array
 * PostgreSQL returns array as: {"item1","item2","item3"}
 * This function converts it to: ["item1", "item2", "item3"]
 */
const sanitizeStringArray = (items: unknown[]): string[] =>
  items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

export function parsePostgresArray(value: any): string[] {
  // If already an array, return it
  if (Array.isArray(value)) {
    return sanitizeStringArray(value);
  }

  // If null or undefined, return empty array
  if (!value) {
    return [];
  }

  // If it's a string in PostgreSQL array format
  if (typeof value === 'string') {
    // Remove leading/trailing braces
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    // Support JSON arrays as well: ["item1","item2"]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return sanitizeStringArray(parsed);
        }
      } catch {
        // Fall through to the PostgreSQL parser below
      }
    }
    
    // Check if it's a PostgreSQL array format
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      // Remove braces
      const content = trimmed.slice(1, -1);
      
      // If empty array
      if (content.trim() === '') {
        return [];
      }
      
      // Split by comma outside quoted values and clean up quotes
      return content
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map(item => item.trim())
        .map(item => {
          // Remove quotes if present
          if ((item.startsWith('"') && item.endsWith('"')) || 
              (item.startsWith("'") && item.endsWith("'"))) {
            return item.slice(1, -1).replace(/\\"/g, '"');
          }
          return item;
        })
        .filter(item => item.length > 0);
    }
    
    // If it's a single string, normalize quotes and wrap it in array
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return [trimmed.slice(1, -1)];
    }

    return [trimmed];
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
