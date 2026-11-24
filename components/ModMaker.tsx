"use client";

import { useState } from "react";
import Home from "./Home";
import ResourceStudio from "./ResourceStudio";
import BehaviorStudio from "./BehaviorStudio";

export type Screen = "home" | "resource" | "behavior";

export default function ModMaker() {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "resource") {
    return <ResourceStudio onBack={() => setScreen("home")} />;
  }
  if (screen === "behavior") {
    return <BehaviorStudio onBack={() => setScreen("home")} />;
  }
  return <Home onSelect={setScreen} />;
}
