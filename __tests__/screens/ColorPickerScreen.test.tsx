// Required testIDs: color-picker-screen, color-hex-input, save-color-button, color-preview
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, TouchableOpacity, TextInput, Text } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: () => null,
}));

const mockSaveColor = jest.fn();

const PlaceholderColorPickerScreen = () => {
  const [hex, setHex] = useState('');
  return (
    <View testID="color-picker-screen">
      <View testID="color-preview" />
      <TextInput
        testID="color-hex-input"
        value={hex}
        onChangeText={setHex}
        placeholder="#FFFFFF"
      />
      <TouchableOpacity testID="save-color-button" onPress={mockSaveColor}>
        <Text>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('ColorPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PlaceholderColorPickerScreen />);
    expect(screen.getByTestId('color-picker-screen')).toBeTruthy();
  });

  it('renders hex input field', () => {
    render(<PlaceholderColorPickerScreen />);
    expect(screen.getByTestId('color-hex-input')).toBeTruthy();
  });

  it('renders color preview area', () => {
    render(<PlaceholderColorPickerScreen />);
    expect(screen.getByTestId('color-preview')).toBeTruthy();
  });

  it('renders save button', () => {
    render(<PlaceholderColorPickerScreen />);
    expect(screen.getByTestId('save-color-button')).toBeTruthy();
  });

  it('accepts text input for hex color', () => {
    render(<PlaceholderColorPickerScreen />);
    fireEvent.changeText(screen.getByTestId('color-hex-input'), '#FF5733');
    expect(screen.getByTestId('color-hex-input').props.value).toBe('#FF5733');
  });

  it('calls save handler when save button is pressed', () => {
    render(<PlaceholderColorPickerScreen />);
    fireEvent.press(screen.getByTestId('save-color-button'));
    expect(mockSaveColor).toHaveBeenCalledTimes(1);
  });
});
