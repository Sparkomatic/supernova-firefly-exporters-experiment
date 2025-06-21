import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile, Token, TokenGroup, TokenTheme, TokenType } from "@supernovaio/sdk-exporters"
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

  // Filter out typography tokens (Figma text styles) to avoid logging issues
  const filteredTokens = tokens.filter(token => token.tokenType !== TokenType.typography)

  // This is the root object we will build and export
  const finalResult: any = {
    _comment: exportConfiguration.disclaimer + "\n\nNote: Typography tokens generated specifically from Figma text styles have been skipped for now.",
    _lastUpdated: new Date().toISOString()
  };

  // Define allowed top-level collection names
  const allowedTopLevelCollections = ['primitive', 'semantic'];
  
  // Add components to the allowed collections if the configuration option is enabled
  if (exportConfiguration.includeComponentTokens) {
    allowedTopLevelCollections.push('components');
  }

  // --- Part 1: Process Primitive tokens ---
  // Primitives are treated as unthemed and processed directly.
  const primitiveTokens = filteredTokens.filter(t => (t.tokenPath ? t.tokenPath[0] : "").toLowerCase() === 'primitive');
  if (primitiveTokens.length > 0) {
    // For primitives, the reference dictionary (`allTokens`) is the original, unthemed token set.
    resetNameTracking(); // Reset before processing a new group
    const primitiveResult = buildTokenObject(primitiveTokens, tokenGroups, collections, filteredTokens);
    finalResult.primitive = primitiveResult;
  }
  
  // --- Part 2: Process Themed collections ---
  // Use the allowed list, excluding 'primitive', as the definitive list of themed collections to process.
  const themedCollectionNames = allowedTopLevelCollections.filter(c => c !== 'primitive');

  // Determine which themes to apply based on configuration
  let themesToApply: TokenTheme[] = [];
  
  if (exportConfiguration.excludeThemesMode) {
    // Exclude mode: apply all themes except those in excludedThemeIds
    themesToApply = allThemes.filter(theme => 
      !exportConfiguration.excludedThemeIds?.includes(theme.id)
    );
  } else {
    // Include mode: apply only themes specified in context.themeIds
    if (context.themeIds && context.themeIds.length > 0) {
      themesToApply = allThemes.filter(theme => 
        context.themeIds!.includes(theme.id)
      );
    } else {
      // If no themes specified, apply all themes
      themesToApply = allThemes;
    }
  }

  // Loop through each selected theme
  for (const theme of themesToApply) {
    const themeName = theme.name.toLowerCase();

    // This is the key step: create a complete new set of tokens with this specific theme's values applied.
    // This new set will have correct values for all semantic/component tokens.
    const allThemedTokens = sdk.tokens.computeTokensByApplyingThemes(filteredTokens, filteredTokens, [theme]);

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
      
      // Add the result to the final structure, like `finalResult.semantic.colorScheme.light = ...`
      if (themeResult && Object.keys(themeResult).length > 0) {
        deepSet(finalResult, [collectionNameLower, 'colorScheme', themeName], themeResult);
      }
    }
  }
  
  // --- Part 3: Create the output file ---
  return [
    FileHelper.createTextFile({
        relativePath: './',
        fileName: exportConfiguration.outputFilename,
        content: JSON.stringify(finalResult, null, exportConfiguration.indent)
    })
  ];
})
