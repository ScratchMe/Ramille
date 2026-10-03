import { faceAuClavier } from './face-au-clavier';

describe('faceAuClavier', () => {
  it('rembourre sur Android, où la fenêtre ne rétrécit plus sous le clavier', () => {
    expect(faceAuClavier('android')).toBe('padding');
  });

  it('ne fait rien sur le web, où le navigateur réduit la zone visible lui-même', () => {
    expect(faceAuClavier('web')).toBeNull();
  });
});
