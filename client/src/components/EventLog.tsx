import { GameEvent } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Skull, UserPlus, Users, Flame, Sparkles, Handshake } from "lucide-react";

interface EventLogProps {
  events: GameEvent[];
  currentTick: number;
}

const eventIcons: Record<GameEvent['type'], React.ReactNode> = {
  birth: <UserPlus className="w-3 h-3 text-green-500" />,
  death: <Skull className="w-3 h-3 text-red-500" />,
  immigration: <Users className="w-3 h-3 text-blue-500" />,
  tribeSplit: <Users className="w-3 h-3 text-purple-500" />,
  disaster: <Flame className="w-3 h-3 text-orange-500" />,
  blessing: <Sparkles className="w-3 h-3 text-yellow-500" />,
  diplomacy: <Handshake className="w-3 h-3 text-cyan-500" />,
};

const eventColors: Record<GameEvent['type'], string> = {
  birth: 'border-green-500/30 bg-green-500/5',
  death: 'border-red-500/30 bg-red-500/5',
  immigration: 'border-blue-500/30 bg-blue-500/5',
  tribeSplit: 'border-purple-500/30 bg-purple-500/5',
  disaster: 'border-orange-500/30 bg-orange-500/5',
  blessing: 'border-yellow-500/30 bg-yellow-500/5',
  diplomacy: 'border-cyan-500/30 bg-cyan-500/5',
};

export function EventLog({ events, currentTick }: EventLogProps) {
  // Show most recent events first, limit to 50
  const sortedEvents = [...events].reverse().slice(0, 50);
  
  const getTimeAgo = (eventTick: number) => {
    const ticksAgo = currentTick - eventTick;
    const daysAgo = Math.floor(ticksAgo / 100);
    if (daysAgo === 0) return 'Just now';
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
  };

  return (
    <div className="retro-box p-3 w-full">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-foreground/10">
        <Bell className="w-4 h-4 text-amber-500" />
        <h3 className="font-pixel text-sm">Event Chronicle</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {events.length} events
        </span>
      </div>
      
      <ScrollArea className="h-[200px]">
        <div className="space-y-1.5 pr-2">
          {sortedEvents.map((event, idx) => (
            <div
              key={`${event.tick}-${idx}`}
              className={`
                flex items-start gap-2 p-2 rounded border-l-2 text-xs
                ${eventColors[event.type]}
                animate-in fade-in slide-in-from-top-1 duration-300
              `}
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <div className="mt-0.5">{eventIcons[event.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground/90 leading-relaxed">{event.message}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">
                  Day {Math.floor(event.tick / 100)} • {getTimeAgo(event.tick)}
                </p>
              </div>
            </div>
          ))}
          
          {events.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No events yet</p>
              <p className="text-xs">History will be recorded here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
