export const characterImages = [
  "https://images.unsplash.com/photo-1524373050940-8f19e9b858a9", // Anthony Tran
  "https://images.unsplash.com/photo-1548445929-4f60a497f851", // Anna Gru
  "https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42", // Glenn Carstens-Peters
  "https://images.unsplash.com/photo-1432958576632-8a39f6b97dc7", // Cosmic Timetraveler
];

export const getCharacterImage = (index: number): string => {
  return characterImages[index % characterImages.length];
};
