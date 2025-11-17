/**
 * RootNavigator
 * -------------
 * Defines the full navigation hierarchy: an auth stack for unauthenticated users
 * and bottom tabs for the main experience. Localization is applied to labels and
 * titles so navigation chrome changes when the user toggles language.
 */
import React from "react";
import { ActivityIndicator, View } from "react-native";
import {
  NavigationContainer,
  NavigatorScreenParams,
  DefaultTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import CreateEventScreen from "../screens/Events/CreateEventScreen";
import EventDetailsScreen from "../screens/Events/EventDetailsScreen";
import EventListScreen from "../screens/Events/EventListScreen";
import MyEventsScreen from "../screens/Events/MyEventsScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import { colors } from "../theme/colors";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type MainTabParamList = {
  Events: undefined;
  MyEvents: undefined;
  CreateEvent?: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  EventDetails: { eventId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

const AuthStackNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const MainTabs = () => {
  const { appUser } = useAuth();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<
            string,
            React.ComponentProps<typeof MaterialCommunityIcons>["name"]
          > = {
            Events: "calendar-star",
            MyEvents: "calendar-heart",
            CreateEvent: "plus-circle",
            Profile: "account-star",
          };
          const iconName = iconMap[route.name] ?? "circle";
          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen
        name="Events"
        component={EventListScreen}
        options={{ tabBarLabel: t("navigation.discover") }}
      />
      <Tab.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{ tabBarLabel: t("navigation.myEvents") }}
      />
      {/* Only organisers see the event creation tab. */}
      {appUser?.role === "organiser" && (
        <Tab.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ tabBarLabel: t("navigation.create") }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t("navigation.profile") }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const { firebaseUser, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    // Splash screen displayed until Firebase auth listener completes.
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        {!firebaseUser ? (
          <Stack.Screen
            name="Auth"
            component={AuthStackNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EventDetails"
              component={EventDetailsScreen}
              options={{ title: t("navigation.eventDetailsTitle") }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
