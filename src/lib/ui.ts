import EventEmitter from "eventemitter3";
import { writable, type Writable, get } from "svelte/store";

export enum Overlay {
  none = "none",
  import = "import",
}

export const state: Writable<{
  overlay: Overlay;
  viewer: boolean;
}> = writable({
  overlay: Overlay.none,
  viewer: false,
});

class UIEvents extends EventEmitter {
  context: string | null = null;
  constructor() {
    super();

    this.on("context", (context: string | null) => {
      this.context = context;
    });
  }

  listen(...args: any[]) {
    this.on(...args);
    return () => {
      this.off(...args);
    };
  }

  confirm(message: string) {
    return new Promise((resolve, reject) => {
      // TODO: custom confirm

      this.emit("confirm", {
        message,
        resolve: (response: boolean) => {
          resolve(response);
        },
      });
      //const result: boolean = (window as any).confirm(message)
      // resolve(result);
    });
  }

  prompt(
    message:
      | string
      | {
          message?: string;
          type?: "text" | "password";
          defaultValue?: string;
          component?: Promise<any>;
          [key: string]: any;
        },
    type: "text" | "password" = "text",
    defaultValue: string = "",
  ): Promise<string | any | false> {
    return new Promise((resolve, reject) => {
      let config = {
        resolve: (response: string) => {
          resolve(response);
        },
      };
      if (typeof message === "string") {
        config = {
          message,
          defaultValue,
          type,
        };
      } else {
        config = Object.assign(config, message);
      }
      this.emit("prompt", config);
    });
  }
}

const ui = new UIEvents();

export default ui;

export const confirm = ui.confirm.bind(ui);
export const prompt = ui.prompt.bind(ui);
