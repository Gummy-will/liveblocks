import { Text } from "@react-email/components";

export function Headline({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm text-email-headline font-medium m-0">
      {children}
    </Text>
  );
}
