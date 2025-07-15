import { writable, type Writable, get } from "svelte/store";
import type { VCard } from "$lib/contact/types.d";

const store: Writable<VCard> = writable({
  fn: "Mudr. Jan Novák",
  n: {
    familyName: "Novák",
    givenName: "Jan",
    additionalNames: [],
    honorificPrefixes: ["Mudr."],
    honorificSuffixes: [],
  },
  org: "Nemocnice Na Homolce",
  title: "Primář",
  tel: [{ type: "work", value: "+420 123 456 789" }],
  specialty: ["Všeobecný lékař"],
});

export default store;

export function getDoctorSignature(): string {
  const $doctor = get(store);
  let doctorText = `   


${$doctor.fn}
${$doctor.org}
`;
  if ($doctor.tel?.[0]?.value) {
    doctorText += `tel: ${$doctor.tel?.[0].value}
         `;
  }
  if ($doctor.email?.[0]?.value) {
    doctorText += `email: ${$doctor.email?.[0].value}
         `;
  }
  return doctorText;
}
