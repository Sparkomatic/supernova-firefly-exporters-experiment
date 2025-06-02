import { FileHelper, CSSHelper, GeneralHelper, ThemeHelper, FileNameHelper, StringCase, NamingHelper } from "@supernovaio/export-utils"
import { OutputTextFile, Token, TokenGroup, TokenType, TokenTheme } from "@supernovaio/sdk-exporters"
import { DesignSystemCollection } from '@supernovaio/sdk-exporters/build/sdk-typescript/src/model/base/SDKDesignSystemCollection'
import { exportConfiguration } from ".."
import { tokenObjectKeyName, resetTokenNameTracking, getTokenPrefix } from "../content/token"
import { DEFAULT_STYLE_FILE_NAMES } from "../constants/defaults"
import { deepMerge, processTokenName, tokenNameTracker } from "../utils/token-hierarchy"
import { ThemeExportStyle, TokenNameStructure } from "../../config"

/**
 * Creates a value object for a token, either as a simple value or themed values
 */
function createTokenValue(
  value: string,
  token: Token,
  theme?: TokenTheme
): any {
  const baseValue = value.replace(/['"]/g, '')
  const description = token.description && exportConfiguration.showDescriptions 
    ? { description: token.description.trim() } 
    : {}

  // For nested themes style, create an object with theme-specific values
  if (exportConfiguration.exportThemesAs === ThemeExportStyle.NestedThemes) {
    const valueObject = {}
    // Include base value only when processing base tokens (no theme)
    if (!theme && exportConfiguration.exportBaseValues) {
      valueObject['base'] = baseValue
    }
    // Add themed value if theme is provided
    if (theme) {
      valueObject[ThemeHelper.getThemeIdentifier(theme, StringCase.kebabCase)] = baseValue
    }
    // Add description last
    return {
      ...valueObject,
      ...description
    }
  }

  // Default case - return just the value
  return baseValue
}

/**
 * Core token processing function that handles the transformation of tokens into a structured object.
 * This function encapsulates the shared logic between single-file and separate-file outputs.
 * 
 * Features:
 * - Handles token name tracking and uniqueness
 * - Processes token values and references
 * - Manages token sorting
 * - Creates hierarchical object structure
 * - Handles theme-specific values
 * - Includes token descriptions and comments
 * - Formats values according to configuration
 * 
 * @param tokens - Array of tokens to process
 * @param tokenGroups - Array of token groups for maintaining hierarchy
 * @param theme - Optional theme configuration for themed tokens
 * @param collections - Array of design system collections for collection-based organization
 * @param allTokens - Optional array of all available tokens for reference resolution
 * @returns Structured object containing processed tokens, or null if no output should be generated
 */
function processTokensToObject(
  tokens: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  theme?: TokenTheme,
  collections: Array<DesignSystemCollection> = [],
  allTokens?: Array<Token>
): any | null {
  resetTokenNameTracking()
  if (!exportConfiguration.generateEmptyFiles && tokens.length === 0) {
    return null
  }
  const mappedTokens = new Map((allTokens || tokens).map((token) => [token.id, token]))
  let sortedTokens = [...tokens]
  if (exportConfiguration.tokenSortOrder === 'alphabetical') {
    sortedTokens.sort((a, b) => {
      const nameA = tokenObjectKeyName(a, tokenGroups, true, collections)
      const nameB = tokenObjectKeyName(b, tokenGroups, true, collections)
      return nameA.localeCompare(nameB)
    })
  }
  const tokenObject: any = {}
  if (exportConfiguration.showGeneratedFileDisclaimer) {
    tokenObject._comment = exportConfiguration.disclaimer
  }

  // Custom grouping for semantic tokens if enabled
  if (exportConfiguration.groupSemanticByColorSchemeAndTheme) {
    // Separate tokens by section
    const primitiveTokens = sortedTokens.filter(token => {
      if (token.collectionId) return false
      if (token.tokenPath && token.tokenPath.length > 0) return false
      return true
    })
    const componentTokens = sortedTokens.filter(token => token.collectionId)
    const semanticTokens = sortedTokens.filter(token => !token.collectionId && token.tokenPath && token.tokenPath.length > 0)

    // Add primitive and components as usual
    primitiveTokens.forEach(token => {
      const name = tokenObjectKeyName(token, tokenGroups, true, collections)
      const value = CSSHelper.tokenToCSS(token, mappedTokens, {
        allowReferences: exportConfiguration.useReferences,
        decimals: exportConfiguration.colorPrecision,
        colorFormat: exportConfiguration.colorFormat,
        forceRemUnit: exportConfiguration.forceRemUnit,
        remBase: exportConfiguration.remBase,
        tokenToVariableRef: (t) => {
          const prefix = getTokenPrefix(t.tokenType)
          const pathSegments = (t.tokenPath || [])
            .filter(segment => segment && segment.trim().length > 0)
            .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
          const tokenName = processTokenName(t, pathSegments)
          let segments: string[] = []
          if (prefix) {
            segments.push(prefix)
          }
          switch (exportConfiguration.tokenNameStructure) {
            case TokenNameStructure.NameOnly:
              segments.push(tokenName)
              break
            case TokenNameStructure.CollectionPathAndName:
              if (t.collectionId) {
                const collection = collections.find(c => c.persistentId === t.collectionId)
                if (collection) {
                  const collectionSegment = NamingHelper.codeSafeVariableName(collection.name, exportConfiguration.tokenNameStyle)
                  segments.push(collectionSegment)
                }
              }
              segments.push(...pathSegments, tokenName)
              break
            case TokenNameStructure.PathAndName:
              segments.push(...pathSegments, tokenName)
              break
          }
          if (exportConfiguration.globalNamePrefix) {
            segments.unshift(
              NamingHelper.codeSafeVariableName(
                exportConfiguration.globalNamePrefix, 
                exportConfiguration.tokenNameStyle
              )
            )
          }
          return `{${segments.join('.')}`
        }
      })
      const hierarchicalObject = createSectionedHierarchicalStructure(
        token.tokenPath || [],
        token.name,
        createTokenValue(value, token, theme),
        token,
        collections
      )
      Object.assign(tokenObject, deepMerge(tokenObject, hierarchicalObject))
    })
    componentTokens.forEach(token => {
      const name = tokenObjectKeyName(token, tokenGroups, true, collections)
      const value = CSSHelper.tokenToCSS(token, mappedTokens, {
        allowReferences: exportConfiguration.useReferences,
        decimals: exportConfiguration.colorPrecision,
        colorFormat: exportConfiguration.colorFormat,
        forceRemUnit: exportConfiguration.forceRemUnit,
        remBase: exportConfiguration.remBase,
        tokenToVariableRef: (t) => {
          const prefix = getTokenPrefix(t.tokenType)
          const pathSegments = (t.tokenPath || [])
            .filter(segment => segment && segment.trim().length > 0)
            .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
          const tokenName = processTokenName(t, pathSegments)
          let segments: string[] = []
          if (prefix) {
            segments.push(prefix)
          }
          switch (exportConfiguration.tokenNameStructure) {
            case TokenNameStructure.NameOnly:
              segments.push(tokenName)
              break
            case TokenNameStructure.CollectionPathAndName:
              if (t.collectionId) {
                const collection = collections.find(c => c.persistentId === t.collectionId)
                if (collection) {
                  const collectionSegment = NamingHelper.codeSafeVariableName(collection.name, exportConfiguration.tokenNameStyle)
                  segments.push(collectionSegment)
                }
              }
              segments.push(...pathSegments, tokenName)
              break
            case TokenNameStructure.PathAndName:
              segments.push(...pathSegments, tokenName)
              break
          }
          if (exportConfiguration.globalNamePrefix) {
            segments.unshift(
              NamingHelper.codeSafeVariableName(
                exportConfiguration.globalNamePrefix, 
                exportConfiguration.tokenNameStyle
              )
            )
          }
          return `{${segments.join('.')}`
        }
      })
      const hierarchicalObject = createSectionedHierarchicalStructure(
        token.tokenPath || [],
        token.name,
        createTokenValue(value, token, theme),
        token,
        collections
      )
      Object.assign(tokenObject, deepMerge(tokenObject, hierarchicalObject))
    })

    // Group semantic tokens by theme
    const colorScheme: any = {}
    semanticTokens.forEach(token => {
      // Determine theme name
      let themeName = 'base'
      if (theme && theme.name) {
        themeName = theme.name.toLowerCase()
      } else if (token.variableModeInfo && token.variableModeInfo.modeName) {
        themeName = token.variableModeInfo.modeName.toLowerCase()
      }
      if (!colorScheme[themeName]) {
        colorScheme[themeName] = {}
      }
      // Build the path for the token under colorScheme[themeName]
      const name = tokenObjectKeyName(token, tokenGroups, true, collections)
      const value = CSSHelper.tokenToCSS(token, mappedTokens, {
        allowReferences: exportConfiguration.useReferences,
        decimals: exportConfiguration.colorPrecision,
        colorFormat: exportConfiguration.colorFormat,
        forceRemUnit: exportConfiguration.forceRemUnit,
        remBase: exportConfiguration.remBase,
        tokenToVariableRef: (t) => {
          const prefix = getTokenPrefix(t.tokenType)
          const pathSegments = (t.tokenPath || [])
            .filter(segment => segment && segment.trim().length > 0)
            .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
          const tokenName = processTokenName(t, pathSegments)
          let segments: string[] = []
          if (prefix) {
            segments.push(prefix)
          }
          switch (exportConfiguration.tokenNameStructure) {
            case TokenNameStructure.NameOnly:
              segments.push(tokenName)
              break
            case TokenNameStructure.CollectionPathAndName:
              if (t.collectionId) {
                const collection = collections.find(c => c.persistentId === t.collectionId)
                if (collection) {
                  const collectionSegment = NamingHelper.codeSafeVariableName(collection.name, exportConfiguration.tokenNameStyle)
                  segments.push(collectionSegment)
                }
              }
              segments.push(...pathSegments, tokenName)
              break
            case TokenNameStructure.PathAndName:
              segments.push(...pathSegments, tokenName)
              break
          }
          if (exportConfiguration.globalNamePrefix) {
            segments.unshift(
              NamingHelper.codeSafeVariableName(
                exportConfiguration.globalNamePrefix, 
                exportConfiguration.tokenNameStyle
              )
            )
          }
          return `{${segments.join('.')}`
        }
      })
      // Build the nested object for the token path
      let current = colorScheme[themeName]
      const pathSegments = (token.tokenPath || []).map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
      for (let i = 0; i < pathSegments.length - 1; i++) {
        if (!current[pathSegments[i]]) {
          current[pathSegments[i]] = {}
        }
        current = current[pathSegments[i]]
      }
      current[pathSegments[pathSegments.length - 1] || token.name] = createTokenValue(value, token, theme)
    })
    if (!tokenObject.semantic) tokenObject.semantic = {}
    tokenObject.semantic.colorScheme = colorScheme
    return tokenObject
  }

  // Default behavior
  sortedTokens.forEach(token => {
    const name = tokenObjectKeyName(token, tokenGroups, true, collections)
    const value = CSSHelper.tokenToCSS(token, mappedTokens, {
      allowReferences: exportConfiguration.useReferences,
      decimals: exportConfiguration.colorPrecision,
      colorFormat: exportConfiguration.colorFormat,
      forceRemUnit: exportConfiguration.forceRemUnit,
      remBase: exportConfiguration.remBase,
      tokenToVariableRef: (t) => {
        const prefix = getTokenPrefix(t.tokenType)
        const pathSegments = (t.tokenPath || [])
          .filter(segment => segment && segment.trim().length > 0)
          .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
        const tokenName = processTokenName(t, pathSegments)
        let segments: string[] = []
        if (prefix) {
          segments.push(prefix)
        }
        switch (exportConfiguration.tokenNameStructure) {
          case TokenNameStructure.NameOnly:
            segments.push(tokenName)
            break
          case TokenNameStructure.CollectionPathAndName:
            if (t.collectionId) {
              const collection = collections.find(c => c.persistentId === t.collectionId)
              if (collection) {
                const collectionSegment = NamingHelper.codeSafeVariableName(collection.name, exportConfiguration.tokenNameStyle)
                segments.push(collectionSegment)
              }
            }
            segments.push(...pathSegments, tokenName)
            break
          case TokenNameStructure.PathAndName:
            segments.push(...pathSegments, tokenName)
            break
        }
        if (exportConfiguration.globalNamePrefix) {
          segments.unshift(
            NamingHelper.codeSafeVariableName(
              exportConfiguration.globalNamePrefix, 
              exportConfiguration.tokenNameStyle
            )
          )
        }
        return `{${segments.join('.')}`
      }
    })
    const hierarchicalObject = createSectionedHierarchicalStructure(
      token.tokenPath || [],
      token.name,
      createTokenValue(value, token, theme),
      token,
      collections
    )
    Object.assign(tokenObject, deepMerge(tokenObject, hierarchicalObject))
  })
  return tokenObject
}

/**
 * Generates a style file for a specific token type (color.json, typography.json, etc.).
 * This function is used when fileStructure is set to 'separateByType'.
 * 
 * Features:
 * - Generates separate files for each token type
 * - Handles token filtering by type
 * - Supports theming
 * - Includes token descriptions as comments
 * - Formats values according to configuration
 * 
 * @param type - The type of tokens to generate (Color, Typography, etc.)
 * @param tokens - Array of all tokens
 * @param tokenGroups - Array of token groups for name generation
 * @param themePath - Path for themed tokens (empty for base tokens)
 * @param theme - Theme configuration when generating themed tokens
 * @param collections - Array of design system collections
 * @returns OutputTextFile with the generated content or null if no tokens exist
 */
export function styleOutputFile(
  type: TokenType,
  tokens: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  themePath: string = '',
  theme?: TokenTheme,
  collections: Array<DesignSystemCollection> = []
): OutputTextFile | null {
  // Skip generating base token files unless:
  // - Base values are explicitly enabled via exportBaseValues, or
  // - We're generating themed files (themePath is present), or
  // - We're using nested themes format
  if (!exportConfiguration.exportBaseValues && !themePath && 
      exportConfiguration.exportThemesAs !== ThemeExportStyle.NestedThemes) {
    return null
  }

  // Filter to only include tokens of the specified type (color, size, etc)
  let tokensOfType = tokens.filter((token) => token.tokenType === type)

  // For themed token files:
  // - Filter to only include tokens that are overridden in this theme
  // - Skip generating the file if no tokens are themed (when configured)
  if (themePath && theme && exportConfiguration.exportOnlyThemedTokens) {
    tokensOfType = ThemeHelper.filterThemedTokens(tokensOfType, theme)
    
    if (tokensOfType.length === 0) {
      return null
    }
  }

  // Process tokens into a structured object
  // Pass the full tokens array for reference resolution
  const tokenObject = processTokensToObject(tokensOfType, tokenGroups, theme, collections, tokens)
  if (!tokenObject) {
    return null
  }

  // Generate the final JSON content with proper indentation
  const content = JSON.stringify(tokenObject, null, exportConfiguration.indent)

  // Create and return the output file with appropriate path and name
  return FileHelper.createTextFile({
    relativePath: themePath ? `./${themePath}` : exportConfiguration.baseStyleFilePath,
    fileName: exportConfiguration.customizeStyleFileNames
      ? FileNameHelper.ensureFileExtension(exportConfiguration.styleFileNames[type], ".json")
      : DEFAULT_STYLE_FILE_NAMES[type],
    content: content
  })
}

/**
 * Generates the content of the exported token object.
 * This object provides a type-safe way to access token values through their generated names.
 * 
 * Features:
 * - Maintains token grouping structure
 * - Includes token descriptions as JSDoc comments
 * - Supports alphabetical sorting when configured
 * - Properly indents according to configuration
 * 
 * @param tokens - Array of tokens to include in the object
 * @param tokenGroups - Array of token groups for maintaining hierarchy
 * @returns Formatted string containing the object's properties
 */
function generateTokenObject(tokens: Array<Token>, tokenGroups: Array<TokenGroup>): string {
  const indentString = GeneralHelper.indent(exportConfiguration.indent)
  
  // Create a copy of tokens array for sorting
  let sortedTokens = [...tokens]
  
  // Sort tokens alphabetically if configured
  // This can make it easier to find tokens in the generated files
  if (exportConfiguration.tokenSortOrder === 'alphabetical') {
    sortedTokens.sort((a, b) => {
      const nameA = tokenObjectKeyName(a, tokenGroups, true)
      const nameB = tokenObjectKeyName(b, tokenGroups, true)
      return nameA.localeCompare(nameB)
    })
  }

  // Generate the object properties, including descriptions as JSDoc comments
  return sortedTokens.map(token => {
    const name = tokenObjectKeyName(token, tokenGroups, true)
    if (token.description) {
      return `${indentString}/** ${token.description.trim()} */\n${indentString}${name},`
    }
    return `${indentString}${name},`
  }).join('\n')
}

/**
 * Generates a single combined JSON file containing all token types.
 * This function is used when fileStructure is set to 'singleFile'.
 * 
 * Features:
 * - Combines all token types into a single file
 * - Maintains token type grouping in the output
 * - Supports theming
 * - Includes token descriptions
 * - Places files directly in root with theme-based names
 * 
 * Output structure examples:
 * - No themes: tokens.json
 * - Separate theme files: tokens.json, tokens.light.json, tokens.dark.json
 * - Merged themes: tokens.json, tokens.themed.json
 * - Nested themes: tokens.json (with all themes nested inside)
 * 
 * @param tokens - Array of all tokens
 * @param tokenGroups - Array of token groups for hierarchy
 * @param themePath - Optional theme path for themed files
 * @param theme - Optional theme configuration
 * @param collections - Array of design system collections
 * @returns OutputTextFile with the combined content or null if no output should be generated
 */
export function combinedStyleOutputFile(
  tokens: Array<Token>,
  tokenGroups: Array<TokenGroup>,
  themePath: string = '',
  theme?: TokenTheme,
  collections: Array<DesignSystemCollection> = []
): OutputTextFile | null {
  // Skip generating base token files unless:
  // - Base values are explicitly enabled via exportBaseValues, or
  // - We're generating themed files (themePath is present), or
  // - We're using nested themes format
  if (!exportConfiguration.exportBaseValues && !themePath && 
      exportConfiguration.exportThemesAs !== ThemeExportStyle.NestedThemes) {
    return null
  }

  // Store original tokens for reference resolution
  const originalTokens = [...tokens]

  // For themed token files:
  // - Filter to only include tokens that are overridden in this theme
  // - Skip generating the file if no tokens are themed (when configured)
  if (themePath && theme && exportConfiguration.exportOnlyThemedTokens) {
    tokens = ThemeHelper.filterThemedTokens(tokens, theme)
    
    if (tokens.length === 0) {
      return null
    }
  }

  // Process all tokens into a single structured object
  // Pass the original tokens array for reference resolution
  const tokenObject = processTokensToObject(tokens, tokenGroups, theme, collections, originalTokens)
  if (!tokenObject) {
    return null
  }

  // Generate the final JSON content with proper indentation
  const content = JSON.stringify(tokenObject, null, exportConfiguration.indent)

  // For single file mode, themed files go directly in root with theme-based names
  const fileName = themePath ? `tokens.${themePath}.json` : 'tokens.json'
  const relativePath = './' // Put files directly in root folder

  // Create and return the output file
  return FileHelper.createTextFile({
    relativePath: relativePath,
    fileName: fileName,
    content: content
  })
}

/**
 * Converts a token's full path and name into a hierarchical object structure with sections
 * First level is always the section (primitive, semantic, or components)
 * Middle levels come from path segments
 * Last level is the token name
 */
function createSectionedHierarchicalStructure(
  path: string[] | undefined, 
  name: string, 
  value: any,
  token: Token,
  collections: Array<DesignSystemCollection> = []
): any {
  // Get collection name if needed for collection-based token organization
  let collectionSegment: string | null = null
  if (exportConfiguration.tokenNameStructure === 'collectionPathAndName' && token.collectionId) {
    const collection = collections.find(c => c.persistentId === token.collectionId)
    collectionSegment = collection?.name ?? null
  }

  // Determine which section this token belongs to
  let section: string
  if (token.collectionId) {
    // If token has a collection, it's a component token
    section = 'components'
  } else if (token.tokenPath && token.tokenPath.length > 0) {
    // If token has a path, it's a semantic token
    section = 'semantic'
  } else {
    // Otherwise it's a primitive token
    section = 'primitive'
  }

  // Build the initial segments array with section
  const segments = [section]

  // Add collection to the output path if present
  if (collectionSegment) {
    segments.push(NamingHelper.codeSafeVariableName(collectionSegment, exportConfiguration.tokenNameStyle))
  }

  // Create path segments array for name uniqueness checking
  const pathSegments = [
    ...(collectionSegment ? [collectionSegment] : []),
    ...(exportConfiguration.tokenNameStructure !== 'nameOnly'
      ? (path || [])
          .filter(segment => segment && segment.trim().length > 0)
          .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
      : [])
  ]

  // Add path segments to the output structure
  if (exportConfiguration.tokenNameStructure !== 'nameOnly') {
    segments.push(
      ...(path || [])
        .filter(segment => segment && segment.trim().length > 0)
        .map(segment => NamingHelper.codeSafeVariableName(segment, exportConfiguration.tokenNameStyle))
    )
  }

  // Generate a unique token name
  const tokenName = tokenNameTracker.getSimpleTokenName(
    token,
    exportConfiguration.tokenNameStyle,
    false,
    pathSegments
  )

  // Add the unique token name as the final segment, removing any leading underscore
  segments.push(tokenName.replace(/^_/, ''))

  // Build the nested object structure from the segments
  return segments.reduceRight((nestedValue, segment) => ({
    [segment]: nestedValue
  }), value)
}