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
    
    if (!backgroundMusic) return;
    
    if (isBackgroundMusicPlaying) {
      try {
        // Stop the music safely
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        set({ isBackgroundMusicPlaying: false });
        console.log("Background music stopped");
      } catch (error) {
        console.error("Error stopping background music:", error);
      }
    } else {
      // Start the music if not muted
      if (!isMuted) {
        try {
          backgroundMusic.loop = true;
          backgroundMusic.volume = 0.3;
          
          // Create a promise with a timeout to handle audio context issues
          const playPromise = backgroundMusic.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Background music started successfully");
              })
              .catch(error => {
                console.log("Background music play prevented:", error);
                // Fallback for autoplay policy
                document.addEventListener('click', function audioUnlock() {
                  backgroundMusic.play().catch(() => {});
                  document.removeEventListener('click', audioUnlock);
                }, { once: true });
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
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      successSound.volume = 0.4;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },
  
  playCardFlip: () => {
    const { cardFlipSound, isMuted } = get();
    if (cardFlipSound && !isMuted) {
      try {
        const soundClone = cardFlipSound.cloneNode() as HTMLAudioElement;
        soundClone.volume = 0.2;
        
        // Use safe play method with fallback
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card flip sound play prevented:", error);
            // We won't add the click listener here as it's not as important as music
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
        
        // Use safe play method with fallback
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Card move sound play prevented:", error);
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
        
        // Use safe play method with fallback
        const playPromise = winSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Win sound play prevented:", error);
            // For win sound, we'll add a click listener as it's important
            document.addEventListener('click', function audioUnlock() {
              winSound.play().catch(() => {});
              document.removeEventListener('click', audioUnlock);
            }, { once: true });
          });
        }
      } catch (error) {
        console.error("Error playing win sound:", error);
      }
    }
  }
}));
