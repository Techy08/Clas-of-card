import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSocketStore } from "@/lib/stores/useSocketStore";

const Lobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isFindingGame, setIsFindingGame] = useState(false);
  const [generatedRoomCode, setGeneratedRoomCode] = useState("");
  
  const { 
    socket, 
    isConnected, 
    createRoom, 
    createAIRoom,
    joinRoom
  } = useSocketStore();

  useEffect(() => {
    // Get player name from local storage
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      setPlayerName(savedName);
    } else {
      // Redirect to home if no player name
      navigate("/");
      return;
    }

    // Check URL params for create/join/random
    const params = new URLSearchParams(location.search);
    
    if (params.has("create")) {
      setIsCreating(true);
      handleCreateRoom();
    } else if (params.has("join")) {
      const code = params.get("join") || "";
      if (code) {
        setRoomCode(code);
        handleJoinRoom(code);
      }
    } else if (params.has("random")) {
      setIsFindingGame(true);
      handleFindRandomGame();
    }
  }, [location.search, navigate]);

  // Create new room
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      if (!isConnected) {
        toast.error("Not connected to server");
        return;
      }
      
      const code = await createRoom(playerName);
      setGeneratedRoomCode(code);
      
      // Wait for room creation to complete
      toast.success(`Room created! Code: ${code}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room");
      setIsCreating(false);
    }
  };

  // Join existing room
  const handleJoinRoom = async (code = roomCode) => {
    try {
      setIsJoining(true);
      if (!isConnected) {
        toast.error("Not connected to server");
        return;
      }
      
      if (!code.trim()) {
        toast.error("Please enter a room code");
        setIsJoining(false);
        return;
      }
      
      await joinRoom(code, playerName);
      
      // Navigate to game screen
      navigate(`/game/${code}`);
    } catch (error) {
      console.error("Failed to join room:", error);
      toast.error("Failed to join room");
      setIsJoining(false);
    }
  };

  // Find random game
  const handleFindRandomGame = async () => {
    try {
      setIsFindingGame(true);
      if (!isConnected) {
        toast.error("Not connected to server");
        return;
      }
      
      // Request to join a random room
      socket?.emit("find_random_game", { playerName });
      
      // Listen for response
      socket?.once("random_game_found", ({ roomId }) => {
        navigate(`/game/${roomId}`);
      });
      
      // Handle timeout
      setTimeout(() => {
        if (isFindingGame) {
          toast.error("Could not find a game. Try again later.");
          setIsFindingGame(false);
        }
      }, 10000);
    } catch (error) {
      console.error("Failed to find random game:", error);
      toast.error("Failed to find random game");
      setIsFindingGame(false);
    }
  };

  // Start the created game
  const handleStartGame = () => {
    navigate(`/game/${generatedRoomCode}`);
  };

  // Go back to home
  const handleBack = () => {
    navigate("/");
  };

  // Copy room code to clipboard
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(generatedRoomCode);
    toast.success("Room code copied to clipboard");
  };

  return (
    <>
      <Helmet>
        <title>Ram-Sita Adventure | Lobby</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-800 to-pink-800 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-background/90 backdrop-blur-md rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <h1 className="text-2xl font-bold mb-6 text-center">Game Lobby</h1>

          {isCreating && !generatedRoomCode && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">Creating your room...</p>
            </div>
          )}

          {isCreating && generatedRoomCode && (
            <div className="space-y-6">
              <div className="rounded-md bg-muted p-4">
                <h3 className="font-semibold mb-2">Your Room Code</h3>
                <div className="flex items-center">
                  <code className="bg-background p-2 rounded flex-1 overflow-x-auto">
                    {generatedRoomCode}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCopyRoomCode}
                    className="ml-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-center text-sm text-muted-foreground">
                  Share this code with your friends so they can join your game.
                </p>
                <p className="text-center text-sm font-medium">
                  Waiting for players to join...
                </p>
              </div>
              
              <div className="flex flex-col gap-4">
                <Button onClick={handleStartGame}>
                  Start Game
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isJoining && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">Joining room {roomCode}...</p>
            </div>
          )}

          {isFindingGame && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-center">Finding a game for you...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
              <Button 
                variant="outline" 
                className="mt-6" 
                onClick={() => {
                  setIsFindingGame(false);
                  navigate("/");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {!isCreating && !isJoining && !isFindingGame && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Join Existing Room</h3>
                  <div className="flex gap-2">
                    <Input
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="Enter room code"
                    />
                    <Button 
                      onClick={() => handleJoinRoom()}
                      disabled={!roomCode.trim()}
                    >
                      Join
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Create New Room</h3>
                  <Button 
                    onClick={handleCreateRoom}
                    className="w-full"
                  >
                    Create Room
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Quick Play</h3>
                  <Button 
                    onClick={handleFindRandomGame}
                    variant="secondary"
                    className="w-full"
                  >
                    Find Random Players
                  </Button>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default Lobby;
