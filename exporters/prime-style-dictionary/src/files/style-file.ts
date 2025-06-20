import { CSSHelper } from "@supernovaio/export-utils"
import { Token, TokenGroup } from "@supernovaio/sdk-exporters"
import { DesignSystemCollection } from "@supernovaio/sdk-exporters/build/sdk-typescript/src/model/base/SDKDesignSystemCollection"
import { exportConfiguration } from ".."
import { createHierarchicalStructure, deepMerge, buildReferencePath } from "../utils/token-hierarchy"

/**
 * Creates a raw value for a token, to be used in the final key-value pair output.
 */
function createTokenValue(value: any): any {
  // If the value is an object, convert it to a string to prevent verbose logging.
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2).replace(/['"]/g, "");
  }
  // Otherwise, return the cleaned value.
  return typeof value === 'string' ? value.replace(/['"]/g, "") : value;
}

/**
 * Builds a nested object structure for a given set of tokens.
 * This function processes an array of tokens and converts them into a hierarchical object
 * based on their path in the design system, ready for the final JSON output.
 * @param tokensToProcess The tokens to process, which can be either unthemed (primitives) or themed.
 * @param tokenGroups All token groups, used for structuring the hierarchy.
 * @param collections All design system collections.
 * @param allTokens The complete list of all tokens for the current context (themed or unthemed), used for resolving references.
 * @returns An object containing the nested token structure.
 */
export function buildTokenObject(
  tokensToProcess: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  collections: Array<DesignSystemCollection>,
  allTokens: Array<Token>
): any {
  let collectionObject = {};
  const mappedTokens = new Map(allTokens.map((token) => [token.id, token]));

  // Process each token in the provided array
  tokensToProcess.forEach(token => {
    // Convert the token to its final string value, resolving any references.
    const value = CSSHelper.tokenToCSS(token, mappedTokens, {
        allowReferences: exportConfiguration.useReferences,
        decimals: exportConfiguration.colorPrecision,
        colorFormat: exportConfiguration.colorFormat,
        forceRemUnit: exportConfiguration.forceRemUnit,
        remBase: exportConfiguration.remBase,
        tokenToVariableRef: (t) => `{${buildReferencePath(t)}}`,
    });
    
    // Create the hierarchical object for this token.
    // We skip the first path segment (e.g., "primitive") as it's handled at a higher level.
    const tokenPathWithoutCollection = (token.tokenPath || []).slice(1);
    const hierarchicalObject = createHierarchicalStructure(
      tokenPathWithoutCollection,
      token.name,
      createTokenValue(value),
      token,
      collections,
      { includeTypePrefix: false }
    );
    
    // Merge the generated structure for this token into the main collection object.
    collectionObject = deepMerge(collectionObject, hierarchicalObject);
  });
  return collectionObject;
}