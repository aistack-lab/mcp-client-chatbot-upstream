import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type MCPServerInfo,
  MCPSseConfigZodSchema,
  MCPStdioConfigZodSchema,
  type MCPServerConfig,
  type MCPToolInfo,
  type MCPPromptInfo,
  type MCPPrompt,
} from "app-types/mcp";
import { jsonSchema, Tool, tool, ToolExecutionOptions } from "ai";
import { isMaybeSseConfig, isMaybeStdioConfig } from "./is-mcp-config";
import logger from "logger";
import type { ConsolaInstance } from "consola";
import { colorize } from "consola/utils";
import { createDebounce, isNull, Locker, toAny } from "lib/utils";

import { safe } from "ts-safe";
import { IS_MCP_SERVER_SSE_ONLY } from "lib/const";

type ClientOptions = {
  autoDisconnectSeconds?: number;
};

/**
 * Client class for Model Context Protocol (MCP) server connections
 */
export class MCPClient {
  private client?: Client;
  private error?: unknown;
  private isConnected = false;
  private log: ConsolaInstance;
  private locker = new Locker();
  // Information about available tools from the server
  toolInfo: MCPToolInfo[] = [];
  // Tool instances that can be used for AI functions
  tools: { [key: string]: Tool } = {};
  // Information about available prompts from the server
  promptInfo: MCPPromptInfo[] = [];
  // Prompt instances that can be used
  prompts: { [key: string]: MCPPrompt } = {};

  constructor(
    private name: string,
    private serverConfig: MCPServerConfig,
    private options: ClientOptions = {
      autoDisconnectSeconds: 300 // Default to 5 minutes for auto-disconnect
    },
    private disconnectDebounce = createDebounce(),
  ) {
    this.log = logger.withDefaults({
      message: colorize("cyan", `MCP Client ${this.name}: `),
    });
    
    // Validate configuration
    if (isMaybeStdioConfig(this.serverConfig)) {
      if (!this.serverConfig.command) {
        this.log.warn("STDIO config missing command");
      }
    } else if (isMaybeSseConfig(this.serverConfig)) {
      if (!this.serverConfig.url) {
        this.log.warn("SSE config missing URL");
      }
    } else {
      this.log.warn("Unknown server config type");
    }
  }

  getInfo(): MCPServerInfo {
    return {
      name: this.name,
      config: this.serverConfig,
      status: this.locker.isLocked
        ? "loading"
        : this.isConnected
          ? "connected"
          : "disconnected",
      error: this.error,
      toolInfo: this.toolInfo,
      promptInfo: this.promptInfo,
    };
  }

  private scheduleAutoDisconnect() {
    if (this.options.autoDisconnectSeconds) {
      this.log.debug(`Scheduling auto-disconnect in ${this.options.autoDisconnectSeconds}s`);
      this.disconnectDebounce(() => {
        this.log.info(`Auto-disconnecting after ${this.options.autoDisconnectSeconds}s of inactivity`);
        this.disconnect().catch(err => {
          this.log.error("Auto-disconnect failed:", err);
        });
      }, this.options.autoDisconnectSeconds * 1000);
    }
  }

  /**
   * Connect to the MCP server
   * Do not throw Error
   * @returns this
   */
  // Track connection attempts to prevent infinite loops
  private connectionAttempts = 0;
  private static MAX_CONNECTION_ATTEMPTS = 5;
  private lastConnectionError: unknown;
  private lastConnectionTime = 0;
  private static CONNECTION_COOLDOWN_MS = 10000; // 10 second cooldown between retries

