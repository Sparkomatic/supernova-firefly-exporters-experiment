import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile, Token, TokenGroup, TokenTheme } from "@supernovaio/sdk-exporters"
import { DesignSystemCollection } from "@supernovaio/sdk-exporters/build/sdk-typescript/src/model/base/SDKDesignSystemCollection"
import { ExporterConfiguration } from "../config"
import { buildTokenObject } from "./files/style-file"
import { FileHelper } from "@supernovaio/export-utils"
import { resetNameTracking } from "./utils/token-hierarchy"

/** Exporter configuration from the resolved default configuration and user overrides */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()

/** Utility function to safely set a value in a nested object based on a path. */
function deepSet(obj: any, path: string[], value: any): void {
  let schema = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (schema[p] === undefined || schema[p] === null) {
      schema[p] = {};
    }
    schema = schema[p];
  }
  schema[path[path.length - 1]] = value;
}

/**
 * Main export function that generates the final tokens.json file.
 * It separates tokens into "primitive" (unthemed) and other collections ("semantic", "components") which are themed.
 * For each theme, it computes the correct token values and builds the final JSON structure.
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {

  // Fetch all necessary data from Supernova
  const remoteVersionIdentifier: RemoteVersionIdentifier = { designSystemId: context.dsId, versionId: context.versionId }
  const tokens = await sdk.tokens.getTokens(remoteVersionIdentifier)
  const tokenGroups = await sdk.tokens.getTokenGroups(remoteVersionIdentifier)
  const collections = await sdk.tokens.getTokenCollections(remoteVersionIdentifier)
  const allThemes = await sdk.tokens.getTokenThemes(remoteVersionIdentifier)

  // This is the root object we will build and export
  const finalResult: any = {
    _comment: exportConfiguration.disclaimer,
    _lastUpdated: new Date().toISOString()
  };

  // Define allowed top-level collection names
  const allowedTopLevelCollections = ['primitive', 'semantic', 'components'];

  // --- Part 1: Process Primitive tokens ---
  // Primitives are treated as unthemed and processed directly.
  const primitiveTokens = tokens.filter(t => (t.tokenPath ? t.tokenPath[0] : "").toLowerCase() === 'primitive');
  if (primitiveTokens.length > 0) {
    // For primitives, the reference dictionary (`allTokens`) is the original, unthemed token set.
    resetNameTracking(); // Reset before processing a new group
    const primitiveResult = buildTokenObject(primitiveTokens, tokenGroups, collections, tokens);
    finalResult.primitive = primitiveResult;
  }
  
  // --- Part 2: Process Themed collections ---
  // Identify all themed collections that are in the allowed list
  const themedCollectionNames = [...new Set(tokens.map(t => t.tokenPath ? t.tokenPath[0] : "").filter(name => name && allowedTopLevelCollections.includes(name.toLowerCase()) && name.toLowerCase() !== 'primitive'))];

  // Loop through each theme defined in the design system (e.g., Light, Dark)
  for (const theme of allThemes) {
    const themeName = theme.name.toLowerCase();

    // This is the key step: create a complete new set of tokens with this specific theme's values applied.
    // This new set will have correct values for all semantic/component tokens.
    const allThemedTokens = sdk.tokens.computeTokensByApplyingThemes(tokens, tokens, [theme]);

    // Now, loop through each themed collection name (semantic, components, etc.)
    for (const collectionName of themedCollectionNames) {
      const collectionNameLower = collectionName.toLowerCase();
      
      // Filter the fully-themed token set to get only the tokens for the current collection.
      const tokensInCollection = allThemedTokens.filter(t => (t.tokenPath ? t.tokenPath[0] : "").toLowerCase() === collectionNameLower);
      if (tokensInCollection.length === 0) continue;

      // Build the object for this collection.
      // Crucially, we pass `allThemedTokens` as the reference dictionary so that themed tokens can find other themed tokens.
      resetNameTracking(); // Reset before processing a new group
      const themeResult = buildTokenObject(tokensInCollection, tokenGroups, collections, allThemedTokens);
      
      // Add the result to the final structure, like `finalResult.semantic.light = ...`
      if (themeResult && Object.keys(themeResult).length > 0) {
        deepSet(finalResult, [collectionNameLower, 'colorScheme', themeName], themeResult);
      }
    }
  }
  
  // --- Part 3: Create the output file ---
  return [
    FileHelper.createTextFile({
        relativePath: './',
        fileName: 'tokens.json',
        content: JSON.stringify(finalResult, null, exportConfiguration.indent)
    })
  ];
})
