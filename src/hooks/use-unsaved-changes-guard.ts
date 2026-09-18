// ─────────────────────────────────────────────────────────────
// hooks/use-unsaved-changes-guard.ts
// ─────────────────────────────────────────────────────────────
import { useNavigation } from "expo-router";
import { useEffect, type MutableRefObject } from "react";
import { Alert } from "react-native";

interface Options {
  isDirty: boolean;
  /**
   * Set `.current = true` immediately before a deliberate navigation
   * (e.g. after a successful save) to skip the confirmation dialog.
   */
  bypassRef?: MutableRefObject<boolean>;
}

export const useUnsavedChangesGuard = ({ isDirty, bypassRef }: Options) => {
  const navigation = useNavigation();

  useEffect(() => {
    if (!isDirty) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      // Allow-through when the screen explicitly requested a bypass
      if (bypassRef?.current) {
        bypassRef.current = false;
        return;
      }

      e.preventDefault();

      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. They'll be lost if you leave now.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, isDirty, bypassRef]);
};
