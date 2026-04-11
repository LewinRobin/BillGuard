import React from 'react';
import { StatusBar } from 'expo-status-bar';
import './global.css';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
    </>
  );
}
