import EventEmitter from "eventemitter3";


/**
 * Event emitter for shortcuts - simplifies event handling
 * 
 * emits event in  for of 'Ctrl+Shift+KeyS' or 'KeyS' or 'Space' etc.
 */


class ShortCutEmitter extends EventEmitter {
    on(eventName: string, listener: (...args: any[]) => void, context?: any): () => void {
        super.on(eventName, listener, context);
        return () => {
            this.removeListener(eventName, listener, context);
        };
    }
}

const eventEmitter = new ShortCutEmitter();

const defaultShortcuts: {
    [key: string]: string
} = {
    'Ctrl+KeyS': 'save',
    'Ctrl+KeyN': 'new',
    'Ctrl+KeyO': 'open',
    'Ctrl+KeyP': 'print',
    'Ctrl+KeyZ': 'undo',
    'Ctrl+KeyY': 'redo',
    'Ctrl+KeyF': 'find',
}


export function emit(string: string): void {
    eventEmitter.emit(string);
}


/**
 * 
 * @param event Emit a shortcut event
 */
export function emitShortcut(event: KeyboardEvent): void {
    
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)  return;

    let code = '';
    if (event.shiftKey) {
        code += 'Shift+';
    }
    if (event.ctrlKey) {
        code += 'Ctrl+';
    }
    if (event.altKey) {
        code += 'Alt+';
    }
    code += event.code;
    console.log('Emitting', code, event);
    
    Object.keys(defaultShortcuts).forEach((key) => {
        if (key === code) {
            eventEmitter.emit(defaultShortcuts[key]);
        }
    });

    eventEmitter.emit(code);
}


export default eventEmitter;