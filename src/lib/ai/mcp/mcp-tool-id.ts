import logger from "logger";

/**
 * Sanitizes a name to be compatible with function name requirements:
 * - Must start with a letter or underscore
 * - Can only contain alphanumeric characters, underscores, dots, or dashes
 * - Maximum length of 64 characters
 */
export const sanitizeFunctionName = (name: string): string => {
  // Log the input for debugging
  logger.debug(`Sanitizing function name: ${name}`);
  
  // Replace any characters that aren't alphanumeric, underscore, dot, or dash with underscore
  let sanitized = name.replace(/[^a-zA-Z0-9_\.\-]/g, "_");

  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }

  // Truncate to 64 characters if needed
  if (sanitized.length > 64) {
    logger.debug(`Name exceeded max length, truncating: ${name} (${name.length} chars)`);
    sanitized = sanitized.substring(0, 64);
  }

  // Log if the name was changed significantly
  if (sanitized !== name) {
    logger.debug(`Name sanitized from "${name}" to "${sanitized}"`);
  }

  return sanitized;
};

export const createMCPToolId = (serverName: string, toolName: string) => {
  logger.debug(`Creating MCP tool ID from server "${serverName}" and tool "${toolName}"`);
  
  // Sanitize both server name and tool name individually
  const sanitizedServer = sanitizeFunctionName(serverName);
  const sanitizedTool = sanitizeFunctionName(toolName);

  // Ensure the combined name doesn't exceed 64 characters
  // Reserve some characters for the separator
  const maxLength = 64;
  const separator = "_";

  let result: string;
  
  if (
    sanitizedServer.length + sanitizedTool.length + separator.length >
    maxLength
  ) {
    // Allocate space proportionally
    const totalLength = sanitizedServer.length + sanitizedTool.length;
    const serverPortion = Math.floor(
      (sanitizedServer.length / totalLength) * (maxLength - separator.length),
    );
    const toolPortion = maxLength - separator.length - serverPortion;

    logger.debug(`Combined name too long (${sanitizedServer.length + sanitizedTool.length + separator.length}), truncating to ${maxLength} chars`);
    logger.debug(`Allocating ${serverPortion} chars to server and ${toolPortion} chars to tool`);
    
    result = `${sanitizedServer.substring(0, serverPortion)}${separator}${sanitizedTool.substring(0, toolPortion)}`;
  } else {
    result = `${sanitizedServer}${separator}${sanitizedTool}`;
  }
  
  logger.debug(`Created MCP tool ID: ${result}`);
  return result;
};

export const extractMCPToolId = (toolId: string) => {
  logger.debug(`Extracting MCP components from tool ID: ${toolId}`);
  
  if (!toolId || !toolId.includes("_")) {
    logger.warn(`Invalid MCP tool ID format: ${toolId}`);
    // Fallback to avoid runtime errors
    return { serverName: toolId || "", toolName: "" };
  }
  
  const [serverName, ...toolName] = toolId.split("_");
  const extractedToolName = toolName.join("_");
  
  logger.debug(`Extracted server name: "${serverName}", tool name: "${extractedToolName}"`);
  return { serverName, toolName: extractedToolName };
};
