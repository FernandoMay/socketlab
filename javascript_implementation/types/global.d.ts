/// <reference types="next" />
/// <reference types="react" />

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

export {};