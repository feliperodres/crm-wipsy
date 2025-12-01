import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to extract image URL safely from different image formats
export const getImageUrl = (imageItem: any): string => {
  if (typeof imageItem === 'string') {
    return imageItem;
  }
  if (imageItem && typeof imageItem === 'object') {
    return imageItem.url || imageItem.src || '';
  }
  return '';
};
