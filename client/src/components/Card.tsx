import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card as CardType } from "@/lib/types";
import { getCardColor } from "@/assets/card-backgrounds";

interface CardProps {
  card: CardType;
  index: number;
  isSelected?: boolean;
  isHidden?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const Card = ({
  card,
  index,
  isSelected = false,
  isHidden = false,
  onClick,
  className,
  style,
}: CardProps) => {
  // Get color styling based on card type
  const { background, textColor, border } = useMemo(() => getCardColor(card.type), [card.type]);
  
  // To get proper fanning effect with multiple cards
  const rotateVal = useMemo(() => (index - 1.5) * 5, [index]);
  const translateVal = useMemo(() => (index - 1.5) * 10, [index]);
  
  return (
    <motion.div
      className={cn(
        "card relative",
        isSelected ? "z-10" : `z-${index}`,
        className
      )}
      style={{
        ...style,
        transformOrigin: "bottom center",
      }}
      initial={{ 
        rotateZ: rotateVal, 
        translateX: translateVal,
        scale: 1 
      }}
      animate={{ 
        rotateZ: isSelected ? 0 : rotateVal, 
        translateX: isSelected ? 0 : translateVal,
        translateY: isSelected ? -20 : 0,
        scale: isSelected ? 1.1 : 1,
        boxShadow: isSelected ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
      whileHover={!isSelected && !isHidden ? { translateY: -10, scale: 1.05 } : {}}
      onClick={onClick}
    >
      <div 
        className={cn(
          "w-16 h-24 sm:w-20 sm:h-28 rounded-lg flex flex-col items-center justify-center shadow-md transition-all duration-300",
          isHidden ? "bg-gray-700 border-2 border-gray-600" : background,
          border
        )}
      >
        {isHidden ? (
          <div className="text-gray-400 font-bold flex items-center justify-center h-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v.01" />
              <path d="M12 8v4" />
            </svg>
          </div>
        ) : (
          <>
            <div className={cn("text-xs absolute top-1 left-1", textColor)}>
              {card.isRamChaal ? "RC" : card.type.charAt(0)}
            </div>
            
            <div className={cn("text-xs sm:text-base font-bold", textColor)}>
              {card.type}
            </div>
            
            <div className={cn("text-center mt-1 px-1 text-xs", textColor)}>
              {card.isRamChaal && "Chaal"}
            </div>
            
            <div className={cn("text-xs absolute bottom-1 right-1 rotate-180", textColor)}>
              {card.isRamChaal ? "RC" : card.type.charAt(0)}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Card;
