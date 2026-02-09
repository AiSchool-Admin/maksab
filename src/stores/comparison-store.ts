/**
 * Comparison store — manages up to 3 ads for side-by-side comparison.
 */

import { create } from "zustand";

export interface ComparisonAd {
  id: string;
  title: string;
  price: number | null;
  saleType: "cash" | "auction" | "exchange";
  image: string | null;
  governorate: string | null;
  city: string | null;
  categoryId: string;
  categoryFields: Record<string, unknown>;
}

interface ComparisonState {
  ads: ComparisonAd[];
  isOpen: boolean;
  addAd: (ad: ComparisonAd) => boolean;
  removeAd: (id: string) => void;
  clearAll: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

const MAX_COMPARISON = 3;

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  ads: [],
  isOpen: false,

  addAd: (ad) => {
    const { ads } = get();
    if (ads.length >= MAX_COMPARISON) return false;
    if (ads.some((a) => a.id === ad.id)) return false;
    // Only allow comparing ads from same category
    if (ads.length > 0 && ads[0].categoryId !== ad.categoryId) return false;

    set({ ads: [...ads, ad] });
    return true;
  },

  removeAd: (id) => {
    set((state) => ({
      ads: state.ads.filter((a) => a.id !== id),
    }));
  },

  clearAll: () => set({ ads: [], isOpen: false }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),
}));
