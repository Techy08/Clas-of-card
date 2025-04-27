import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  cardFlipSound: HTMLAudioElement | null;
  cardMoveSound: HTMLAudioElement | null;
  winSound: HTMLAudioElement | null;
  isMuted: boolean;
  isBackgroundMusicPlaying: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setCardFlipSound: (sound: HTMLAudioElement) => void;
  setCardMoveSound: (sound: HTMLAudioElement) => void;
  setWinSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  toggleBackgroundMusic: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playCardFlip: () => void;
  playCardMove: () => void;
  playWinSound: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  cardFlipSound: null,
  cardMoveSound: null,
  winSound: null,
  isMuted: false, // Start with sound enabled
  isBackgroundMusicPlaying: false,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setCardFlipSound: (sound) => set({ cardFlipSound: sound }),
  setCardMoveSound: (sound) => set({ cardMoveSound: sound }),
  setWinSound: (sound) => set({ winSound: sound }),
  
  toggleMute: () => {
    const { isMuted, backgroundMusic, isBackgroundMusicPlaying } = get();
    const newMutedState = !isMuted;
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    // If we're unmuting and background music was playing, restart it
    if (!newMutedState && backgroundMusic && isBackgroundMusicPlaying) {
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
    
    // If we're muting and background music is playing, pause it
    if (newMutedState && backgroundMusic && isBackgroundMusicPlaying) {
      backgroundMusic.pause();
    }
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  toggleBackgroundMusic: () => {
    const { backgroundMusic, isMuted, isBackgroundMusicPlaying } = get();
    
    // Safety check for Vercel deployment - audio might not be loaded yet
    if (!backgroundMusic) {
      console.log("Background music not loaded yet");
      return;
    }
    
    if (isBackgroundMusicPlaying) {
      try {
        // Stop the music safely
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        set({ isBackgroundMusicPlaying: false });
        console.log("Background music stopped");
        
        // Remove from session storage when music is stopped
        try {
          sessionStorage.removeItem('backgroundMusicPlaying');
        } catch (error) {
          // Session storage might not be available in some contexts
          console.log("Could not access session storage:", error);
        }
      } catch (error) {
        console.error("Error stopping background music:", error);
      }
    } else {
      // Start the music if not muted
      if (!isMuted) {
        try {
          // Ensure proper setup before playing (important for Vercel deployment)
          backgroundMusic.loop = true;
          backgroundMusic.volume = 0.3;
          backgroundMusic.crossOrigin = "anonymous"; // Enable cross-origin audio - helps with CDN on Vercel
          
          // Set persistent flag to remember music should be playing
          try {
            sessionStorage.setItem('backgroundMusicPlaying', 'true');
          } catch (error) {
            // Session storage might not be available in some contexts
            console.log("Could not access session storage:", error);
          }
          
          // Create a promise with a timeout to handle audio context issues
          const playPromise = backgroundMusic.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Background music started successfully");
              })
              .catch(error => {
                console.log("Background music play prevented:", error);
                // Enhanced fallback for autoplay policy - works better on deployed environments
                const unlockAudio = () => {
                  // Try to play, but don't worry if it fails again
                  backgroundMusic.play().catch(() => {
                    console.log("Still couldn't play audio - will try on next user interaction");
                  });
                  
                  // Clean up event listeners
                  document.removeEventListener('click', unlockAudio);
                  document.removeEventListener('touchstart', unlockAudio);
                  document.removeEventListener('keydown', unlockAudio);
                };
                
                // Add multiple event listeners for better compatibility
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
                document.addEventListener('keydown', unlockAudio, { once: true });
              });
          }
        } catch (error) {
          console.error("Error starting background music:", error);
        }
      }
      set({ isBackgroundMusicPlaying: true });
      console.log("Background music started");
    }
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound && !isMuted) {
      try {
        // Clone the sound to allow overlapping playback
        const soundClone = hitSound.cloneNode() as HTMLAudioElement;
        soundClone.volume = 0.3;
        soundClone.crossOrigin = "anonymous"; // Add cross-origin support for Vercel
        
        // Use safe play method with improved error handling
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              console.log("Hit sound blocked by browser autoplay policy");
            } else {
              console.error("Hit sound play error:", error.message);
            }
          });
        }
      } catch (error) {
        console.error("Error playing hit sound:", error);
      }
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      try {
        successSound.currentTime = 0;
        successSound.volume = 0.4;
        successSound.crossOrigin = "anonymous"; // Add cross-origin support for Vercel
        
        // Use safe play method with improved error handling
        const playPromise = successSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              console.log("Success sound blocked by browser autoplay policy");
            } else {
              console.error("Success sound play error:", error.message);
            }
          });
        }
      } catch (error) {
        console.error("Error playing success sound:", error);
      }
    }
  },
  
  playCardFlip: () => {
    const { cardFlipSound, isMuted } = get();
    if (cardFlipSound && !isMuted) {
      try {
        const soundClone = cardFlipSound.cloneNode() as HTMLAudioElement;
        soundClone.volume = 0.2;
        soundClone.crossOrigin = "anonymous"; // Add cross-origin support for Vercel
        
        // Use safe play method with improved error handling for Vercel deployment
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card flip sound play prevented:", error);
            // We don't add the listener here, but in production it's still good to know what happened
            if (process.env.NODE_ENV === 'production') {
              console.log("This is likely due to autoplay restrictions in the browser");
            }
          });
        }
      } catch (error) {
        console.error("Error playing card flip sound:", error);
      }
    }
  },
  
  playCardMove: () => {
    const { cardMoveSound, isMuted } = get();
    if (cardMoveSound && !isMuted) {
      try {
        const soundClone = cardMoveSound.cloneNode() as HTMLAudioElement; 
        soundClone.volume = 0.25;
        soundClone.crossOrigin = "anonymous"; // Add cross-origin support for Vercel
        
        // Use safe play method with improved error handling
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              // This is expected on some browsers due to autoplay policy
              console.log("Card move sound blocked by browser autoplay policy");
            } else {
              // This is an unexpected error and should be logged
              console.error("Card move sound play error:", error.message);
            }
          });
        }
      } catch (error) {
        console.error("Error playing card move sound:", error);
      }
    }
  },
  
  playWinSound: () => {
    const { winSound, isMuted } = get();
    if (winSound && !isMuted) {
      try {
        // Win sound is important, so we'll make sure it resets properly
        winSound.currentTime = 0;
        winSound.volume = 0.5;
        winSound.crossOrigin = "anonymous"; // Enable cross-origin audio for Vercel deployment
        
        // Use safe play method with enhanced fallback for Vercel deployment
        const playPromise = winSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Win sound play prevented:", error);
            
            // Enhanced audio unlock with multiple event types
            const unlockWinAudio = () => {
              winSound.play().catch(() => {
                console.log("Still couldn't play win sound - will try again on next interaction");
              });
              
              // Clean up event listeners
              document.removeEventListener('click', unlockWinAudio);
              document.removeEventListener('touchstart', unlockWinAudio);
              document.removeEventListener('keydown', unlockWinAudio);
            };
            
            // Add multiple event listeners for better compatibility
            document.addEventListener('click', unlockWinAudio, { once: true });
            document.addEventListener('touchstart', unlockWinAudio, { once: true });
            document.addEventListener('keydown', unlockWinAudio, { once: true });
          });
        }
      } catch (error) {
        console.error("Error playing win sound:", error);
      }
    }
  }
}));
