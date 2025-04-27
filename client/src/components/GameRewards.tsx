import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/lib/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './ui/card';

interface GameRewardsProps {
  winner: Player;
  players: Player[];
  onClose: () => void;
}

const GameRewards: React.FC<GameRewardsProps> = ({ winner, players, onClose }) => {
  // Sort players by position (1st, 2nd, 3rd, 4th)
  const sortedPlayers = [...players].sort((a, b) => {
    // If both players have position property, sort by it
    if (a.position && b.position) {
      return a.position - b.position;
    }
    // Otherwise fall back to old logic (winner first)
    if (a.id === winner.id) return -1;
    if (b.id === winner.id) return 1;
    return 0;
  });

  // Calculate rewards
  const getReward = (position: number): { points: number; description: string } => {
    switch (position) {
      case 1: // Winner
        return { 
          points: 100, 
          description: "First place! You've mastered the game and earned the highest reward."
        };
      case 2: // Second place
        return { 
          points: 50, 
          description: "Second place. A strong performance that earns you a good reward."
        };
      case 3: // Third place
        return { 
          points: 25, 
          description: "Third place. You've earned some points for your effort."
        };
      case 4: // Fourth place (loser)
        return { 
          points: 5, 
          description: "Better luck next time. A small consolation reward for participating."
        };
      default:
        return { points: 0, description: "" };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Game Rewards</CardTitle>
          <CardDescription>
            {winner.name === players.find(p => !p.isAI)?.name
              ? "Congratulations on your victory!"
              : "The game has ended. Here are the results:"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedPlayers.map((player) => {
              const position = player.position || (player.id === winner.id ? 1 : 4);
              const { points, description } = getReward(position);
              
              // Different styles based on position
              const getBorderStyle = () => {
                switch(position) {
                  case 1: return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30';
                  case 2: return 'border-gray-400 bg-gray-50 dark:bg-gray-800/30';
                  case 3: return 'border-amber-700 bg-amber-50 dark:bg-amber-900/20';
                  case 4: return 'border-red-400 bg-red-50 dark:bg-red-950/20';
                  default: return 'border-muted-foreground/20';
                }
              };
              
              // Position badge text and colors
              const getPositionBadge = () => {
                switch(position) {
                  case 1: return { text: "1st Place", className: "bg-yellow-500 hover:bg-yellow-500" };
                  case 2: return { text: "2nd Place", className: "bg-gray-400 hover:bg-gray-400 text-gray-900" };
                  case 3: return { text: "3rd Place", className: "bg-amber-700 hover:bg-amber-700" };
                  case 4: return { text: "4th Place", className: "bg-red-500 hover:bg-red-500" };
                  default: return { text: "", className: "" };
                }
              };
              
              const positionBadge = getPositionBadge();
              
              return (
                <div 
                  key={player.id} 
                  className={`p-3 rounded-lg border ${getBorderStyle()}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{player.name}</span>
                        {player.isAI && <Badge variant="outline" className="text-xs">AI</Badge>}
                        <Badge className={positionBadge.className}>{positionBadge.text}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <span className="text-lg font-bold">+{points}</span>
                      <span className="text-xs block text-center">points</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default GameRewards;