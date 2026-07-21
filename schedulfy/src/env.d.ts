/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    // add other VITE_ variables here as needed
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // Allow JSX in .jsx files without type errors
  namespace JSX {
    interface IntrinsicAttributes {
      [key: string]: any;
    }
    interface Element {}
    interface ElementClass {}
    interface ElementAttributesProperty { }
    interface ElementChildrenAttribute { }
  }
}

export {};
