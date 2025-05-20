import { Icon } from '@iconify/react';

export function GithubIcon({ className }: { className?: string }) {
  return (
    <Icon 
      icon="mdi:github" 
      className={className}
      aria-hidden="true"
    />
  );
}
