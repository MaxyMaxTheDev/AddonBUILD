import AppShell from "@/components/AppShell";
import { AppProvider } from "@/components/AppProvider";

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
