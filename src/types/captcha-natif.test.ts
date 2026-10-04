/**
 * La page du captcha dans l'app Android, et la lecture de ce qu'elle renvoie (`captcha-natif.ts`).
 *
 * Ce que ce fichier ne voit pas : le vrai widget dans une vraie vue web — il se voit sur le premier
 * build qui embarque `react-native-webview` (registre d'exploitation §3.11, point 1).
 *
 * Éprouvé en le cassant, le 04/10/2026 : la clé collée telle quelle dans le script au lieu de passer
 * par `JSON.stringify` fait tomber « une clé à guillemet… », seul ; un jeton vide accepté, « un jeton
 * vide… », seul ; `interaction-only` retiré, « la page porte… », seul.
 */
import { lireMessageDuCaptcha, pageDuCaptcha } from './captcha-natif';

describe('pageDuCaptcha', () => {
  it('la page porte le script de Turnstile, le mode du web et les trois issues', () => {
    const page = pageDuCaptcha('0x4AAAA', 'session_anonyme');
    expect(page).toContain('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    expect(page).toContain("appearance: 'interaction-only'");
    expect(page).toContain('"sitekey":"0x4AAAA"');
    expect(page).toContain('"action":"session_anonyme"');
    expect(page).toContain("'before-interactive-callback'");
    expect(page).toContain('ReactNativeWebView.postMessage');
  });

  it('une clé à guillemet ne peut rien injecter dans le script', () => {
    const page = pageDuCaptcha('a"};alert(1);//', 'code_de_connexion');
    expect(page).toContain('"sitekey":"a\\"};alert(1);//"');
    expect(page).not.toContain('sitekey: "a"};alert(1);//"');
  });
});

describe('lireMessageDuCaptcha', () => {
  it('lit les trois issues', () => {
    expect(lireMessageDuCaptcha('{"type":"jeton","jeton":"abc"}')).toEqual({ type: 'jeton', jeton: 'abc' });
    expect(lireMessageDuCaptcha('{"type":"interaction"}')).toEqual({ type: 'interaction' });
    expect(lireMessageDuCaptcha('{"type":"erreur"}')).toEqual({ type: 'erreur' });
  });

  it('un jeton vide ou absent n’est pas un jeton', () => {
    expect(lireMessageDuCaptcha('{"type":"jeton","jeton":""}')).toBeNull();
    expect(lireMessageDuCaptcha('{"type":"jeton"}')).toBeNull();
  });

  it('ce qui est illisible s’ignore, sans lever', () => {
    expect(lireMessageDuCaptcha('pas du json')).toBeNull();
    expect(lireMessageDuCaptcha('null')).toBeNull();
    expect(lireMessageDuCaptcha('{"type":"autre"}')).toBeNull();
  });
});
