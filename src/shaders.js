// Vertex + fragment shaders for the tea glass lens.

const VERT = `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes, uTexSize, uC, uSlosh;
  uniform float uScroll, uR, uTime, uEnergy, uTea, uMag, uWobble, uDpr;
  uniform vec3 uAbsorb;

  vec3 src(vec2 p) {
    vec2 uv = (p + vec2(0.0, uScroll)) / uTexSize;
    return texture2D(uTex, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
  }

  // Height field of the liquid surface, in glass-radius units.
  float waves(vec2 q, float t) {
    float h = 0.0;
    h += sin(q.x * 6.1 + t * 1.3 + sin(q.y * 2.0 + t * 0.7)) * 0.50;
    h += sin(q.y * 7.3 - t * 1.7 + q.x * 2.4) * 0.40;
    h += sin((q.x - q.y) * 11.0 + t * 2.6) * 0.22;
    h += sin(length(q + uSlosh) * 16.0 - t * 5.0) * 0.35 * uEnergy;
    return h;
  }

  void main() {
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 q = (p - uC) / uR;
    float r = length(q);
    float aa = 1.2 * uDpr / uR;
    vec3 teaHue = exp(-uAbsorb * 0.9);

    // The page outside the glass, with the glass's shadow and the
    // bright amber caustic that light focuses onto the table.
    vec3 outside = src(p);
    vec2 sq = q - vec2(0.10, 0.16);
    float shadow = smoothstep(1.18, 0.92, length(sq));
    outside *= 1.0 - 0.14 * shadow;
    vec2 cq = q - vec2(0.62, 0.88);
    float caust = exp(-dot(cq, cq) * 10.0) * min(uTea + 0.25, 1.0);
    outside = mix(outside, min(outside * mix(vec3(1.0), teaHue, 0.6) * 1.25, 1.0), caust * 0.55);

    if (r > 1.12) { gl_FragColor = vec4(outside, 1.0); return; }

    vec2 nq = q / max(r, 1e-4);
    float facing = max(dot(nq, normalize(vec2(-0.7, -1.0))), 0.0);

    // ---- inside: lens + liquid ----
    vec2 lensC = uSlosh * 0.35;                // liquid piles up, optical centre shifts
    vec2 qc = q - lensC;
    float rc = length(qc);
    float edge = 1.24;                         // rim shows the page 24% beyond the glass
    float s = rc / uMag + (edge - 1.0 / uMag) * pow(min(rc, 1.3), 4.0);
    vec2 base = lensC + (qc / max(rc, 1e-4)) * s;

    float e = 0.01;
    float h0 = waves(q, uTime);
    vec2 g = vec2(waves(q + vec2(e, 0.0), uTime) - h0, waves(q + vec2(0.0, e), uTime) - h0) / e;
    float amp = (0.0015 + 0.011 * uWobble) * (1.0 + 4.0 * uEnergy);
    base += g * amp;

    float ca = (0.003 + 0.02 * pow(r, 3.0)) * (0.6 + 0.4 * uMag);
    float blur = (0.5 + 3.0 * pow(r, 4.0) + 1.2 * uTea) * uDpr * 0.5;
    vec2 o1 = vec2(blur, 0.0), o2 = vec2(0.0, blur);
    vec2 cR = uC + base * (1.0 + ca) * uR;
    vec2 cG = uC + base * uR;
    vec2 cB = uC + base * (1.0 - ca) * uR;
    vec3 inCol;
    inCol.r = (src(cR + o1).r + src(cR - o1).r + src(cR + o2).r + src(cR - o2).r) * 0.25;
    inCol.g = (src(cG + o1).g + src(cG - o1).g + src(cG + o2).g + src(cG - o2).g) * 0.25;
    inCol.b = (src(cB + o1).b + src(cB - o1).b + src(cB + o2).b + src(cB - o2).b) * 0.25;

    // Beer-Lambert: longer path near the rim and where the liquid pooled
    float path = 1.0 + 1.8 * r * r + 0.6 * dot(q, -uSlosh);
    inCol *= exp(-uAbsorb * uTea * max(path, 0.3));
    inCol = mix(inCol, teaHue * 0.85, 0.08 * min(uTea, 1.5) * r);

    // ripples focus and defocus light
    inCol *= 1.0 + 0.012 * (g.x - g.y) * (uWobble + uEnergy);

    // lighting: reflection crescent, small glint, amber back-glow, dark inner rim
    float crescent = smoothstep(0.72, 0.9, r) * smoothstep(1.0, 0.92, r) * pow(facing, 5.0);
    inCol += crescent * 0.5;
    vec2 gq = q - vec2(-0.36, -0.46);
    inCol += exp(-dot(gq, gq) * 160.0) * 0.55;
    float back = pow(max(dot(nq, normalize(vec2(0.7, 1.0))), 0.0), 3.0) * smoothstep(0.55, 0.97, r);
    inCol = mix(inCol, min(inCol * vec3(1.2, 1.02, 0.8), 1.0), back * 0.5 * min(uTea + 0.2, 1.0));
    inCol *= 1.0 - 0.45 * smoothstep(0.9, 1.0, r);

    // ---- the glass wall: a thin, squeezed view of the page further out ----
    float w = clamp((r - 1.0) / 0.07, 0.0, 1.0);
    vec3 wallCol = src(uC + nq * (edge + 0.05 + w * 0.6) * uR) * vec3(0.9, 0.96, 0.94);
    wallCol = mix(wallCol, vec3(1.0), 0.1 + 0.3 * pow(facing, 3.0));
    wallCol *= 1.0 - 0.35 * smoothstep(0.5, 1.0, w) * (1.0 - facing);

    float inMask = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
    float wallMask = 1.0 - smoothstep(1.07 - aa, 1.07 + aa, r);
    vec3 col = mix(outside, wallCol, wallMask);
    col = mix(col, inCol, inMask);
    col = mix(col, vec3(1.0), smoothstep(aa * 1.5, 0.0, abs(r - 1.0)) * 0.25);
    col = mix(col, vec3(1.0), smoothstep(aa * 1.5, 0.0, abs(r - 1.07)) * (0.2 + 0.4 * facing));
    gl_FragColor = vec4(col, 1.0);
  }`;
