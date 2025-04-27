import { CardType } from "@/lib/types";

// Randomize background for game board
export const getRandomBackground = (): string => {
  const backgrounds = [
    "https://images.unsplash.com/photo-1654362248566-6804dbcc5bdc", // FETHI BOUHAOUCHINE
    "https://images.unsplash.com/photo-1641406755423-968570743031", // Aedrian Salazar
  ];
  
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
};

// Get card colors based on type
export const getCardColor = (cardType: CardType) => {
  const colorSets = [
    // Light theme color set
    {
      Ram: {
        background: "bg-amber-500",
        textColor: "text-amber-950",
        border: "border-2 border-amber-600",
      },
      Sita: {
        background: "bg-emerald-500",
        textColor: "text-emerald-950",
        border: "border-2 border-emerald-600",
      },
      Lakshman: {
        background: "bg-blue-500",
        textColor: "text-blue-950",
        border: "border-2 border-blue-600",
      },
      Ravan: {
        background: "bg-red-500",
        textColor: "text-red-950",
        border: "border-2 border-red-600",
      },
    },
    // Dark theme color set
    {
      Ram: {
        background: "bg-amber-700",
        textColor: "text-amber-100",
        border: "border-2 border-amber-500",
      },
      Sita: {
        background: "bg-emerald-700",
        textColor: "text-emerald-100",
        border: "border-2 border-emerald-500",
      },
      Lakshman: {
        background: "bg-blue-700",
        textColor: "text-blue-100",
        border: "border-2 border-blue-500",
      },
      Ravan: {
        background: "bg-red-700",
        textColor: "text-red-100",
        border: "border-2 border-red-500",
      },
    },
  ];
  
  // Using a consistent color set instead of random
  const colorSet = colorSets[0]; // Always use the first (light) color set
  
  return colorSet[cardType];
};
