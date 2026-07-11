import { create } from 'zustand'

interface LayerState {
  showForecast: boolean
  showWindCircle: boolean
  showWarnings: boolean
  selectedStormId: string | null
  setSelectedStormId: (stormId: string) => void
  toggleLayer: (layer: 'showForecast' | 'showWindCircle' | 'showWarnings') => void
}

export const useStormStore = create<LayerState>((set) => ({
  showForecast: true,
  showWindCircle: true,
  showWarnings: true,
  selectedStormId: null,
  setSelectedStormId: (stormId) => set({ selectedStormId: stormId }),
  toggleLayer: (layer) =>
    set((state) => ({
      [layer]: !state[layer],
    })),
}))
