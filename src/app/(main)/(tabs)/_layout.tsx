import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnistyles } from "react-native-unistyles";

const TabLayout = () => {
  const { theme } = useUnistyles();

  return (
    <NativeTabs
      iconColor={{
        default: theme.colors.mutedText,
        selected: theme.colors.onPrimary,
      }}
      labelStyle={{
        default: { color: theme.colors.mutedText },
        selected: { color: theme.colors.primary },
      }}
      indicatorColor={theme.colors.primary}
      backgroundColor={theme.colors.surface}
      rippleColor={theme.colors.primaryIllumination}
      backBehavior="history"
      badgeBackgroundColor={theme.colors.primary}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flame.fill" md="local_fire_department" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

export default TabLayout;
