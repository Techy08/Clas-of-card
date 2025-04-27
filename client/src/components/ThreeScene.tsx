import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";

// Floating cards component
const FloatingCards = () => {
  const cardsRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  
  // Create floating cards with different colors
  const cards = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * viewport.width * 2,
        (Math.random() - 0.5) * viewport.height * 2,
        (Math.random() - 0.5) * 5 - 3
      ],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ],
      scale: 0.1 + Math.random() * 0.15,
      color: [
        ['#FFD700', '#DC143C', '#9370DB', '#4169E1'][Math.floor(Math.random() * 4)],
        ['#FF6347', '#6A5ACD', '#20B2AA', '#FF4500'][Math.floor(Math.random() * 4)]
      ][Math.floor(Math.random() * 2)],
      speed: 0.002 + Math.random() * 0.004
    }));
  }, [viewport]);

  useFrame((state) => {
    if (!cardsRef.current) return;
    
    // Rotate the entire card group
    cardsRef.current.rotation.y += 0.001;
    
    // Update each card individually
    cardsRef.current.children.forEach((card, i) => {
      // Add floating motion
      card.position.y += Math.sin(state.clock.elapsedTime * cards[i].speed) * 0.005;
      // Slow rotation
      card.rotation.x += 0.001;
      card.rotation.y += 0.002;
    });
  });

  return (
    <group ref={cardsRef}>
      {cards.map((card, i) => (
        <mesh 
          key={i} 
          position={card.position as [number, number, number]} 
          rotation={card.rotation as [number, number, number]} 
          scale={card.scale}
        >
          <boxGeometry args={[5, 7, 0.2]} />
          <meshStandardMaterial color={card.color} />
        </mesh>
      ))}
    </group>
  );
};

// Glowing symbol component
const GlowingSymbol = () => {
  const symbolRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (symbolRef.current && glowRef.current) {
      // Animate glow
      gsap.to(glowRef.current.scale, {
        x: 1.2, 
        y: 1.2, 
        z: 1.2, 
        duration: 1.5, 
        repeat: -1, 
        yoyo: true,
        ease: "power1.inOut"
      });
      
      // Animate symbol
      gsap.to(symbolRef.current.rotation, {
        y: Math.PI * 2,
        duration: 10,
        repeat: -1,
        ease: "none"
      });
    }
  }, []);
  
  return (
    <group position={[0, 0, -4]}>
      {/* Symbol */}
      <mesh ref={symbolRef}>
        <torusGeometry args={[1.5, 0.3, 16, 50]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} scale={[1, 1, 1]}>
        <torusGeometry args={[1.5, 0.4, 16, 50]} />
        <meshStandardMaterial 
          color="#FFA500" 
          transparent={true} 
          opacity={0.4}
          emissive="#FFA500"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
};

// Background component
const Background = () => {
  const texture = useTexture("/textures/sky.png");
  
  // Create a larger background sphere
  return (
    <mesh position={[0, 0, -10]}>
      <sphereGeometry args={[15, 32, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

// Main scene component
const ThreeScene = () => {
  return (
    <>
      <fog attach="fog" args={["#000000", 5, 15]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#5C02FF" />
      
      <Background />
      <GlowingSymbol />
      <FloatingCards />
    </>
  );
};

export default ThreeScene;
