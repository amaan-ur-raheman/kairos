import { useAuth, useClerk, useOrganizationList } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

/**
 * Blocks rendering until the user is signed in AND has an active Clerk
 * organization, so every RPC call carries an orgId. Redirects signed-out
 * users to sign-in.
 *
 * ponytail: silently picks the user's first workspace; swap for a picker
 * screen when multi-workspace users need a choice.
 */
export function OrgGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { setActive } = useClerk();
  const { isLoaded: orgsLoaded, userMemberships } = useOrganizationList();

  const memberships = userMemberships?.data ?? [];

  const ready = isLoaded && !!isSignedIn && !!orgId;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!orgId && memberships.length > 0) {
      void setActive({ organization: memberships[0].organization.id });
    }
  }, [isLoaded, isSignedIn, orgId, setActive, memberships, router]);

  if (ready) return <>{children}</>;

  const hasNoWorkspace = isLoaded && orgsLoaded && memberships.length === 0;

  return (
    <Container className="items-center justify-center">
      {hasNoWorkspace ? (
        <View className="items-center px-6">
          <Ionicons name="business-outline" size={48} color="#c2410c" />
          <Text className="text-[#2b2620] font-medium mt-3 text-center">No workspace yet</Text>
          <Text className="text-[#6f6754] text-sm mt-1 text-center">
            Create a workspace from the web app, then sign in again here.
          </Text>
        </View>
      ) : (
        <Spinner size="lg" />
      )}
    </Container>
  );
}