  async connect() {
    // Return cached client if already connected
    if (this.isConnected && this.client) {
      return this.client;
    }
    
    // Wait if a connection attempt is already in progress
    if (this.locker.isLocked) {
      await this.locker.wait();
      return this.client;
    }
    
    // Prevent connection attempts in rapid succession
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastConnectionTime;
    if (timeSinceLastAttempt < MCPClient.CONNECTION_COOLDOWN_MS) {
      this.log.warn(
        `Connection attempt too soon after previous attempt (${timeSinceLastAttempt}ms). ` +
        `Waiting for cooldown period (${MCPClient.CONNECTION_COOLDOWN_MS}ms).`
      );
      await new Promise(resolve => 
        setTimeout(resolve, MCPClient.CONNECTION_COOLDOWN_MS - timeSinceLastAttempt)
      );
    }
    
    // Reset connection attempts counter if it's been a while since the last attempt
    if (timeSinceLastAttempt > 60000) { // 1 minute
      this.log.info("Resetting connection attempts counter after cooling period");
      this.connectionAttempts = 0;
    }
    
    // Limit connection attempts to prevent infinite loops
    if (this.connectionAttempts >= MCPClient.MAX_CONNECTION_ATTEMPTS) {
      this.log.error(
        `Maximum connection attempts (${MCPClient.MAX_CONNECTION_ATTEMPTS}) reached. ` +
        `Last error: ${this.lastConnectionError}`
      );
      throw new Error(
        `Failed to connect to MCP server after ${MCPClient.MAX_CONNECTION_ATTEMPTS} attempts. ` +
        `Last error: ${this.lastConnectionError}`
      );
    }
    
    this.connectionAttempts++;
    this.lastConnectionTime = now;
    this.log.info(`Connection attempt ${this.connectionAttempts}/${MCPClient.MAX_CONNECTION_ATTEMPTS}`);
    
    try {
      const startedAt = Date.now();
      this.locker.lock();

      const client = new Client({
        name: this.name,
        version: "1.0.0",
      });

      let transport: Transport;
      // Create appropriate transport based on server config type
      if (isMaybeStdioConfig(this.serverConfig)) {
        // Skip stdio transport
        if (IS_MCP_SERVER_SSE_ONLY) {
          throw new Error("Stdio transport is not supported");
        }

        const config = MCPStdioConfigZodSchema.parse(this.serverConfig);
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          // Merge process.env with config.env, ensuring PATH is preserved and filtering out undefined values
          env: Object.entries({ ...process.env, ...config.env }).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
          cwd: process.cwd(),
        });
      } else if (isMaybeSseConfig(this.serverConfig)) {
        const config = MCPSseConfigZodSchema.parse(this.serverConfig);
        const url = new URL(config.url);
        transport = new SSEClientTransport(url, {
          requestInit: {
            headers: config.headers,
          },
        });
      } else {
        throw new Error("Invalid server config");
      }

