import React, { useMemo } from "react";

// A simple background component that doesn't use Three.js
// This helps avoid WebGL compatibility issues on some systems
const ThreeScene: React.FC = () => {
  // Pre-calculate random star positions to avoid re-rendering issues
  const stars = useMemo(() => {
    return Array.from({ length: 100 }).map(() => ({
      size: Math.random() * 2 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.7 + 0.3,
      delay: Math.random() * 5
    }));
  }, []);
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-800"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        {/* Stars */}
        <div className="stars">
          {stars.map((star, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                top: star.top,
                left: star.left,
                opacity: star.opacity,
                animationDelay: `${star.delay}s`
              }}
            />
          ))}
        </div>
        
        {/* Card floating elements - each representing the different card types */}
        <div className="absolute top-1/4 left-1/4 w-16 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md shadow-lg opacity-70 transform rotate-12 animate-float" />
        <div className="absolute top-1/3 right-1/4 w-16 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-md shadow-lg opacity-70 transform -rotate-6 animate-float-delayed" />
        <div className="absolute bottom-1/3 left-1/3 w-16 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md shadow-lg opacity-70 transform rotate-3 animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/3 w-16 h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-md shadow-lg opacity-70 transform -rotate-12 animate-float-slower" />
        
        {/* Ram Chaal special card */}
        <div className="absolute top-1/2 left-1/2 w-20 h-28 bg-gradient-to-br from-amber-300 to-amber-600 rounded-md shadow-xl opacity-80 transform -translate-x-1/2 -translate-y-1/2 rotate-6 animate-pulse-subtle" />
      </div>
    </div>
  );
};

export default ThreeScene;
