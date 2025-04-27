import { useState, useRef, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Text, Float, PerspectiveCamera, useTexture } from "@react-three/drei";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAudio } from "@/lib/stores/useAudio";
import { useSocketStore } from "@/lib/stores/useSocketStore";
import ThreeScene from "./ThreeScene";

const Home = () => {
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const { toggleMute, isMuted, backgroundMusic } = useAudio();
  const { initializeSocket } = useSocketStore();

  useEffect(() => {
    // Try to get player name from local storage
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      setPlayerName(savedName);
      setIsNameSet(true);
    }
  }, []);

  const startSoloGame = () => {
    if (!playerName.trim()) return;
    
    localStorage.setItem("playerName", playerName);
    initializeSocket();
    navigate("/game/solo");
  };
  
  const startAIGame = () => {
    if (!playerName.trim()) return;
    
    localStorage.setItem("playerName", playerName);
    
    // Initialize socket and create AI room
    initializeSocket();
    const socket = useSocketStore.getState().socket;
    
    if (socket) {
      useSocketStore.getState().createAIRoom(playerName)
        .then(roomId => {
          navigate(`/lobby?ai=true&roomId=${roomId}`);
        })
        .catch(error => {
          console.error("Failed to create AI game:", error);
          alert("Failed to create AI game. Please try again.");
        });
    }
  };

  const createRoom = () => {
    if (!playerName.trim()) return;
    
    localStorage.setItem("playerName", playerName);
    initializeSocket();
    navigate("/lobby?create=true");
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    
    localStorage.setItem("playerName", playerName);
    initializeSocket();
    navigate(`/lobby?join=${roomCode}`);
  };

  const playRandomGame = () => {
    if (!playerName.trim()) return;
    
    localStorage.setItem("playerName", playerName);
    initializeSocket();
    navigate("/lobby?random=true");
  };

  const handleStartClick = () => {
    if (backgroundMusic && !backgroundMusic.paused && isMuted) {
      toggleMute();
    } else if (backgroundMusic && backgroundMusic.paused && !isMuted) {
      backgroundMusic.play().catch(() => {
        console.log("Audio playback prevented");
      });
    }
    
    if (isNameSet) {
      setShowOptions(true);
    } else {
      setShowJoinDialog(true);
    }
  };

  const handleNameSubmit = () => {
    if (!playerName.trim()) return;
    setIsNameSet(true);
    setShowJoinDialog(false);
    setShowOptions(true);
  };

  return (
    <>
      <Helmet>
        <title>Ram-Sita Adventure | Home</title>
        <meta name="description" content="A Ramayana-themed multiplayer card game" />
      </Helmet>

      <div className="relative w-full h-screen overflow-hidden">
        {/* 3D Canvas Background */}
        <div className="absolute inset-0">
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Suspense fallback={null}>
              <ThreeScene />
            </Suspense>
          </Canvas>
        </div>

        {/* UI Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-2 text-white drop-shadow-lg">
              Ram-Sita Adventure
            </h1>
            <p className="text-xl text-white/80 drop-shadow-md">
              The Epic Card Game
            </p>
          </motion.div>

          {!showOptions ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button 
                size="lg" 
                onClick={handleStartClick}
                className="px-8 py-6 text-xl font-semibold rounded-full"
              >
                Start
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 w-64 sm:w-80"
            >
              <Button 
                variant="default" 
                onClick={startSoloGame}
                className="py-6 text-lg font-semibold"
              >
                Solo Mode
              </Button>
              <Button 
                variant="secondary" 
                onClick={createRoom}
                className="py-6 text-lg font-semibold"
              >
                Create Private Room
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowJoinDialog(true)}
                className="py-6 text-lg font-semibold bg-background/80 backdrop-blur-sm"
              >
                Join Private Room
              </Button>
              <Button 
                variant="destructive" 
                onClick={playRandomGame}
                className="py-6 text-lg font-semibold"
              >
                Play with Random Players
              </Button>
            </motion.div>
          )}

          {/* Sound toggle */}
          <div className="absolute bottom-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="w-12 h-12 rounded-full bg-background/30 backdrop-blur-sm hover:bg-background/50"
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="3" x2="21" y2="21"></line>
                  <path d="M18.36 18.36A9.9 9.9 0 0 1 12 20c-5.5 0-10-4.5-10-10a9.9 9.9 0 0 1 1.64-5.46"></path>
                  <path d="M12 12a3 3 0 0 1-3-3"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
                  <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Name Input Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isNameSet ? "Join Game" : "Enter Your Name"}</DialogTitle>
              <DialogDescription>
                {isNameSet 
                  ? "Enter the room code to join a private game" 
                  : "Please enter your name to continue"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {!isNameSet && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    autoFocus
                  />
                </div>
              )}
              
              {isNameSet && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="room">Room Code</Label>
                  <Input
                    id="room"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Enter room code"
                    autoFocus
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={isNameSet ? joinRoom : handleNameSubmit}>
                  {isNameSet ? "Join Room" : "Continue"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Home;
