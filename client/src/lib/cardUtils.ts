import { Card, Player, CardType } from "./types";

// Create a deck of cards with proper distribution
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let cardId = 1;
  
  // Add Ram Chaal card (1)
  deck.push({ id: cardId++, type: CardType.Ram, isRamChaal: true });
  
  // Add Ram cards (3)
  for (let i = 0; i < 3; i++) {
    deck.push({ id: cardId++, type: CardType.Ram, isRamChaal: false });
  }
  
  // Add Sita cards (4)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: cardId++, type: CardType.Sita, isRamChaal: false });
  }
  
  // Add Lakshman cards (4)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: cardId++, type: CardType.Lakshman, isRamChaal: false });
  }
  
  // Add Ravan cards (4)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: cardId++, type: CardType.Ravan, isRamChaal: false });
  }
  
  return deck;
};

// Shuffle deck using Fisher-Yates algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

// Deal cards to players
export const dealCards = (players: Player[]): { updatedPlayers: Player[], startPlayerId: number } => {
  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());
  let startPlayerId = 0;
  
  // Deal 4 cards to each player
  const updatedPlayers = players.map((player, index) => {
    const startIdx = index * 4;
    const hand = deck.slice(startIdx, startIdx + 4);
    
    // Check if this player has Ram Chaal card to determine starting player
    if (hand.some(card => card.isRamChaal)) {
      startPlayerId = player.id;
    }
    
    return {
      ...player,
      hand,
      winningSet: null,
    };
  });
  
  return { updatedPlayers, startPlayerId };
};

// Check if player has a winning set of cards
export const hasWinningSet = (player: Player): number[] | null => {
  const { hand } = player;
  
  // Check for Ram Chaal + 3 Ram cards
  const ramChaalCard = hand.find(card => card.isRamChaal);
  const ramCards = hand.filter(card => card.type === CardType.Ram && !card.isRamChaal);
  
  if (ramChaalCard && ramCards.length >= 3) {
    return [
      ramChaalCard.id,
      ...ramCards.slice(0, 3).map(card => card.id)
    ];
  }
  
  // Check for 4 Sita cards
  const sitaCards = hand.filter(card => card.type === CardType.Sita);
  if (sitaCards.length >= 4) {
    return sitaCards.slice(0, 4).map(card => card.id);
  }
  
  // Check for 4 Lakshman cards
  const lakshmanCards = hand.filter(card => card.type === CardType.Lakshman);
  if (lakshmanCards.length >= 4) {
    return lakshmanCards.slice(0, 4).map(card => card.id);
  }
  
  // Check for 4 Ravan cards
  const ravanCards = hand.filter(card => card.type === CardType.Ravan);
  if (ravanCards.length >= 4) {
    return ravanCards.slice(0, 4).map(card => card.id);
  }
  
  return null;
};

// Check for winning condition among all players
export const checkWinningCondition = (players: Player[], currentRound: number): Player | null => {
  // Can't win on first round
  if (currentRound < 2) {
    return null;
  }
  
  for (const player of players) {
    const winningSet = hasWinningSet(player);
    
    if (winningSet) {
      // Update player with the winning set
      player.winningSet = winningSet;
      return player;
    }
  }
  
  return null;
};

// Get best card to pass based on hand analysis (for AI)
export const getBestCardToPass = (hand: Card[]): Card => {
  // Count card types
  const counts = {
    [CardType.Ram]: hand.filter(c => c.type === CardType.Ram && !c.isRamChaal).length,
    [CardType.Sita]: hand.filter(c => c.type === CardType.Sita).length,
    [CardType.Lakshman]: hand.filter(c => c.type === CardType.Lakshman).length,
    [CardType.Ravan]: hand.filter(c => c.type === CardType.Ravan).length,
  };
  
  // Always keep Ram Chaal card
  const hasRamChaal = hand.some(c => c.isRamChaal);
  
  // If we have Ram Chaal, try to keep Ram cards
  if (hasRamChaal) {
    // Pass cards that are not Ram or Ram Chaal
    const nonRamCard = hand.find(c => c.type !== CardType.Ram);
    if (nonRamCard) return nonRamCard;
  }
  
  // Find the card type with the minimum count
  const minType = Object.entries(counts)
    .filter(([type]) => type !== CardType.Ram || !hasRamChaal) // Don't count Ram if we have Ram Chaal
    .reduce(
      (min, [type, count]) => (count < min.count ? { type: type as CardType, count } : min),
      { type: CardType.Ram, count: Infinity }
    );
  
  // Find a card of the minimum type
  const cardToPass = hand.find(c => 
    c.type === minType.type && !(c.type === CardType.Ram && c.isRamChaal)
  );
  
  // Fallback to any non-Ram Chaal card
  return cardToPass || hand.find(c => !c.isRamChaal) || hand[0];
};
