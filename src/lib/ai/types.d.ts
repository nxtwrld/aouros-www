export interface Content {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

type TokenUsage = {
  total: number;
  [key: string]: number;
};
