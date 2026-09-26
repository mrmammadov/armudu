// Sample article drawn into the texture that sits under the glass.

const ARTICLE = {
  kicker: 'Kitchen physics',
  title: 'Why the page bends when you read through your tea',
  dek: 'A glass of tea is a lens, a filter and a wave tank at once. Here is what each of them does to the words behind it.',
  byline: 'By the Science Desk  ·  6 min read  ·  26 September 2026',
  blocks: [
    ['p', 'Tilt a glass of tea toward a page of text and the letters swell near the middle, crowd together at the rim and drift whenever the liquid moves. None of that is special to tea. Any curved, transparent body filled with liquid bends light, and a tea glass happens to combine three separate effects in one object you already hold in your hand.'],
    ['h', 'The glass is a lens'],
    ['p', 'Light slows down when it enters glass and slows a little less in water. Each time it crosses a curved boundary between them, it changes direction. A rounded, water-filled volume bends rays inward, like a weak magnifying lens. Near the centre the words look bigger. Near the rim the rays bend so sharply that a wide strip of the page is squeezed into a thin band, and you start to see letters that sit outside the glass.'],
    ['note', 'Refractive index at 589 nm:  air 1.000  ·  water 1.333  ·  soda-lime glass ≈ 1.52'],
    ['p', 'Different colours bend by slightly different amounts, so near the rim each dark stroke picks up a red fringe on one side and a blue fringe on the other. Opticians call this chromatic aberration. In a tea glass it is small, but you can spot it on sharp black type.'],
    ['h', 'The tea is a filter'],
    ['p', 'Black tea gets its colour from theaflavins and thearubigins, compounds that form when the leaves oxidise. They absorb blue light strongly and red light weakly, so white paper seen through them turns amber. The effect follows the Beer–Lambert law: absorption grows exponentially with the length of the path. Light that crosses the glass near the rim travels through more tea than light going straight through the middle, so the edges look darker and redder than the centre.'],
    ['h', 'The surface is a wave tank'],
    ['p', 'Every small movement of your hand sets the surface rocking. Each ripple is a tiny moving lens that tilts the light passing through it, which is why the letters shimmer for a second after you put the glass down. Slosh it harder and the liquid piles up on one side, so the whole image slides that way before settling back.'],
    ['p', 'Put all three together and you get the familiar picture: a bright, magnified, amber middle, a dark and compressed rim, and a page that wobbles with every sip.'],
  ],
};

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Lays out (and optionally draws) the article in CSS pixels. Returns total height.
function drawArticle(ctx, Wc, draw) {
  const narrow = Wc < 560;
  const pad = narrow ? 20 : 40;
  const colW = Math.min(660, Wc - pad * 2);
  const x0 = Math.round((Wc - colW) / 2);
  const serif = 'Newsreader, Georgia, "Times New Roman", serif';
  const sans = '"IBM Plex Sans", system-ui, -apple-system, sans-serif';
  const mono = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const setLS = (v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };
  ctx.textBaseline = 'alphabetic';

  // masthead
  if (draw) {
    ctx.fillStyle = '#1E1812';
    ctx.font = `700 22px ${serif}`;
    ctx.fillText('Steep', pad, 34);
    if (!narrow) {
      ctx.font = `500 13px ${sans}`;
      ctx.fillStyle = '#6B6158';
      const nav = ['Science', 'Food', 'Culture', 'Subscribe'];
      let nx = Wc - pad;
      for (let i = nav.length - 1; i >= 0; i--) {
        const w = ctx.measureText(nav[i]).width;
        nx -= w;
        ctx.fillText(nav[i], nx, 33);
        nx -= 22;
      }
    }
    ctx.fillStyle = '#E4DED5';
    ctx.fillRect(0, 54, Wc, 1);
  }
  let y = 54 + (narrow ? 32 : 48);

  // kicker
  ctx.font = `600 12px ${sans}`;
  setLS('1.5px');
  if (draw) { ctx.fillStyle = '#94470A'; ctx.fillText(ARTICLE.kicker.toUpperCase(), x0, y); }
  setLS('0px');
  y += 18;

  // title
  const ts = narrow ? 30 : 44;
  ctx.font = `700 ${ts}px ${serif}`;
  for (const l of wrap(ctx, ARTICLE.title, colW)) {
    y += ts * 1.12;
    if (draw) { ctx.fillStyle = '#17120D'; ctx.fillText(l, x0, y); }
  }
  y += 16;

  // dek
  const ds = narrow ? 18 : 21;
  ctx.font = `italic 400 ${ds}px ${serif}`;
  for (const l of wrap(ctx, ARTICLE.dek, colW)) {
    y += ds * 1.4;
    if (draw) { ctx.fillStyle = '#4A4038'; ctx.fillText(l, x0, y); }
  }
  y += 22;

  // byline
  ctx.font = `400 13px ${sans}`;
  if (draw) { ctx.fillStyle = '#7A6F65'; ctx.fillText(ARTICLE.byline, x0, y); }
  y += 18;
  if (draw) { ctx.fillStyle = '#E4DED5'; ctx.fillRect(x0, y, colW, 1); }
  y += 14;

  const bs = narrow ? 17 : 19;
  const lh = bs * 1.62;
  for (const [type, text] of ARTICLE.blocks) {
    if (type === 'p') {
      ctx.font = `400 ${bs}px ${serif}`;
      y += 10;
      for (const l of wrap(ctx, text, colW)) {
        y += lh;
        if (draw) { ctx.fillStyle = '#211B16'; ctx.fillText(l, x0, y - lh * 0.28); }
      }
    } else if (type === 'h') {
      y += 26;
      ctx.font = `700 ${narrow ? 21 : 24}px ${serif}`;
      y += narrow ? 24 : 28;
      if (draw) { ctx.fillStyle = '#17120D'; ctx.fillText(text, x0, y); }
      y += 2;
    } else if (type === 'note') {
      y += 20;
      ctx.font = `400 ${narrow ? 12 : 13}px ${mono}`;
      const lines = wrap(ctx, text, colW - 32);
      const h = lines.length * 20 + 24;
      if (draw) {
        ctx.fillStyle = '#F5F1EB';
        ctx.fillRect(x0, y, colW, h);
        ctx.fillStyle = '#4E443B';
        lines.forEach((l, i) => ctx.fillText(l, x0 + 16, y + 28 + i * 20));
      }
      y += h + 8;
    }
  }
  return y + 80;
}
