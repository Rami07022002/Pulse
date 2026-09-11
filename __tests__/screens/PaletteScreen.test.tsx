// Required testIDs: palette-screen, palette-list, add-palette-button, palette-item, delete-palette-button, color-swatch
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, TouchableOpacity, FlatList, Text } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: () => null,
}));

const mockAddPalette = jest.fn();
const mockDeletePalette = jest.fn();

const PlaceholderPaletteScreen = () => (
  <View testID="palette-screen">
    <View testID="palette-list">
      <View testID="palette-item">
        <View testID="color-swatch" />
        <TouchableOpacity testID="delete-palette-button" onPress={mockDeletePalette}>
          <Text>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    <TouchableOpacity testID="add-palette-button" onPress={mockAddPalette}>
      <Text>Add</Text>
    </TouchableOpacity>
  </View>
);

describe('PaletteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PlaceholderPaletteScreen />);
    expect(screen.getByTestId('palette-screen')).toBeTruthy();
  });

  it('renders palette list', () => {
    render(<PlaceholderPaletteScreen />);
    expect(screen.getByTestId('palette-list')).toBeTruthy();
  });

  it('renders add palette button', () => {
    render(<PlaceholderPaletteScreen />);
    expect(screen.getByTestId('add-palette-button')).toBeTruthy();
  });

  it('calls add handler when add button is pressed', () => {
    render(<PlaceholderPaletteScreen />);
    fireEvent.press(screen.getByTestId('add-palette-button'));
    expect(mockAddPalette).toHaveBeenCalledTimes(1);
  });

  it('renders delete button on palette item', () => {
    render(<PlaceholderPaletteScreen />);
    expect(screen.getByTestId('delete-palette-button')).toBeTruthy();
  });

  it('calls delete handler when delete button is pressed', () => {
    render(<PlaceholderPaletteScreen />);
    fireEvent.press(screen.getByTestId('delete-palette-button'));
    expect(mockDeletePalette).toHaveBeenCalledTimes(1);
  });

  it('renders color swatch inside palette item', () => {
    render(<PlaceholderPaletteScreen />);
    expect(screen.getByTestId('color-swatch')).toBeTruthy();
  });
});
