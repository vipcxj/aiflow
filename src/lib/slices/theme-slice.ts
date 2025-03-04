import { createAppSlice } from "@/lib/createAppSlice"

export interface ThemeState {
  theme: "light" | "dark";
}

export const initialState: ThemeState = {
  theme: "light",
};

export const themeSlice = createAppSlice({
  name: "theme",
  initialState,
  reducers: (create) => ({
    toggleTheme: create.reducer((state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    }),
  }),
  selectors: {
    selectTheme: (state) => state.theme,
  },
});

export const { toggleTheme } = themeSlice.actions;
export const { selectTheme } = themeSlice.selectors;
