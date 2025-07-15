import EventEmitter from "eventemitter3";

export default class FileProcessor extends EventEmitter {
  private ratio: number;
  private progressItems: {
    [itemName: string]: number;
  };
  constructor(ratio: number) {
    super();
    this.progressItems = {};
    this.ratio = ratio;
  }

  emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
    if (event === "progress") {
      const [progressItem, value] = args;
      this.progressItems = {
        ...this.progressItems,
        [progressItem]: value,
      };

      const progress = Object.values(this.progressItems).reduce(
        (acc, val) => acc + val / this.ratio,
        0,
      );
      return super.emit("progress", progress);
    } else {
      return super.emit(event, ...args);
    }
  }
}
