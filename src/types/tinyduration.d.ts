declare module "tinyduration" {
  export interface Duration {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
  }

  export function parse(duration: string): Duration;
  export function serialize(duration: Duration): string;
}
