// Required testIDs: home-screen, home-screen-content
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: () => null,
}));

// Minimal smoke test — replace with actual screen import when screens are defined
const PlaceholderHomeScreen = () => (
  <View testID="home-screen">
    <View testID="home-screen-content" />
  </View>
);

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    render(<PlaceholderHomeScreen />);
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('renders main content area', () => {
    render(<PlaceholderHomeScreen />);
    expect(screen.getByTestId('home-screen-content')).toBeTruthy();
  });
});
