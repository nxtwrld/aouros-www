import type { IContext } from "./types.d.ts";
import Animation from "../animations/Immunity";
import Info from "./Immunity.svelte";

const Immunity: IContext = {
  name: "Immunity",
  layers: ["vascular", "respiratory"],
  animation: Animation,
  info: Info,
};

export default Immunity;
