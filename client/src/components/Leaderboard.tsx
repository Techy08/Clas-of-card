import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// Leaderboard entry type
interface LeaderboardEntry {
  id: string;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate fetching leaderboard data
    // In a real implementation, this would be an API call
    setTimeout(() => {
      const mockLeaderboard: LeaderboardEntry[] = [
        { id: "1", name: "Ramesh", wins: 45, losses: 12, gamesPlayed: 57, winRate: 78.9 },
        { id: "2", name: "Suresh", wins: 38, losses: 15, gamesPlayed: 53, winRate: 71.7 },
        { id: "3", name: "Mahesh", wins: 32, losses: 18, gamesPlayed: 50, winRate: 64.0 },
        { id: "4", name: "Dinesh", wins: 29, losses: 21, gamesPlayed: 50, winRate: 58.0 },
        { id: "5", name: "Rakesh", wins: 27, losses: 23, gamesPlayed: 50, winRate: 54.0 },
        { id: "6", name: "Nilesh", wins: 25, losses: 25, gamesPlayed: 50, winRate: 50.0 },
        { id: "7", name: "Hitesh", wins: 22, losses: 28, gamesPlayed: 50, winRate: 44.0 },
        { id: "8", name: "Mitesh", wins: 20, losses: 30, gamesPlayed: 50, winRate: 40.0 },
        { id: "9", name: "Ritesh", wins: 18, losses: 32, gamesPlayed: 50, winRate: 36.0 },
        { id: "10", name: "Kamlesh", wins: 15, losses: 35, gamesPlayed: 50, winRate: 30.0 },
      ];
      
      setLeaderboard(mockLeaderboard);
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Get current player name from localStorage
  const currentPlayerName = localStorage.getItem("playerName") || "";
  
  return (
    <>
      <Helmet>
        <title>Ram-Sita Adventure | Leaderboard</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-800 to-pink-800 flex flex-col">
        <header className="bg-background/80 backdrop-blur-sm p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Ram-Sita Adventure</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </header>
        
        <main className="flex-grow flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-background/90 backdrop-blur-md rounded-lg shadow-xl max-w-3xl w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-6 text-center">Leaderboard</h2>
            
            <Tabs defaultValue="wins">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="wins">Wins</TabsTrigger>
                <TabsTrigger value="games">Games Played</TabsTrigger>
                <TabsTrigger value="win-rate">Win Rate</TabsTrigger>
              </TabsList>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <TabsContent value="wins">
                    <LeaderboardTable 
                      data={[...leaderboard].sort((a, b) => b.wins - a.wins)} 
                      currentPlayerName={currentPlayerName} 
                      highlightColumn="wins"
                    />
                  </TabsContent>
                  
                  <TabsContent value="games">
                    <LeaderboardTable 
                      data={[...leaderboard].sort((a, b) => b.gamesPlayed - a.gamesPlayed)} 
                      currentPlayerName={currentPlayerName} 
                      highlightColumn="gamesPlayed"
                    />
                  </TabsContent>
                  
                  <TabsContent value="win-rate">
                    <LeaderboardTable 
                      data={[...leaderboard].sort((a, b) => b.winRate - a.winRate)} 
                      currentPlayerName={currentPlayerName} 
                      highlightColumn="winRate"
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </motion.div>
        </main>
      </div>
    </>
  );
};

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  currentPlayerName: string;
  highlightColumn: keyof LeaderboardEntry;
}

const LeaderboardTable = ({ data, currentPlayerName, highlightColumn }: LeaderboardTableProps) => {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="py-3 px-4 text-left font-medium">Rank</th>
            <th className="py-3 px-4 text-left font-medium">Player</th>
            <th className="py-3 px-4 text-right font-medium">Wins</th>
            <th className="py-3 px-4 text-right font-medium">Games</th>
            <th className="py-3 px-4 text-right font-medium">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const isCurrentPlayer = entry.name === currentPlayerName;
            
            return (
              <tr 
                key={entry.id}
                className={`border-b ${isCurrentPlayer ? "bg-primary/10" : ""} hover:bg-muted/80 transition-colors`}
              >
                <td className="py-3 px-4 text-left">
                  {index + 1}
                </td>
                <td className="py-3 px-4 text-left font-medium">
                  {entry.name}
                  {isCurrentPlayer && " (You)"}
                </td>
                <td className={`py-3 px-4 text-right ${highlightColumn === "wins" ? "font-bold text-primary" : ""}`}>
                  {entry.wins}
                </td>
                <td className={`py-3 px-4 text-right ${highlightColumn === "gamesPlayed" ? "font-bold text-primary" : ""}`}>
                  {entry.gamesPlayed}
                </td>
                <td className={`py-3 px-4 text-right ${highlightColumn === "winRate" ? "font-bold text-primary" : ""}`}>
                  {entry.winRate.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
