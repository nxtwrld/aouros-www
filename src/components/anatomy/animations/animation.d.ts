export interface IAnimation {
    name: string;
    update: () => void;
    destroy: () => void;
}