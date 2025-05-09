import { useEffect, useRef } from 'react';
import { useAudio } from '@/lib/stores/useAudio';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

/**
 * AudioManager component handles loading and initializing all game audio
 * It also provides a mute button that can be displayed in the UI
 * This component also persists the audio state between page refreshes
 */
const AudioManager = ({ showControls = true }: { showControls?: boolean }) => {
  const {
    setBackgroundMusic,
    setCardFlipSound,
    setCardMoveSound,
    setHitSound,
    setSuccessSound,
    setWinSound,
    toggleBackgroundMusic,
    toggleMute,
    isMuted,
    isBackgroundMusicPlaying
  } = useAudio();
  
  const soundsLoaded = useRef(false);
  
  // Handle visibility change (tab switching)
  useEffect(() => {
    // Resume background music when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        try {
          // Optimized for Vercel serverless environment
          const shouldPlayMusic = typeof window !== 'undefined' && window.sessionStorage 
            ? window.sessionStorage.getItem('backgroundMusicPlaying')
            : null;
          const { backgroundMusic, isMuted, isBackgroundMusicPlaying } = useAudio.getState();
          
          if (shouldPlayMusic === 'true' && !isMuted && backgroundMusic && !isBackgroundMusicPlaying) {
            console.log("Tab visible again, resuming background music");
            backgroundMusic.play().catch(error => {
              console.log("Could not resume background music:", error);
            });
          }
        } catch (error) {
          console.log("Error handling visibility change:", error);
        }
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Load and initialize all audio files
  useEffect(() => {
    if (soundsLoaded.current) return;
    
    // Function to load audio files
    const loadAudio = async () => {
      try {
        // Background music
        const bgMusic = new Audio('/sounds/background.mp3');
        bgMusic.volume = 0.3;
        bgMusic.loop = true;
        setBackgroundMusic(bgMusic);
        
        // Card sounds - fallback to existing sounds since files are empty
        const cardFlip = new Audio('/sounds/hit.mp3');
        cardFlip.volume = 0.2; // Lower volume for card flip
        setCardFlipSound(cardFlip);
        
        const cardMove = new Audio('/sounds/hit.mp3');
        cardMove.volume = 0.25; // Adjusted volume for card move
        setCardMoveSound(cardMove);
        
        // Game sounds
        const hit = new Audio('/sounds/hit.mp3');
        setHitSound(hit);
        
        const success = new Audio('/sounds/success.mp3');
        setSuccessSound(success);
        
        const win = new Audio('/sounds/success.mp3'); // Fallback to success sound
        win.volume = 0.5; // Higher volume for win
        setWinSound(win);
        
        // Check if background music should be playing based on session storage
        // Using Vercel-optimized code for serverless environment
        try {
          const shouldPlayMusic = typeof window !== 'undefined' && window.sessionStorage 
            ? window.sessionStorage.getItem('backgroundMusicPlaying')
            : null;
            
          if (shouldPlayMusic === 'true' && !isBackgroundMusicPlaying) {
            console.log("Resuming background music from saved state");
            toggleBackgroundMusic();
          } else if (!shouldPlayMusic && !isBackgroundMusicPlaying) {
            // Start playing background music by default for new sessions
            console.log("Starting background music (new session)");
            toggleBackgroundMusic();
          }
        } catch (error) {
          // If session storage is not available, just start the music
          console.log("Session storage not available, starting music by default");
          if (!isBackgroundMusicPlaying) {
            toggleBackgroundMusic();
          }
        }
        
        soundsLoaded.current = true;
        console.log("Game audio loaded successfully");
      } catch (error) {
        console.error("Error loading audio:", error);
      }
    };
    
    // Load audio with a slight delay to avoid blocking the UI
    const timer = setTimeout(() => {
      loadAudio();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [
    setBackgroundMusic, 
    setCardFlipSound, 
    setCardMoveSound, 
    setHitSound, 
    setSuccessSound,
    setWinSound,
    toggleBackgroundMusic,
    isBackgroundMusicPlaying
  ]);
  
  if (!showControls) return null;
  
  // UI for sound controls
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm"
        onClick={toggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>
      
      {/* Optional music toggle */}
      {!isMuted && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs bg-background/80 backdrop-blur-sm"
          onClick={toggleBackgroundMusic}
        >
          Music: {isBackgroundMusicPlaying ? "On" : "Off"}
        </Button>
      )}
    </div>
  );
};

export default AudioManager;