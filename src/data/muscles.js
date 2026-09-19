// muscles: cor + optional sag placement {t,off,len,wid}. Rendered only if the
// plane placement exists AND the bone is in the active rig.
export const MUSCLES = [
  { id: "scmL", bone: "neck", name: "Sternocleidomastoid", cor: { t: .5, off: -9, len: 26, wid: 8 }, sag: { t: .5, off: 7, len: 22, wid: 7 } },
  { id: "scmR", bone: "neck", name: "Sternocleidomastoid", cor: { t: .5, off: 9, len: 26, wid: 8 } },
  { id: "pecL", bone: "spineUp", name: "Pectoralis major", cor: { t: .25, off: -26, len: 40, wid: 26 }, sag: { t: .28, off: 20, len: 34, wid: 22 } },
  { id: "pecR", bone: "spineUp", name: "Pectoralis major", cor: { t: .25, off: 26, len: 40, wid: 26 } },
  { id: "abs", bone: "spineLo", name: "Rectus abdominis", cor: { t: .5, off: 0, len: 56, wid: 30 }, sag: { t: .5, off: 15, len: 34, wid: 24 } },
  { id: "oblL", bone: "spineLo", name: "External oblique", cor: { t: .45, off: -26, len: 40, wid: 16 }, sag: { t: .5, off: 22, len: 34, wid: 16 } },
  { id: "oblR", bone: "spineLo", name: "External oblique", cor: { t: .45, off: 26, len: 40, wid: 16 } },
  { id: "deltL", bone: "uarmL", name: "Deltoid", cor: { t: .14, off: 0, len: 34, wid: 26 }, sag: { t: .14, off: 0, len: 32, wid: 26 } },
  { id: "deltR", bone: "uarmR", name: "Deltoid", cor: { t: .14, off: 0, len: 34, wid: 26 } },
  { id: "bicL", bone: "uarmL", name: "Biceps brachii", cor: { t: .55, off: 0, len: 44, wid: 18 }, sag: { t: .55, off: -9, len: 44, wid: 16 } },
  { id: "bicR", bone: "uarmR", name: "Biceps brachii", cor: { t: .55, off: 0, len: 44, wid: 18 } },
  { id: "brL", bone: "farmL", name: "Brachioradialis", cor: { t: .45, off: 0, len: 40, wid: 16 }, sag: { t: .45, off: -6, len: 40, wid: 14 } },
  { id: "brR", bone: "farmR", name: "Brachioradialis", cor: { t: .45, off: 0, len: 40, wid: 16 } },
  { id: "quadL", bone: "thighL", name: "Quadriceps femoris", cor: { t: .5, off: 0, len: 66, wid: 26 }, sag: { t: .5, off: -9, len: 60, wid: 24 } },
  { id: "quadR", bone: "thighR", name: "Quadriceps femoris", cor: { t: .5, off: 0, len: 66, wid: 26 } },
  { id: "tibL", bone: "shinL", name: "Tibialis anterior", cor: { t: .45, off: -6, len: 52, wid: 14 }, sag: { t: .45, off: -7, len: 50, wid: 14 } },
  { id: "tibR", bone: "shinR", name: "Tibialis anterior", cor: { t: .45, off: 6, len: 52, wid: 14 } },
];

