import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Colors,
  Gradients,
  getColorsForAccent,
  getGradientsForAccent,
  AccentTheme
} from '../constants/theme';

interface ThemeState {
  themeAccent: AccentTheme;
  Colors: typeof Colors;
  Gradients: typeof Gradients;
  setAccent: (accent: AccentTheme) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Try to load initial values as early as possible
  const init = async () => {
    try {
      const saved = await AsyncStorage.getItem('user_theme_accent');
      if (saved) {
        const accent = saved as AccentTheme;
        set({
          themeAccent: accent,
          Colors: getColorsForAccent(accent),
          Gradients: getGradientsForAccent(accent),
        });
      }
    } catch (e) {
      console.warn('Failed to load theme from AsyncStorage', e);
    }
  };

  init();

  return {
    themeAccent: 'teal',
    Colors,
    Gradients,
    setAccent: async (accent: AccentTheme) => {
      try {
        await AsyncStorage.setItem('user_theme_accent', accent);
        set({
          themeAccent: accent,
          Colors: getColorsForAccent(accent),
          Gradients: getGradientsForAccent(accent),
        });
      } catch (e) {
        console.warn('Failed to save theme', e);
      }
    },
    loadTheme: init,
  };
});
