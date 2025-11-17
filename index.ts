/**
 * index.ts
 * --------
 * Entry module used by Expo to bootstrap the React Native application. The
 * registered component points to App.tsx where providers and navigation live.
 */
import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
