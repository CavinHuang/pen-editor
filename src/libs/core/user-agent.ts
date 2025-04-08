export const mac: boolean = /Mac/i.test(navigator.platform);
export const android: boolean = /android/i.test(navigator.userAgent);
export const iOS: boolean =
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
export const mobile: boolean = iOS || android;
export const firefox: boolean = /Firefox/.test(navigator.userAgent);
export const safari: boolean = /Apple Computer/.test(navigator.vendor);
