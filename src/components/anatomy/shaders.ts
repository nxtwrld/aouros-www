import pulsating from "./pulsating.shader";
//import aura from "./aura.shader";
import aura from "./aura.shader";
import heart from "./heart.shader";

export default {
  pulsating,
  aura,
  heart,
};

export interface Shader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: { [uniform: string]: { value: any } };
}
