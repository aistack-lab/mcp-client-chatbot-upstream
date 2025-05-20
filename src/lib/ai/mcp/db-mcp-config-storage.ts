import type { MCPServerConfig } from "app-types/mcp";
import type {
  MCPClientsManager,
  MCPConfigStorage,
} from "./create-mcp-clients-manager";
import { mcpRepository } from "lib/db/repository";
import logger from "logger";
import { createDebounce } from "lib/utils";

export function createDbBasedMCPConfigsStorage(): MCPConfigStorage {
  const debounce = createDebounce();
  let manager: MCPClientsManager;

  // Cache of last known server configs to avoid unnecessary refreshes
  let lastServerConfigs: Record<string, string> = {};
  
  // Function to refresh clients when configs change
  const refreshClients = async () => {
      try {
        logger.info("Starting MCP clients refresh cycle");
        const servers = await mcpRepository.selectAllServers();
        logger.info(`Found ${servers.length} server configurations in database`);

        // Get all current clients
        const currentClients = new Set(
          manager.getClients().map((c) => c.getInfo().name),
        );
        logger.info(`Current active clients: ${Array.from(currentClients).join(', ') || 'none'}`);

        // Track which configs have actually changed
        const changedConfigs = new Set<string>();
        const newServerConfigs: Record<string, string> = {};
        
        // Check for new, updated, or removed servers
        for (const server of servers) {
          if (server.enabled) {
            // Create a string representation of the config for comparison
            const configStr = JSON.stringify(server.config);
            newServerConfigs[server.name] = configStr;
            
            // Check if this server is new or its config has changed
            if (!lastServerConfigs[server.name] || lastServerConfigs[server.name] !== configStr) {
              changedConfigs.add(server.name);
            }
          }
        }
        
        // Check for removed servers
        for (const cachedServerName of Object.keys(lastServerConfigs)) {
          if (!newServerConfigs[cachedServerName]) {
            changedConfigs.add(cachedServerName);
          }
        }
        
        // If no changes detected, skip the refresh
        if (changedConfigs.size === 0) {
          logger.info("No MCP client configuration changes detected, skipping refresh");
          return;
        }
        
        logger.info(`Detected changes for servers: ${Array.from(changedConfigs).join(', ')}`);
        
        // Process new or updated clients
        let refreshCount = 0;
        let addCount = 0;
        for (const server of servers) {
          if (server.enabled) {
            if (currentClients.has(server.name)) {
              // Only refresh if config has changed
              if (changedConfigs.has(server.name)) {
                logger.info(`Refreshing existing client with updated config: ${server.name}`);
                await manager.refreshClient(server.name, server.config);
                refreshCount++;
              } else {
                logger.debug(`Skipping refresh for unchanged client: ${server.name}`);
              }
            } else {
              // Add new client
              logger.info(`Adding new client: ${server.name}`);
              await manager.addClient(server.name, server.config);
              addCount++;
            }
            currentClients.delete(server.name);
          } else {
            logger.info(`Skipping disabled server: ${server.name}`);
          }
        }
      
        logger.info(`Refresh summary: ${refreshCount} clients refreshed, ${addCount} clients added`);

        // Remove clients that no longer exist in database or are disabled
        let removeCount = 0;
        for (const clientName of currentClients) {
          logger.info(`Removing client not in database: ${clientName}`);
          await manager.removeClient(clientName);
          removeCount++;
        }
      
        logger.info(`Removed ${removeCount} clients that no longer exist in database`);
        logger.info("MCP clients refresh cycle completed successfully");
        
        // Update the cache with new configs
        lastServerConfigs = newServerConfigs;
      } catch (error) {
        logger.error("Failed to refresh MCP clients from database:", error);
      }
    };

  return {
    async init(_manager: MCPClientsManager): Promise<void> {
      manager = _manager;

      // Initial load of configs
      await refreshClients();

      // Set up polling for changes in database environment
      // This is needed since we can't directly watch database changes
      // Using a longer interval to reduce unnecessary refreshes
      logger.info("Setting up MCP clients refresh polling (5min interval)");
      const pollingInterval = setInterval(() => {
        logger.debug("MCP refresh polling triggered");
        debounce(refreshClients, 1000);
      }, 5 * 60 * 1000); // 5 minutes
      
      // Add cleanup for the interval
      process.on('SIGINT', () => clearInterval(pollingInterval));
      process.on('SIGTERM', () => clearInterval(pollingInterval));
    },

    async loadAll(): Promise<Record<string, MCPServerConfig>> {
      try {
        logger.info("Attempting to load MCP server configurations from database");
        const servers = await mcpRepository.selectAllServers();
        logger.info(`Successfully loaded ${servers.length} MCP server configurations`);
        return Object.fromEntries(
          servers
            .filter((server) => server.enabled)
            .map((server) => [server.name, server.config]),
        );
      } catch (error) {
        logger.error("Failed to load MCP configs from database:", error);
        return {};
      }
    },

    async save(name: string, config: MCPServerConfig): Promise<void> {
      try {
        const existingServer = await mcpRepository.selectServerByName(name);

        if (existingServer) {
          await mcpRepository.updateServer(existingServer.id, { config });
        } else {
          await mcpRepository.insertServer({ name, config });
        }

        // Trigger a refresh to apply changes
        debounce(refreshClients, 1000);
      } catch (error) {
        logger.error(`Failed to save MCP config "${name}" to database:`, error);
        throw error;
      }
    },

    async delete(name: string): Promise<void> {
      try {
        const server = await mcpRepository.selectServerByName(name);
        if (server) {
          await mcpRepository.deleteServer(server.id);
        }

        // Trigger a refresh to apply changes
        debounce(refreshClients, 1000);
      } catch (error) {
        logger.error(
          `Failed to delete MCP config "${name}" from database:`,
          error,
        );
        throw error;
      }
    },

    async has(name: string): Promise<boolean> {
      try {
        // Note: If you want to use `existsServerWithName` directly,
        // this logic might need a slight adjustment depending on whether
        // `existsServerWithName` also considers the `enabled` flag.
        // For now, keeping the existing logic which checks `enabled`.
        const server = await mcpRepository.selectServerByName(name);
        return !!server && server.enabled;
      } catch (error) {
        logger.error(
          `Failed to check if MCP config "${name}" exists in database:`,
          error,
        );
        return false;
      }
    },
  };
}
