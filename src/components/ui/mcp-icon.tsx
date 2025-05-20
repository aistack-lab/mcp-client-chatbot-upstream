import { Icon } from '@iconify/react';

export function MCPIcon({ className }: { className?: string }) {
  return (
    <Icon 
      icon="codicon:mcp" 
      className={className}
      aria-hidden="true"
    />
  );
}
