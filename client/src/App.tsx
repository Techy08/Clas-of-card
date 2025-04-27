import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Home from "./components/Home";
import Game from "./components/Game";
import Lobby from "./components/Lobby";
import Leaderboard from "./components/Leaderboard";
import NotFound from "./pages/not-found";
import AudioManager from "./components/AudioManager";
import "@fontsource/inter";
import * as THREE from "three";

function App() {
  // Handle WebGL context loss and recovery (especially important for Radeon GPUs)
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.log("THREE.WebGLRenderer: Context Lost. Attempting to recover...");
    };

    const handleContextRestored = () => {
      console.log("THREE.WebGLRenderer: Context Restored!");
    };

    // Configure THREE.js for better stability
    THREE.Cache.enabled = true;
    
    // Use lower precision to improve compatibility with problematic GPUs
    if (typeof window !== 'undefined') {
      (window as any).lowGfxMode = true; // Global flag that can be checked elsewhere
    }
    
    // Add global event listeners for context issues
    window.addEventListener('webglcontextlost', handleContextLost, false);
    window.addEventListener('webglcontextrestored', handleContextRestored, false);
    
    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          {/* AudioManager with global mute control */}
          <AudioManager showControls={true} />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
