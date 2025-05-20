import type { MCPServerConfig } from "app-types/mcp";
import { createMCPClient, type MCPClient } from "./create-mcp-client";
import equal from "fast-deep-equal";
import logger from "logger";
import { createMCPToolId } from "./mcp-tool-id";
/**
 * Interface for storage of MCP server configurations.
 * Implementations should handle persistent storage of server configs.
 *
 * IMPORTANT: When implementing this interface, be aware that:
 * - Storage can be modified externally (e.g., file edited manually)
 * - Concurrent modifications may occur from multiple processes
 * - Implementations should either handle these scenarios or document limitations
 */
export interface MCPConfigStorage {
  init(manager: MCPClientsManager): Promise<void>;
  loadAll(): Promise<Record<string, MCPServerConfig>>;
  save(name: string, config: MCPServerConfig): Promise<void>;
  delete(name: string): Promise<void>;
  has(name: string): Promise<boolean>;
}

export class MCPClientsManager {
  protected clients = new Map<string, MCPClient>();

  private initialized = false;

  // Optional storage for persistent configurations
  // Track whether we're in the process of refreshing to prevent overlapping refresh operations
  private isRefreshing = false;
  
  constructor(private storage?: MCPConfigStorage) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
    
    // Set a timer to clean up disconnected clients periodically
    setInterval(() => this.cleanupDisconnectedClients(), 15 * 60 * 1000); // 15 minutes
  }
  
  // Helper method to clean up clients that have been disconnected for a while
  private async cleanupDisconnectedClients() {
    for (const [name, client] of this.clients.entries()) {
      if (client.getInfo().status === "disconnected") {
        logger.info(`Removing stale disconnected client: ${name}`);
        this.clients.delete(name);
      }
    }
  }

  async init() {
    if (this.initialized) {
      logger.info("MCPClientsManager already initialized, skipping");
      return;
    }
    
    try {
      logger.info("Initializing MCPClientsManager");
      if (this.storage) {
        logger.info("Initializing MCP config storage");
        await this.storage.init(this);
        
        logger.info("Loading MCP server configurations");
        const configs = await this.storage.loadAll();
        logger.info(`Found ${Object.keys(configs).length} MCP server configurations`);
        
        if (Object.keys(configs).length > 0) {
          logger.info("Initializing MCP clients");
          
          // Initialize clients sequentially to avoid overwhelming the system
          for (const [name, serverConfig] of Object.entries(configs)) {
            try {
              logger.info(`Initializing client: ${name}`);
              await this.addClient(name, serverConfig);
              logger.info(`Successfully initialized client: ${name}`);
            } catch (error) {
              logger.error(`Failed to initialize client ${name}:`, error);
              // Don't throw here, continue with other clients
            }
            
            // Small delay between initializations to prevent resource contention
            if (Object.keys(configs).length > 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      this.initialized = true;
      logger.info("MCPClientsManager initialization complete");
    } catch (error) {
      logger.error("Failed to initialize MCPClientsManager:", error);
      // Don't set initialized = true if we failed
      throw error;
    }
  }

  /**
   * Returns all tools from all clients as a flat object
   */
  tools() {
    return Object.fromEntries(
      Array.from(this.clients.values())
        .filter((client) => client.getInfo().status === "connected")
        .flatMap((client) =>
          Object.entries(client.tools).map(([name, tool]) => [
            createMCPToolId(client.getInfo().name, name),
            tool,
          ]),
        ),
    );
  }

  /**
   * Returns all prompts from all clients with server name prefix
   */
  prompts() {
    return Object.fromEntries(
      Array.from(this.clients.values())
        .filter((client) => client.getInfo().status === "connected")
        .flatMap((client) => {
          const serverInfo = client.getInfo();
          // Use promptInfo which contains the full MCPPromptInfo including arguments
          return (serverInfo.promptInfo || []).map((promptInfoItem) => [
            `${serverInfo.name}/${promptInfoItem.name}`,
            { 
              name: promptInfoItem.name,
              description: promptInfoItem.description,
              arguments: promptInfoItem.arguments, // Now arguments are included
              serverName: serverInfo.name,
              // Note: The 'execute' function is not part of MCPPromptInfo.
              // The executePrompt method on the manager handles actual execution.
            }
          ]);
        }),
    );
  }

  /**
   * Adds a new client with the given name and configuration
   */
  async addClient(name: string, serverConfig: MCPServerConfig) {
    // Check if client already exists with same config
    const existingClient = this.clients.get(name);
    if (existingClient) {
      const currentConfig = existingClient.getInfo().config;
      if (equal(currentConfig, serverConfig) && existingClient.getInfo().status === "connected") {
        logger.info(`Client ${name} already exists with identical config and is connected, skipping`);
        return existingClient;
      }
    }
    
    try {
      if (this.storage) {
        if (!(await this.storage.has(name))) {
          logger.info(`Saving new client config for ${name}`);
          await this.storage.save(name, serverConfig);
        }
      }
      
      // Clean up existing client if present
      if (existingClient) {
        logger.info(`Removing existing client ${name} before creating new one`);
        await existingClient.disconnect().catch(error => {
          logger.warn(`Error disconnecting existing client ${name}:`, error);
        });
        this.clients.delete(name);
      }
      
      logger.info(`Creating new MCP client for ${name}`);
      const client = createMCPClient(name, serverConfig, {
        // Set a longer auto-disconnect timeout to reduce reconnection frequency
        autoDisconnectSeconds: 3600 // 1 hour
      });
      this.clients.set(name, client);
      
      logger.info(`Connecting to MCP server ${name}`);
      return client.connect();
    } catch (error) {
      logger.error(`Failed to add client ${name}:`, error);
      
      // Remove the client from the map if connection fails
      // to prevent a zombie client
      this.clients.delete(name);
      throw error;
    }
  }

  /**
   * Removes a client by name, disposing resources and removing from storage
   */
  async removeClient(name: string) {
    try {
      logger.info(`Removing client ${name}`);
      
      if (this.storage) {
        if (await this.storage.has(name)) {
          logger.info(`Deleting client ${name} from storage`);
          await this.storage.delete(name);
        }
      }
      
      const client = this.clients.get(name);
      if (client) {
        logger.info(`Disconnecting client ${name}`);
        // Get the client before deleting it from the map
        await client.disconnect().catch(error => {
          logger.error(`Error disconnecting client ${name}:`, error);
          // Continue with removal even if disconnect fails
        });
      }
      
      // Remove from map regardless of disconnect success
      this.clients.delete(name);
      logger.info(`Client ${name} successfully removed`);
    } catch (error) {
      logger.error(`Error removing client ${name}:`, error);
      throw error;
    }
  }

  /**
   * Refreshes an existing client with a new configuration or its existing config
   */
  async refreshClient(name: string, updateConfig?: MCPServerConfig) {
    // Check if we're already refreshing to prevent overlapping operations
    if (this.isRefreshing) {
      logger.info(`Another refresh operation is in progress, deferring refresh for ${name}`);
      return this.clients.get(name);
    }
    
    this.isRefreshing = true;
    
    try {
      const prevClient = this.clients.get(name);
      if (!prevClient) {
        throw new Error(`Client ${name} not found`);
      }

      const currentConfig = prevClient.getInfo().config;
      const config = updateConfig ?? currentConfig;

      // Skip refresh if config hasn't changed and client is already connected
      if (equal(currentConfig, config) && prevClient.getInfo().status === "connected") {
        logger.info(`Skipping refresh for ${name} - config unchanged and client already connected`);
        return prevClient;
      }

      try {
        // Only save if config changed to avoid unnecessary DB writes
        if (this.storage && config && !equal(currentConfig, config)) {
          logger.info(`Saving updated config for client ${name}`);
          await this.storage.save(name, config);
        }

        // Only disconnect/reconnect if the client is currently connected or if config changed
        if (prevClient.getInfo().status === "connected" || !equal(currentConfig, config)) {
          logger.info(`Disconnecting client ${name} before refresh`);
          await prevClient.disconnect().catch((error) => {
            logger.error(`Error disposing client ${name}:`, error);
          });

          // Brief pause to ensure proper shutdown before reconnecting
          await new Promise(resolve => setTimeout(resolve, 1000));

          logger.info(`Reconnecting client ${name} with ${updateConfig ? 'new' : 'existing'} config`);
          return this.addClient(name, config);
        } else {
          // Client is already disconnected, just recreate and connect
          logger.info(`Client ${name} already disconnected, creating new instance`);
          this.clients.delete(name);
          return this.addClient(name, config);
        }
      } catch (error) {
        logger.error(`Failed to refresh client ${name}:`, error);
        
        // Keep the original client in the map to prevent loss of the client
        // This prevents a situation where a client is removed but can't be readded
        if (!this.clients.has(name)) {
          this.clients.set(name, prevClient);
        }
        
        throw error;
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  async cleanup() {
    logger.info(`Cleaning up ${this.clients.size} MCP clients`);
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    
    const results = await Promise.allSettled(
      clients.map((client) => {
        const clientName = client.getInfo().name;
        logger.info(`Disconnecting client ${clientName} during cleanup`);
        return client.disconnect()
          .catch(error => {
            logger.error(`Error disconnecting client ${clientName} during cleanup:`, error);
            // Re-throw so Promise.allSettled captures the failure
            throw error;
          });
      })
    );
    
    const failureCount = results.filter(r => r.status === 'rejected').length;
    if (failureCount > 0) {
      logger.warn(`${failureCount} client(s) failed to disconnect properly during cleanup`);
    }
    
    logger.info('MCP clients cleanup complete');
  }

  getClients() {
    return Array.from(this.clients.values());
  }
  
  /**
   * Execute a prompt from a specific MCP server
   */
  async executePrompt(serverName: string, promptName: string, args: Record<string, any>) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    
    if (!client.prompts[promptName]) {
      throw new Error(`Prompt "${promptName}" not found in server "${serverName}"`);
    }
    
    return client.prompts[promptName].execute(args);
  }
}

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  options?: { refreshInterval?: number }
): MCPClientsManager {
  // Set a longer refresh interval by default (5 minutes)
  const refreshInterval = options?.refreshInterval ?? 5 * 60 * 1000;
  logger.info(`Creating MCP Clients Manager with refresh interval of ${refreshInterval/1000}s`);
  return new MCPClientsManager(storage);
}
