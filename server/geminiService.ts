import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { log } from './vite';
import { Card, CardType, Player } from '../shared/gameTypes';

// Initialize the Google Generative AI with the provided API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Configure safety settings for Gemini
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Get strategic advice from Gemini AI for a player's hand
 */
export async function getCardPlayingStrategy(
  hand: Card[],
  playerId: number,
  roundNumber: number
): Promise<string> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
    });

    // Count card types in hand
    const cardCounts = {
      Ram: hand.filter(c => c.type === CardType.Ram && !c.isRamChaal).length,
      RamChaal: hand.filter(c => c.isRamChaal).length,
      Sita: hand.filter(c => c.type === CardType.Sita).length,
      Lakshman: hand.filter(c => c.type === CardType.Lakshman).length,
      Ravan: hand.filter(c => c.type === CardType.Ravan).length,
    };

    // Prepare the prompt for Gemini
    const prompt = `
    As a strategic advisor for the Ram-Sita Adventure card game, analyze this hand and give brief advice (max 2 sentences).

    Game Context:
    - Round ${roundNumber}
    - Winning combinations: 
      * Ram Chaal + 3 Ram cards
      * 4 Sita cards
      * 4 Lakshman cards
      * 4 Ravan cards
    
    Your Hand:
    - Ram Chaal cards: ${cardCounts.RamChaal}
    - Ram cards: ${cardCounts.Ram}
    - Sita cards: ${cardCounts.Sita}
    - Lakshman cards: ${cardCounts.Lakshman}
    - Ravan cards: ${cardCounts.Ravan}
    
    Which cards should I keep and which should I pass? Keep your advice simple, strategic, and friendly.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    log(`Generated strategy advice for player ${playerId}: ${response}`, 'gemini');
    
    return response;
  } catch (error) {
    log(`Error generating card strategy: ${error}`, 'gemini');
    return "Focus on collecting matching cards to complete a winning set.";
  }
}

/**
 * Generate in-game AI dialogue for NPCs
 */
export async function generateAIDialogue(
  aiName: string,
  playerName: string, 
  context: string,
  emotion: 'happy' | 'frustrated' | 'excited' | 'neutral' = 'neutral'
): Promise<string> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
    });

    // Prepare the prompt for Gemini
    const prompt = `
    Generate a single line of dialog (max 10 words) for an AI opponent named ${aiName} in a card game against ${playerName}. 
    
    Game Context: ${context}
    Emotion: ${emotion}
    
    The dialog should be short, conversational, and slightly competitive but friendly. Never use hashtags, never include actions in asterisks, and avoid being overly formal. Don't use quotation marks.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Clean up response (remove quotes if present)
    const cleanedResponse = response.replace(/^["']|["']$/g, '');
    
    log(`Generated dialogue for AI ${aiName}: ${cleanedResponse}`, 'gemini');
    
    return cleanedResponse;
  } catch (error) {
    log(`Error generating AI dialogue: ${error}`, 'gemini');
    
    // Fallback responses based on emotion
    const fallbacks = {
      happy: `Got lucky there, ${playerName}!`,
      frustrated: "This isn't over yet.",
      excited: "Oh! This is getting interesting!",
      neutral: "Your move now."
    };
    
    return fallbacks[emotion];
  }
}

/**
 * Generate game tip or Ramayana fact
 */
export async function generateGameTipOrFact(): Promise<string> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
    });
    
    // Randomly choose between a tip or a fact
    const isFact = Math.random() > 0.5;
    
    // Prepare the prompt for Gemini
    const prompt = isFact 
      ? `Generate a single interesting fact (max 20 words) about Ramayana that's family-friendly and educational.`
      : `Generate a single game strategy tip (max 20 words) for a card game where players collect sets of matching cards.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    log(`Generated ${isFact ? 'Ramayana fact' : 'game tip'}: ${response}`, 'gemini');
    
    return response;
  } catch (error) {
    log(`Error generating tip or fact: ${error}`, 'gemini');
    
    // Fallback responses
    const fallbacks = [
      "Keep track of which cards others might be collecting.",
      "Ram and Sita are central characters in the Ramayana epic.",
      "Try to remember which cards have been passed around.",
      "The Ramayana is one of the largest ancient epics in world literature."
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Get AI player name suggestions
 */
export async function getAIPlayerNameSuggestions(count: number = 3): Promise<string[]> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
    });

    // Prepare the prompt for Gemini
    const prompt = `
    Generate ${count} creative, short (max 2 words each) AI player names for a Ramayana-themed card game.
    The names should be appropriate, fun, and related to technology/AI.
    Return just a comma-separated list of names, nothing else.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Parse the response and clean it
    const names = response
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .slice(0, count);
    
    log(`Generated AI player names: ${names.join(', ')}`, 'gemini');
    
    // If we don't have enough names, add defaults
    if (names.length < count) {
      const defaults = ['R.9', 'R.O', 'P10', 'ByteBuddy', 'DigitalDev', 'CircuitSage'];
      while (names.length < count) {
        names.push(defaults[names.length % defaults.length]);
      }
    }
    
    return names;
  } catch (error) {
    log(`Error generating AI player names: ${error}`, 'gemini');
    
    // Return default names
    return ['R.9', 'R.O', 'P10'].slice(0, count);
  }
}

/**
 * Analyze game result and generate commentary
 */
export async function generateGameResultCommentary(
  winner: Player,
  allPlayers: Player[],
  rounds: number
): Promise<string> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
    });

    // Determine winning combination
    let winningCombo = 'Unknown';
    if (winner.winningSet) {
      const winningCards = winner.hand.filter(card => 
        winner.winningSet!.includes(card.id)
      );
      
      if (winningCards.some(c => c.isRamChaal)) {
        winningCombo = 'Ram Chaal + Ram cards';
      } else {
        winningCombo = `${winningCards[0]?.type} set`;
      }
    }

    // Prepare the prompt for Gemini
    const prompt = `
    Generate a brief, exciting 2-sentence commentary for a card game result.
    
    Game Details:
    - Winner: ${winner.name}${winner.isAI ? ' (AI player)' : ''}
    - Winning combination: ${winningCombo}
    - Total rounds played: ${rounds}
    - Number of players: ${allPlayers.length}
    
    Keep it fun, family-friendly, and congratulatory to the winner.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    log(`Generated game result commentary: ${response}`, 'gemini');
    
    return response;
  } catch (error) {
    log(`Error generating game result commentary: ${error}`, 'gemini');
    
    // Fallback response
    return `Congratulations to ${winner.name} on the victory! What an exciting game that was.`;
  }
}