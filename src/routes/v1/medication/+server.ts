import { error, json } from "@sveltejs/kit";

const routes = {
  POR: "ORAL",
  DRM: "TOPICAL",
};

const form = {
  "TBL FLM": "TABLET",
  TBL: "TABLET",
  "TBL EFF": "TABLET",
  CPS: "CAPSULE",
  "CPS MOL": "CAPSULE",
  CRM: "TOPICAL",
  GEL: "TOPICAL",
};

/** @type {import('./$types.d').RequestHandler} */
export async function GET({ url }) {
  const str = url.searchParams.get("drug");
  const response = await fetch("https://prehledy.sukl.cz/prehledy/v1/dlprc", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify({
      filtr: "ibalgin",
      pocet: 20,
      stranka: 1,
      sort: ["nazev"],
      smer: "asc",
      leciveLatky: [],
      leciveLatkyOperace: "OR",
      atc: "",
      cestaPodani: "",
      drzitelRegistrace: [],
      stavRegistrace: "",
      zpusobVydeje: [],
      uhrada: [],
      dovoz: "",
      jeDodavka: false,
      stavZruseni: "N",
      ochrannyPrvek: "X",
      dostupnost: [],
    }),
  });
  const data = await response.json();

  return json(
    data.data.map((item) => {
      if (routes[item.cestaPodani.kod]) {
        console.log("route not found", item.cestaPodani);
      }
      if (form[item.lekovaForma.kod]) {
        console.log("form not found", item.lekovaForma);
      }
      return {
        title: item.nazevLP,
        dosage: item.sila,
        more: item.doplenkNazvu,
        route: routes[item.cestaPodani.kod],
        form: form[item.lekovaForma.kod],
      };
    }),
  );
  //return new Response(data);
}
