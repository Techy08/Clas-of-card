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
  // Sort players by position (winner first, then others)
  const sortedPlayers = [...players].sort((a, b) => {
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
            {sortedPlayers.map((player, index) => {
              const position = index + 1;
              const { points, description } = getReward(position);
              
              return (
                <div 
                  key={player.id} 
                  className={`p-3 rounded-lg border ${position === 1 ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30' : 'border-muted-foreground/20'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{player.name}</span>
                        {player.isAI && <Badge variant="outline" className="text-xs">AI</Badge>}
                        {position === 1 && (
                          <Badge className="bg-yellow-500 hover:bg-yellow-500">Winner</Badge>
                        )}
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