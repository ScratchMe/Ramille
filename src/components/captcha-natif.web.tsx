// Sur web, le captcha pose son widget lui-même, dans le DOM (`src/lib/captcha.ts`) : il n'y a pas de
// vue web à héberger, et `react-native-webview` n'a pas à entrer dans le bundle. Le pendant natif est
// `captcha-natif.tsx`.
export function CaptchaNatif() {
  return null;
}
