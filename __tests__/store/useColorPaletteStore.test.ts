// Store test for Color Palette app
// Tests: add palette, delete palette, update palette, add color to palette, remove color from palette

type Color = {
  id: string;
  hex: string;
  name?: string;
};

type Palette = {
  id: string;
  name: string;
  colors: Color[];
};

type ColorPaletteStore = {
  palettes: Palette[];
  addPalette: (palette: Palette) => void;
  deletePalette: (id: string) => void;
  updatePalette: (id: string, updates: Partial<Palette>) => void;
  addColorToPalette: (paletteId: string, color: Color) => void;
  removeColorFromPalette: (paletteId: string, colorId: string) => void;
};

// Minimal in-memory store implementation for contract testing
const createStore = (): ColorPaletteStore => {
  let palettes: Palette[] = [];

  return {
    get palettes() {
      return palettes;
    },
    addPalette(palette: Palette) {
      palettes = [...palettes, palette];
    },
    deletePalette(id: string) {
      palettes = palettes.filter((p) => p.id !== id);
    },
    updatePalette(id: string, updates: Partial<Palette>) {
      palettes = palettes.map((p) => (p.id === id ? { ...p, ...updates } : p));
    },
    addColorToPalette(paletteId: string, color: Color) {
      palettes = palettes.map((p) =>
        p.id === paletteId ? { ...p, colors: [...p.colors, color] } : p
      );
    },
    removeColorFromPalette(paletteId: string, colorId: string) {
      palettes = palettes.map((p) =>
        p.id === paletteId
          ? { ...p, colors: p.colors.filter((c) => c.id !== colorId) }
          : p
      );
    },
  };
};

describe('ColorPaletteStore', () => {
  let store: ColorPaletteStore;

  const mockPalette: Palette = {
    id: 'palette-1',
    name: 'Sunset',
    colors: [],
  };

  const mockColor: Color = {
    id: 'color-1',
    hex: '#FF5733',
    name: 'Flame',
  };

  beforeEach(() => {
    store = createStore();
  });

  it('initializes with empty palettes', () => {
    expect(store.palettes).toHaveLength(0);
  });

  it('adds a palette to the store', () => {
    store.addPalette(mockPalette);
    expect(store.palettes).toHaveLength(1);
  });

  it('stores correct palette data after add', () => {
    store.addPalette(mockPalette);
    expect(store.palettes[0].id).toBe('palette-1');
  });

  it('deletes a palette by id', () => {
    store.addPalette(mockPalette);
    store.deletePalette('palette-1');
    expect(store.palettes).toHaveLength(0);
  });

  it('does not delete other palettes when deleting by id', () => {
    store.addPalette(mockPalette);
    store.addPalette({ id: 'palette-2', name: 'Ocean', colors: [] });
    store.deletePalette('palette-1');
    expect(store.palettes).toHaveLength(1);
  });

  it('updates a palette name', () => {
    store.addPalette(mockPalette);
    store.updatePalette('palette-1', { name: 'Updated Name' });
    expect(store.palettes[0].name).toBe('Updated Name');
  });

  it('does not affect other fields when updating palette', () => {
    store.addPalette(mockPalette);
    store.updatePalette('palette-1', { name: 'New Name' });
    expect(store.palettes[0].id).toBe('palette-1');
  });

  it('adds a color to a palette', () => {
    store.addPalette(mockPalette);
    store.addColorToPalette('palette-1', mockColor);
    expect(store.palettes[0].colors).toHaveLength(1);
  });

  it('stores correct color data after adding to palette', () => {
    store.addPalette(mockPalette);
    store.addColorToPalette('palette-1', mockColor);
    expect(store.palettes[0].colors[0].hex).toBe('#FF5733');
  });

  it('removes a color from a palette', () => {
    store.addPalette({ ...mockPalette, colors: [mockColor] });
    store.removeColorFromPalette('palette-1', 'color-1');
    expect(store.palettes[0].colors).toHaveLength(0);
  });

  it('does not remove other colors when removing by id', () => {
    const secondColor: Color = { id: 'color-2', hex: '#00FF00' };
    store.addPalette({ ...mockPalette, colors: [mockColor, secondColor] });
    store.removeColorFromPalette('palette-1', 'color-1');
    expect(store.palettes[0].colors).toHaveLength(1);
  });

  it('adds multiple palettes independently', () => {
    store.addPalette(mockPalette);
    store.addPalette({ id: 'palette-2', name: 'Ocean', colors: [] });
    expect(store.palettes).toHaveLength(2);
  });
});
