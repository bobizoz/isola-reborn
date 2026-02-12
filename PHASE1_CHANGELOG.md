# ISOLA: REBORN - Phase 1 Enhancements

## 🎮 Overview

Phase 1 transforms ISOLA: REBORN into a comprehensive god-mode civilization simulator where players watch tribes organically evolve, compete, and survive while influencing the world as a divine figure.

---

## 🆕 New Features

### 1. Villager System Overhaul

#### Starting Population
- Game now starts with **3-4 villagers** (randomly determined)
- Initial villagers have varied ages, skills, and traits
- Each villager has unique appearance (skin color, hair color)

#### Natural Immigration System
- New villagers arrive periodically without player intervention
- Smaller tribes are more attractive to immigrants
- Immigration can be toggled on/off in World Settings
- Immigrants arrive from map edges seeking a new life

#### Tribe Splitting Mechanics
- When a tribe reaches **8+ population**, there's a chance for a split
- 2-3 villagers will break off to form a new tribe
- New tribe takes 30% of the original tribe's resources
- Split tribes find new territory away from existing tribes
- Each new tribe gets a unique name and color

#### God-Mode Spawning
- Players can summon new villagers for **50 food** (optional power)
- Summoned villagers appear near the selected tribe's center
- Events are logged in the Event Chronicle

### 2. Resource Management

#### Tribe Stockpile System
- Resources are now **tied to each tribe**, not individual villagers:
  - 🍖 **Food** - Consumed when eating, produced by farming
  - 🪵 **Wood** - Gathered from forests
  - 💎 **Stone** - Mined from quarries
  - 🧠 **Tech Points** - Generated through research

#### Resource Flow
- Villagers consume from their tribe's stockpile when eating
- Work activities contribute to the tribe's resources
- Resource production scales with villager skills
- Low food triggers hunger warnings in the UI

### 3. Survival Mechanics

#### Random Events
Toggle-able world events that affect gameplay:

| Event | Effect |
|-------|--------|
| 🐺 **Wildlife Attack** | Dangerous animals appear near tribes |
| ☠️ **Disease Outbreak** | Plague zones that damage villagers |
| ✨ **Divine Blessing** | Bonus food granted to a tribe |

#### Causes of Death
Villagers can die from:
- **Starvation** - When hunger reaches critical levels
- **Wildlife Attacks** - From dangerous animals
- **Disease** - From plague zones
- **Accidents** - Random mishaps (falling, drowning, etc.)

#### Avoidance Behavior
- Villagers detect nearby dangers and **flee** to safety
- **Cautious** trait increases danger detection (90% notice rate)
- **Reckless** trait decreases danger detection (30% notice rate)
- **Lucky** trait reduces accident severity by 50%
- Fleeing villagers move at 2x normal speed

### 4. UI Improvements

#### Tribes Overview Panel (Left Sidebar)
- Lists all tribes with population counts
- Shows tribe resources (food, wood, stone, tech)
- Displays average health bar for each tribe
- Click to select and focus on a tribe
- Expandable details for selected tribe

#### Event Chronicle
- Scrollable log of all game events
- Color-coded by event type:
  - 💀 Red - Deaths
  - 🌟 Blue - Immigration
  - 👥 Purple - Tribe splits
  - 🔥 Orange - Disasters
  - ✨ Yellow - Blessings
- Shows time since event occurred

#### Visual Enhancements
- **Territory circles** show each tribe's domain
- **Tribe colors** on villager clothing
- **Population badges** on tribe centers
- **Danger zones** visible on map with icons
- **Fleeing animation** for escaping villagers
- **Map legend** explaining all symbols

#### Settings Panel
Toggle world mechanics:
- Natural Immigration (on/off)
- Tribe Splitting (on/off)
- Random Events (on/off)

#### Pause/Play
- Pause button to freeze the simulation
- Visual overlay when paused

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/bobizoz/isola-reborn.git
   cd isola-reborn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Start PostgreSQL service
   sudo service postgresql start
   
   # Create database and user
   sudo -u postgres psql -c "CREATE USER isola_user WITH PASSWORD 'isola_pass';"
   sudo -u postgres psql -c "CREATE DATABASE isola_reborn OWNER isola_user;"
   sudo -u postgres psql -d isola_reborn -c "GRANT ALL ON SCHEMA public TO isola_user;"
   ```

4. **Create environment file**
   ```bash
   echo 'DATABASE_URL=postgresql://isola_user:isola_pass@localhost:5432/isola_reborn' > .env
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   Navigate to `http://localhost:5000`

---

## 📁 Project Structure Changes

```
isola-reborn/
├── client/src/
│   ├── components/
│   │   ├── EventLog.tsx        # NEW - Event chronicle panel
│   │   ├── TribesOverview.tsx  # NEW - Tribes list sidebar
│   │   ├── GameCanvas.tsx      # UPDATED - Multi-tribe support
│   │   ├── PriorityPanel.tsx   # UPDATED - Tribe-specific priorities
│   │   ├── ResourceBar.tsx     # UPDATED - Tribe resources display
│   │   └── VillagerInspector.tsx # UPDATED - Shows tribe info
│   ├── hooks/
│   │   └── use-game-api.ts     # UPDATED - Tribe API hooks
│   ├── lib/
│   │   └── game-engine.ts      # UPDATED - Full simulation engine
│   └── pages/
│       └── Game.tsx            # UPDATED - Main game page
├── server/
│   ├── routes.ts               # UPDATED - Tribe endpoints
│   └── storage.ts              # UPDATED - Tribe storage
└── shared/
    ├── schema.ts               # UPDATED - New tables & types
    └── routes.ts               # UPDATED - API definitions
```

---

## 🎯 Gameplay Tips

1. **Watch your food supply** - Starvation is the #1 killer early game
2. **Let tribes grow naturally** - Immigration helps small tribes
3. **Avoid danger zones** - Keep villagers away from 🐺 and ☠️
4. **Use god powers sparingly** - Summoning costs 50 food
5. **Monitor tribe health** - Diseased villagers can spread illness
6. **Prepare for splits** - Large tribes will eventually divide

---

## 🔧 Configuration

### Game Constants (in `game-engine.ts`)

| Constant | Default | Description |
|----------|---------|-------------|
| `IMMIGRATION_CHANCE_PER_TICK` | 0.0003 | Chance of immigrant per tick |
| `MIN_POP_FOR_SPLIT` | 8 | Minimum population for tribe split |
| `SPLIT_CHANCE_PER_TICK` | 0.0001 | Chance of split per tick |
| `STARVATION_THRESHOLD` | 95 | Hunger level that causes damage |
| `RANDOM_EVENT_CHANCE` | 0.0002 | Chance of world event per tick |

---

## 🐛 Known Issues

- Database must be reset if schema changes significantly
- Auto-save occurs every 30 seconds (may cause brief lag)

---

## 📈 Future Phases

- **Phase 2**: Diplomacy system, trade routes, warfare
- **Phase 3**: Building construction, tech tree, seasons
- **Phase 4**: Religion, culture, achievements system
