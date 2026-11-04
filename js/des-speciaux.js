// Dés spéciaux de l’échoppe : nom, prix, chances de chaque face, couleurs et textes.

// Achetés avec des groschens dans l’échoppe du menu ; le joueur en met jusqu’à six dans sa main,
// les autres dés restent ordinaires. Le Tavernier joue toujours avec des dés ordinaires.
// w : chances sur 100 de chaque face, du 1 au 6. joker : face gravée d’une tête cornue, qui remplace n’importe quel chiffre.
// desc : texte de l’échoppe ; effect : résumé court, dans la bulle qui s’affiche en jeu au-dessus du dé.
export const DIE_CATS = ['Diableries', 'Reliques', 'Dés pipés', 'Curiosités'];
export const DIE_KINDS = {
  soufre: { cat: 0, name: 'Dé de soufre', price: 160, w: [10, 9, 9, 9, 10, 53], body: '#e3c04f', pip: '#3b2a0c',
    desc: 'Il sent la mèche brûlée et tombe sur le 6 une fois sur deux. À plusieurs, les brelans de 6 pleuvent.',
    effect: 'Tombe sur le 6 une fois sur deux.' },
  braise: { cat: 0, name: 'Dé de braise', price: 220, w: [9, 8, 8, 8, 33, 34], body: '#9c2f1f', pip: '#f6d27a',
    desc: 'Chaud comme la forge : il aime le 5 et le 6.',
    effect: 'Tombe sur le 5 ou le 6 deux fois sur trois.' },
  cornu: { cat: 0, name: 'Dé du Cornu', price: 600, max: 1, joker: 1, w: [24, 15, 15, 15, 16, 15], body: '#2b211d', pip: '#e0523a',
    desc: 'Sa tête cornue remplace n’importe quel chiffre pour compléter un brelan, un carré ou une suite. Seule, elle ne rapporte rien.',
    effect: 'Sa tête cornue est un joker : elle complète un brelan, un carré ou une suite.' },
  procope: { cat: 1, name: 'Dé de saint Procope', price: 130, w: [10, 10, 45, 12, 11, 12], body: '#f3ecdc', pip: '#24467e',
    desc: 'L’ermite de Sázava avait un faible pour le 3 : il sort presque une fois sur deux.',
    effect: 'Tombe sur le 3 près d’une fois sur deux.' },
  venceslas: { cat: 1, name: 'Dé de saint Venceslas', price: 200, w: [14, 10, 12, 12, 40, 12], body: '#d9c6e6', pip: '#3e1f55',
    desc: 'Le bon duc porte chance au 5, qui rapporte à tous les coups.',
    effect: 'Tombe sur le 5 deux fois sur cinq.' },
  adalbert: { cat: 1, name: 'Dé de saint Adalbert', price: 320, w: [34, 8, 8, 8, 18, 24], body: '#f6f0e2', pip: '#8a6414',
    desc: 'Béni pour le 1 et le 6 : de quoi ouvrir un tour sans trembler.',
    effect: 'Tombe souvent sur le 1 (une fois sur trois) ou sur le 6.' },
  fele: { cat: 2, name: 'Dé fêlé', price: 30, w: [21, 16, 16, 15, 16, 16], body: '#d6d0c4', pip: '#4a3020',
    desc: 'Une fêlure le fait pencher, à peine, vers le 1. Le premier dé du tricheur.',
    effect: 'Tombe un peu plus souvent sur le 1.' },
  pair: { cat: 2, name: 'Dé pair', price: 60, w: [5, 30, 5, 30, 5, 25], body: '#efe4cf', pip: '#1f6a55',
    desc: 'Il ne connaît guère que le 2, le 4 et le 6. Bon pour les brelans, risqué seul.',
    effect: 'Tombe presque toujours sur 2, 4 ou 6.' },
  petits: { cat: 2, name: 'Dé des petits', price: 210, w: [32, 24, 18, 12, 8, 6], body: '#c49563', pip: '#24140a',
    desc: 'Il roule vers les petits chiffres : beaucoup de 1, presque jamais de 6.',
    effect: 'Beaucoup de 1 et de 2, presque jamais de 6.' },
  impair: { cat: 2, name: 'Dé impair', price: 240, w: [30, 5, 30, 5, 25, 5], body: '#26262c', pip: '#f2ead6',
    desc: 'Il tombe presque toujours sur 1, 3 ou 5.',
    effect: 'Tombe presque toujours sur 1, 3 ou 5.' },
  chanceux: { cat: 2, name: 'Dé chanceux', price: 300, w: [30, 10, 10, 10, 30, 10], body: '#4f8a57', pip: '#f5ecd2',
    desc: 'Le 1 et le 5 sortent plus souvent : il éloigne le Farkle.',
    effect: 'Tombe plus souvent sur le 1 et le 5.' },
  plombe: { cat: 2, name: 'Dé plombé', price: 480, w: [52, 9, 10, 10, 9, 10], body: '#8f9091', pip: '#151515',
    desc: 'Une goutte de plomb sous le 6 : il retombe sur le 1 plus d’une fois sur deux.',
    effect: 'Tombe sur le 1 plus d’une fois sur deux.' },
  bancal: { cat: 3, name: 'Dé bancal', price: 80, w: [6, 8, 10, 26, 30, 20], body: '#d8b98c', pip: '#6b2414',
    desc: 'Taillé de travers, il penche vers le 4 et le 5.',
    effect: 'Penche vers le 4 et le 5.' },
  colporteur: { cat: 3, name: 'Dé du colporteur', price: 110, w: [10, 21, 21, 21, 17, 10], body: '#3c5f8f', pip: '#f3e6c4',
    desc: 'Rapporté de Nuremberg, il préfère les chiffres du milieu : de quoi tenter les suites.',
    effect: 'Préfère le 2, le 3 et le 4 : bon pour les suites.' },
};
// Valeur d’un dé pour le score : 0 pour la tête cornue (joker), sinon le chiffre du dessus
export const faceValue = (d) => (d.kind && DIE_KINDS[d.kind].joker === d.value ? 0 : d.value);
