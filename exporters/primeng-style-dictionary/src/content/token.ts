import { NamingHelper, CSSHelper } from "@supernovaio/export-utils"
import { Token, TokenGroup, TokenType } from "@supernovaio/sdk-exporters"
import { exportConfiguration } from ".."
import { DEFAULT_TOKEN_PREFIXES } from "../constants/defaults"
import { formatTokenValue } from "../utils/value-formatter"
import { resetNameTracking } from "../utils/token-hierarchy"
import { DesignSystemCollection } from '@supernovaio/sdk-exporters/build/sdk-typescript/src/model/base/SDKDesignSystemCollection'

export function getTokenPrefix(tokenType: TokenType, forceReturn: boolean = false): string {
  // Return empty string if token type prefixes are disabled (unless forceReturn is true)
  if (!exportConfiguration.useTokenTypePrefixes && !forceReturn) {
    return ''
  }
  
  return exportConfiguration.customizeTokenPrefixes
    ? exportConfiguration.tokenPrefixes[tokenType].trim()
    : DEFAULT_TOKEN_PREFIXES[tokenType]
}

export function tokenObjectKeyName(
  token: Token, 
  tokenGroups: Array<TokenGroup>, 
  forExport: boolean = false,
  collections: Array<DesignSystemCollection> = []
): string {
  // Always include the parent group (hardcoded to "Group path + Token name" behavior)
  const parentGroup = tokenGroups.find((group) => group.id === token.parentGroupId)

  // No prefix needed
  const prefix = ''

  return NamingHelper.codeSafeVariableNameForToken(
    token,
    exportConfiguration.tokenNameStyle,
    parentGroup ?? null,
    prefix
  )
}

// Use the hierarchy-based name tracking reset
export function resetTokenNameTracking(): void {
  resetNameTracking()
}

export function convertedToken(
  token: Token, 
  mappedTokens: Map<string, Token>, 
  tokenGroups: Array<TokenGroup>,
  collections: Array<DesignSystemCollection> = []
): string {
  const name = tokenObjectKeyName(token, tokenGroups, false, collections)
  const value = CSSHelper.tokenToCSS(token, mappedTokens, {
    allowReferences: exportConfiguration.useReferences,
    decimals: exportConfiguration.colorPrecision,
    colorFormat: exportConfiguration.colorFormat,
    forceRemUnit: exportConfiguration.forceRemUnit,
    remBase: exportConfiguration.remBase,
    tokenToVariableRef: (t) => {
      return tokenObjectKeyName(t, tokenGroups, false, collections)
    },
  })

  const indentString = " ".repeat(exportConfiguration.indent)
  const formattedValue = formatTokenValue(value)

  if (exportConfiguration.showDescriptions && token.description) {
    return `${indentString}// ${token.description.trim()}\n${indentString}${name}: ${formattedValue},`
  } else {
    return `${indentString}${name}: ${formattedValue},`
  }
}
