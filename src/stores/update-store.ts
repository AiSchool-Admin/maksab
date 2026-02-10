import { create } from "zustand";

interface UpdateState {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  setUpdateAvailable: (available: boolean) => void;
  setRegistration: (reg: ServiceWorkerRegistration) => void;
  applyUpdate: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateAvailable: false,
  registration: null,

  setUpdateAvailable: (available) => set({ updateAvailable: available }),

  setRegistration: (reg) => set({ registration: reg }),

  applyUpdate: () => {
    const { registration } = get();
    if (registration?.waiting) {
      // Tell the waiting SW to skip waiting and become active
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    set({ updateAvailable: false });
  },
}));
