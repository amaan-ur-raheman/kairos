import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

import { C, SERIF } from "@/lib/theme";

export const SignOutButton = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSignOut}
      activeOpacity={0.7}
      className="rounded-xl border py-3 px-4"
      style={{ backgroundColor: C.card, borderColor: C.line }}
    >
      <Text
        className="text-sm font-medium text-center"
        style={{ color: C.stBusy, fontFamily: SERIF, fontStyle: "italic" }}
      >
        Sign out of Kairos
      </Text>
    </TouchableOpacity>
  );
};
