## Packages
framer-motion | Essential for smooth UI transitions and game feel
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
Game loop will run on client side using requestAnimationFrame or setInterval
State management uses local React state lifted to a provider context for performance
Autosave triggers every 30s to POST /api/game/sync
