# armudu

Read the page through a glass of tea.

A WebGL shader that warps text the way it looks through an *armudu*, the
pear-shaped Azerbaijani tea glass. The middle is magnified, the rim is squeezed,
the page turns amber, and the tea sloshes and ripples as you move the glass.

<!-- TODO: add preview.gif -->

## Run it

There's no build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Controls

| Input | What it does |
| --- | --- |
| Mouse move / drag | Steer the glass |
| Click / tap | Slosh the tea |
| Scroll, Page Up / Page Down | Read further down the page |
| Arrow keys, Space | Steer and slosh from the keyboard |
| Drop, paste or upload an image | Put your own screenshot under the glass |

The panel sets the drink (strong black, weak black, green, water), its strength,
magnification, wobble and glass size.

## How the warp works

Everything happens in one fragment shader (`src/shaders.js`). For each pixel:

1. **Lens.** Inside the glass, the distance from the centre is remapped with
   `s = r / mag + (1.24 - 1/mag) · r⁴`. The centre is magnified, and the rim
   shows the page up to 24% beyond the glass's edge.
2. **Glass wall.** A thin ring outside the rim samples the page further out,
   squeezed into a few pixels and tinted slightly green.
3. **Chromatic aberration.** Red, green and blue are sampled at slightly
   different radii, and the gap grows towards the rim.
4. **Tea absorption (Beer–Lambert).** `colour · exp(-absorb · strength · path)`.
   The path is longer near the rim and where the liquid has pooled, so the
   edges come out darker.
5. **Ripples.** A sum of sine waves forms the surface. Its gradient nudges each
   sample, and it also brightens and darkens the light slightly, like caustics.
6. **Slosh.** On the JS side (`src/armudu.js`), a damped spring driven by the
   glass's acceleration shifts the optical centre and makes the ripples bigger.
7. **Lighting.** A crescent reflection on the rim, a glint, the glass's shadow,
   and the amber caustic that glass casts onto the table.

## Files

```
index.html        page markup and controls
src/style.css     UI styles (light and dark)
src/article.js    sample article drawn into the texture
src/shaders.js    vertex and fragment shaders
src/armudu.js     WebGL setup, input, slosh physics, render loop
```
