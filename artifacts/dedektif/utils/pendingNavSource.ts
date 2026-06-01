let _source: "home" | "gorevler" | null = null;

export function setPendingNavSource(src: "home" | "gorevler"): void {
  _source = src;
}

export function takePendingNavSource(): "home" | "gorevler" | null {
  const s = _source;
  _source = null;
  return s;
}
