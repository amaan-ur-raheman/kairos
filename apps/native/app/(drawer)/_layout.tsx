import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useCallback } from "react";
import { Text } from "react-native";

import { OrgGate } from "@/components/org-gate";
import { C, SERIF } from "@/lib/theme";

function DrawerLayout() {
  const renderLogo = useCallback(
    () => (
      <Text style={{ fontFamily: SERIF, fontWeight: "600", fontSize: 17, color: C.ink }}>
        kairos
      </Text>
    ),
    [],
  );

  return (
    <OrgGate>
      <Drawer
        screenOptions={{
          headerTintColor: C.ink,
          headerStyle: { backgroundColor: C.card },
          headerTitleStyle: { fontFamily: SERIF, fontWeight: "600", fontSize: 17, color: C.ink },
          drawerStyle: { backgroundColor: C.paper },
          drawerActiveTintColor: C.ember,
          drawerInactiveTintColor: C.inkMuted,
          drawerActiveBackgroundColor: C.emberSoft,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            headerTitle: "Kairos",
            headerRight: renderLogo,
            drawerLabel: ({ color }) => <Text style={{ color }}>Calendar</Text>,
            drawerIcon: ({ size, color }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="team"
          options={{
            headerTitle: "Kairos",
            headerRight: renderLogo,
            drawerLabel: ({ color }) => <Text style={{ color }}>Team</Text>,
            drawerIcon: ({ size, color }) => (
              <MaterialIcons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            headerTitle: "Settings",
            drawerLabel: ({ color }) => <Text style={{ color }}>Settings</Text>,
            drawerIcon: ({ size, color }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </OrgGate>
  );
}

export default DrawerLayout;
