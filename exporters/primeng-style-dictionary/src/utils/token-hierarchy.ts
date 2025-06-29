import { TokenType, Token } from "@supernovaio/sdk-exporters"
import { DesignSystemCollection } from '@supernovaio/sdk-exporters/build/sdk-typescript/src/model/base/SDKDesignSystemCollection'
import { NamingHelper, TokenNameTracker } from "@supernovaio/export-utils"
import { exportConfiguration } from ".."
import { getTokenPrefix } from "../content/token"

// Create a single instance of the tracker for consistent name generation
const tokenNameTracker = new TokenNameTracker()

/**
 * Reset the name tracking between file generations
 */
export function resetNameTracking(): void {
  tokenNameTracker.reset()
}

/**
 * Processes a token name according to our rules using TokenNameTracker
 */
export function processTokenName(
  token: Token, 
  path: string[] = [],
  collections: Array<DesignSystemCollection> = []
): string {
  // Get name from TokenNameTracker
  let tokenName = tokenNameTracker.getSimpleTokenName(
    token,
    exportConfiguration.tokenNameStyle,
    false,
    path
  );

  // Remove leading underscore from any token name
  if (tokenName.startsWith('_')) {
    tokenName = tokenName.slice(1);
  }

  return tokenName;
}

/**
 * Converts a token's full path and name into a hierarchical object structure
 * First level is always the type prefix (e.g. 'color')
 * Middle levels come from path segments
 * Last level is the token name
 */
export function createHierarchicalStructure(
  path: string[] | undefined, 
  name: string, 
  value: any,
  token: Token,
  collections: Array<DesignSystemCollection> = [],
  options: { includeTypePrefix: boolean } = { includeTypePrefix: true }
): any {
  // Build the initial segments array
  const segments: string[] = []

  // Add type prefix if enabled
  if (options.includeTypePrefix) {
    const prefix = NamingHelper.codeSafeVariableName(
        getTokenPrefix(token.tokenType),
        exportConfiguration.tokenNameStyle
    )
    if (prefix) segments.push(prefix)
  }

  // Create path segments array for name uniqueness checking
  const pathSegments: string[] = []
  
  // Regular path segments are always included (hardcoded to "Group path + Token name" behavior)
  const filteredPath = (path || [])
    .filter(segment => segment && segment.trim().length > 0)
    .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
  pathSegments.push(...filteredPath)

  // Add path segments to the output structure
  segments.push(...filteredPath)

  // Generate a unique token name that considers the path context
  const tokenName = processTokenName(token, pathSegments);

  // Add the unique token name as the final segment, removing any leading underscore
  segments.push(tokenName);

  // Build the nested object structure from the segments
  return segments.reduceRight((nestedValue, segment) => ({
    [segment]: nestedValue
  }), value)
}

/**
 * Deeply merges objects together, ensuring descriptions appear after all other properties
 * 
 * This function handles a special case for token descriptions:
 * 1. Extracts descriptions from both objects being merged
 * 2. Removes them temporarily to prevent them from being merged in the middle
 * 3. Merges all other properties (themes, values, etc.)
 * 4. Adds the description back at the very end
 * 
 * This ensures the output format is consistent:
 * {
 *   base: { value: "..." },
 *   theme-light: { value: "..." },
 *   theme-dark: { value: "..." },
 *   description: "..."  // Always last
 * }
 * 
 * @param target Target object to merge into
 * @param source Source object to merge from
 * @returns Merged object with description at the end
 */
export function deepMerge(target: any, source: any): any {
  if (!target) return source
  if (!source) return target
  
  const output = { ...target }
  
  // Get description from either object (if it exists)
  const description = source.description || target.description
  delete output.description
  delete source.description

  // Merge everything except description
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!(key in target)) {
        output[key] = source[key]
      } else {
        output[key] = deepMerge(target[key], source[key])
      }
    } else {
      output[key] = source[key]
    }
  })

  // Add description back at the end if it exists
  if (description) {
    output.description = description
  }
  
  return output
}

/**
 * Builds a dot-separated path for a token, to be used in references.
 * e.g., primitive.ui-teal.50
 */
export function buildReferencePath(token: Token): string {
  const path = token.tokenPath ?? [];
  const name = processTokenName(token, path);
  
  const segments = [...path, name];
    
  return segments.join('.');
} 