      // Set timeout on connection to prevent hanging
      const connectionPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout after 30s")), 30000);
      });
      
      await Promise.race([connectionPromise, timeoutPromise]);
      
      this.log.info(
        `Connected to MCP server in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
      );
      this.isConnected = true;
      this.error = undefined;
      this.client = client;
      
      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;
      
      const toolResponse = await client.listTools();
      this.toolInfo = toolResponse.tools.map(
        (tool) =>
          ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }) as MCPToolInfo,
      );
      
      // Fetch available prompts
      try {
        const promptsResponse = await client.listPrompts();
        this.promptInfo = promptsResponse.prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description || '',
          arguments: (prompt.arguments || []).map(sdkArg => ({
            name: sdkArg.name,
            description: sdkArg.description, // Assumes sdkArg.description is compatible or undefined
            required: sdkArg.required ?? false, // Default 'required' to false if undefined
          })),
        }));
        
        // Create callable prompt objects
        this.prompts = this.promptInfo.reduce((acc, prompt) => {
          acc[prompt.name] = {
            name: prompt.name,
            description: prompt.description,
            execute: (args: Record<string, any>) => this.getPrompt(prompt.name, args)
          };
          return acc;
        }, {} as Record<string, MCPPrompt>);
        
        this.log.info(`Loaded ${this.promptInfo.length} prompts from MCP server`);
      } catch (error) {
        this.log.warn("Failed to fetch prompts:", error);
        // Don't fail the connection if prompts can't be loaded
        // The server might not support prompts
      }

      // Create AI SDK tool wrappers for each MCP tool
      this.tools = toolResponse.tools.reduce((prev, _tool) => {
        const parameters = jsonSchema(
          toAny({
            ..._tool.inputSchema,
            properties: _tool.inputSchema.properties ?? {},
            additionalProperties: false,
          }),
        );
        prev[_tool.name] = tool({
          parameters,
          description: _tool.description,
          execute: (params, options: ToolExecutionOptions) => {
            options?.abortSignal?.throwIfAborted();
            return this.callTool(_tool.name, params);
          },
        });
        return prev;
      }, {});
      this.scheduleAutoDisconnect();
    } catch (error) {
      this.log.error(`Connection failed (attempt ${this.connectionAttempts}/${MCPClient.MAX_CONNECTION_ATTEMPTS}):`, error);
      this.isConnected = false;
      this.error = error;
      this.lastConnectionError = error;
    }

    this.locker.unlock();
    return this.client;
  }
  async disconnect() {
    this.log.info("Disconnecting from MCP server");
    
    // Wait if a connection/disconnection operation is in progress
    await this.locker.wait();
    
    try {
      this.locker.lock();
      
      // If already disconnected, nothing to do
      if (!this.isConnected || !this.client) {
        this.log.info("Client already disconnected or not initialized");
        this.isConnected = false;
        this.client = undefined;
        return;
      }
      
      this.log.info("Closing MCP server connection");
      const client = this.client;
      
      // Reset state first to prevent reconnection attempts during closing
      this.isConnected = false;
      this.client = undefined;
      
      // Reset connection tracking
      this.connectionAttempts = 0;
      
      // Kill server process forcefully for STDIO clients to prevent hangs
      if (isMaybeStdioConfig(this.serverConfig) && client) {
        // Try to get the underlying process from the transport if available
        const transport = (client as any)?.transport;
        if (transport && typeof transport.process !== 'undefined') {
          this.log.info("Terminating STDIO server process");
          try {
            // First try a gentle SIGTERM
            transport.process.kill('SIGTERM');
            
            // Give it a moment to shut down gracefully
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // If it's still running, force kill it
            if (!transport.process.killed) {
              this.log.warn("Server didn't terminate gracefully, forcing SIGKILL");
              transport.process.kill('SIGKILL');
            }
          } catch (e) {
            this.log.error("Error killing process:", e);
          }
        }
      }
      
      // Use a timeout to prevent hanging on disconnect
      const closePromise = client.close();
      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(() => {
          this.log.warn("Disconnect timed out after 5s, continuing anyway");
          resolve();
        }, 5000);
      });
      
      await Promise.race([closePromise, timeoutPromise])
        .catch((e) => this.log.error("Error during disconnect:", e));
        
      this.log.info("MCP server disconnection complete");
    } catch (error) {
      this.log.error("Unexpected error during disconnect:", error);
    } finally {
      this.locker.unlock();
    }
  }
  async callTool(toolName: string, input?: unknown) {
    return safe(() => this.log.info("tool call", toolName))
      .map(async () => {
        const client = await this.connect();
        return client?.callTool({
          name: toolName,
          arguments: input as Record<string, unknown>,
        });
      })
      .ifOk((v) => {
        if (isNull(v)) {
          throw new Error("Tool call failed with null");
        }
        return v;
      })
      .ifOk(() => this.scheduleAutoDisconnect())
      .watch((status) => {
        if (!status.isOk) {
          this.log.error("Tool call failed", toolName, status.error);
        } else if (status.value?.isError) {
          this.log.error("Tool call failed", toolName, status.value.content);
        }
      })
      .unwrap();
  }
  
  async getPrompt(promptName: string, args: Record<string, any>) {
    if (!this.client || !this.isConnected) {
      throw new Error("Client not connected");
    }
    
    try {
      this.log.info("prompt call", promptName);
      const prompt = await this.client.getPrompt({
        name: promptName,
        arguments: args
      });
      
      return prompt;
    } catch (error) {
      this.log.error("Prompt call failed", promptName, error);
      throw error;
    }
  }
}

/**
 * Factory function to create a new MCP client
 */
export const createMCPClient = (
  name: string,
  serverConfig: MCPServerConfig,
  options: ClientOptions = {},
): MCPClient => new MCPClient(name, serverConfig, options);
