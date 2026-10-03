// "The Deep" — the RAW octopus, barely there behind the murk. Only the eyes are certain.
// Kept in its own file so tools/deep-poster.mjs can render the poster from the same source.

export const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLook;    // gaze, -1..1
uniform float uBlink;  // 0 open .. 1 shut
uniform float uPulse;  // tap flare, decays to 0
uniform float uScroll; // 0 at top .. 1 hero scrolled away
uniform float uBurst;  // seconds since the last exhale of bubbles

#define PI 3.14159265

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdEll(vec2 p, vec2 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float sdVesica(vec2 p, float r, float d){
  p = abs(p);
  float b = sqrt(r * r - d * d);
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0.0, b)) : length(p - vec2(-d, 0.0)) - r;
}

// One of the logo's slanted, angry eyes. side = +1 right, -1 left (mirrored).
vec3 eye(vec2 p, vec2 c, float side, float open, float glow, inout float mask){
  vec2 q = p - c;
  q.x *= side;
  float a = 0.38; // inner corner dips toward the centre
  q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
  float o = max(open, 0.035);
  float sx = 0.72 + 0.28 * smoothstep(0.0, 0.7, o); // lids shorten the eye as they close
  float d = sdVesica(vec2(q.y / o, q.x / sx), 0.0856, 0.0706) * min(o, sx);
  vec2 hc = q - vec2(uLook.x * side * 0.013, uLook.y * 0.0045 * o);
  vec2 hs = hc / vec2(0.024, 0.0095 * o + 0.001);
  float core = exp(-dot(hs, hs));
  float inside = smoothstep(0.0045, -0.003, d);
  mask = max(mask, inside);
  // the halo shrinks with the lids, so a blink reads as a blink, not a flare
  float lid = smoothstep(0.05, 0.6, o);
  float nearG = exp(-max(d, 0.0) * 62.0) * (0.35 + 0.65 * lid);
  float farG = exp(-max(d, 0.0) * 11.0) * lid;
  vec3 violet = vec3(0.62, 0.16, 1.0);
  vec3 halo = violet * (nearG * 0.9 + farG * 0.26) * glow;
  vec3 iris = mix(violet * 1.7, vec3(1.0, 0.95, 1.0), core) * inside * (0.9 + 0.9 * core) * glow;
  return halo + iris;
}

// Eight arms fanning from under the mantle; returns distance, writes the white "logo stroke".
float tentacles(vec2 p, vec2 O, float t, out float stroke){
  vec2 q = p - O;
  float r = length(q);
  float th = atan(q.y, q.x);
  float d = 1e3;
  stroke = 0.0;
  for (int i = 0; i < 8; i++){
    float fi = float(i);
    float side = i < 4 ? -1.0 : 1.0;
    float j = mod(fi, 4.0);
    float base = -PI * 0.5 + side * (0.2 + j * 0.39);
    float len = 0.29 + 0.05 * sin(fi * 3.1) + j * 0.035;
    float u = clamp(r / len, 0.0, 1.0);
    float curl = side * (0.12 + j * 0.5) * u * u
               + 0.24 * sin(r * 13.0 - t * (0.75 + 0.12 * j) + fi * 1.9) * u
               + 0.05 * sin(t * 0.45 + fi);
    float da = th - (base + curl);
    da = mod(da + PI, 2.0 * PI) - PI;
    float w = 0.034 * pow(1.0 - u, 0.85) + 0.003;
    float dd = abs(da) * r - w;
    if (r > len) dd = max(dd, r - len);
    d = min(d, dd);
    float s = (da * r + side * w * 0.35) / (0.25 * w + 0.002);
    stroke = max(stroke, exp(-s * s) * smoothstep(len, len * 0.55, r) * smoothstep(0.03, 0.07, r));
  }
  return d;
}

vec3 bubbles(vec2 p, float t){
  vec3 acc = vec3(0.0);
  for (int L = 0; L < 3; L++){
    float fl = float(L);
    vec2 q = p * (7.0 + fl * 6.0);
    q.y -= t * (0.35 + 0.2 * fl);
    q.x += sin(q.y * 0.8 + fl * 2.0) * 0.2;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash(id + fl * 17.3);
    if (h > 0.86){
      vec2 o = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.5;
      float rad = 0.06 + 0.1 * hash(id + 1.3);
      float dd = length(f - o);
      float ring = smoothstep(rad, rad * 0.72, dd) - 0.6 * smoothstep(rad * 0.72, rad * 0.4, dd);
      acc += vec3(0.75, 0.65, 1.0) * ring * (0.12 / (1.0 + fl * 0.6));
    }
  }
  return acc;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec3 abyss = vec3(0.027, 0.024, 0.031);
  vec3 violet = vec3(0.59, 0.12, 0.96);
  vec3 deep = vec3(0.23, 0.04, 0.42);

  // where the being floats: slow drift, leans toward what it watches, sinks as you scroll away
  vec2 C = vec2(0.0, 0.115) + vec2(sin(t * 0.21) * 0.012, sin(t * 0.33) * 0.012) + uLook * vec2(0.01, 0.006);
  C.y -= uScroll * 0.17;
  float breath = 1.0 + 0.018 * sin(t * 0.9);

  vec3 col = abyss;
  col += deep * 0.32 * exp(-length((p - C) * vec2(1.0, 0.75)) * 3.0);
  // light shafts from the surface
  float sh = pow(noise(vec2(p.x * 6.0 + p.y * 2.2 + t * 0.05, t * 0.07)), 3.0) * smoothstep(-0.15, 0.5, p.y);
  col += vec3(0.42, 0.3, 0.6) * sh * 0.1;
  // drifting murk behind
  vec2 fp = p * 2.0 + vec2(0.0, -t * 0.02);
  float w1 = fbm(fp + 1.5 * fbm(fp * 1.3 + vec2(t * 0.03, 0.0)));
  col += vec3(0.2, 0.09, 0.32) * w1 * w1 * 0.32;

  // the body: mantle + arms, a silhouette darker than the water
  float stroke;
  float dT = tentacles(p, C + vec2(0.0, -0.075), t, stroke);
  float dH = sdEll(p - (C + vec2(0.0, 0.085)), vec2(0.168, 0.2) * breath);
  float body = smin(dH, dT, 0.05);
  float bw = 0.012 + 0.03 * uScroll;
  float sil = 1.0 - smoothstep(-bw, bw, body);
  vec3 skin = vec3(0.008, 0.005, 0.014) + deep * 0.16 * fbm(p * 7.0 + vec2(0.0, t * 0.04));
  skin += violet * 0.13 * exp(-length((p - C) * vec2(1.0, 1.6)) * 10.0);
  col = mix(col, skin, sil * 0.93);
  col += vec3(0.62, 0.45, 0.95) * exp(-abs(body + 0.006) * 60.0) * (0.09 + 0.05 * sin(t * 0.6));
  col += vec3(0.85, 0.8, 1.0) * stroke * 0.11 * (1.0 - uScroll);

  // murk in front — the blur it hides behind
  float wf = fbm(p * 3.2 + vec2(t * 0.015, -t * 0.035) + 11.0);
  col = mix(col, vec3(0.045, 0.028, 0.075), smoothstep(0.42, 0.85, wf) * 0.6);

  // the eyes cut through everything
  float open = clamp((1.0 - uBlink) * (1.0 + 0.35 * uPulse) * (1.0 - 0.4 * uScroll), 0.0, 1.3);
  float glow = (0.9 + 0.1 * sin(t * 1.7) + 0.05 * sin(t * 7.3) * sin(t * 2.9)) * (1.0 + 1.3 * uPulse) * (1.0 - 0.45 * uScroll);
  float mask = 0.0;
  col += eye(p, C + vec2(0.068, 0.0), 1.0, open, glow, mask);
  col += eye(p, C + vec2(-0.068, 0.0), -1.0, open, glow, mask);
  col += violet * exp(-length((p - C) * vec2(0.9, 1.4)) * 7.0) * (0.05 + 0.14 * w1) * glow * (1.0 - 0.6 * uBlink);

  col += bubbles(p, t);
  // an exhale: bubbles stream from the side of the mantle
  if (uBurst < 5.0){
    for (int k = 0; k < 10; k++){
      float fk = float(k);
      float tt = uBurst - fk * 0.17;
      if (tt > 0.0){
        vec2 bp = C + vec2(0.16 + sin(tt * 3.0 + fk) * 0.015, -0.02 + tt * 0.17);
        float br = 0.005 + 0.004 * hash(vec2(fk, 1.0));
        float dd = length(p - bp);
        col += vec3(0.8, 0.7, 1.0) * (smoothstep(br, br * 0.45, dd) - 0.5 * smoothstep(br * 0.6, 0.0, dd)) * (1.0 - smoothstep(2.5, 5.0, tt)) * 0.55;
      }
    }
  }

  col *= 1.0 - 0.75 * pow(length(p * vec2(1.25, 0.95)), 2.0);
  col += (hash(gl_FragCoord.xy + fract(t * 7.0) * 91.0) - 0.5) * 0.035;
  col = 1.0 - exp(-max(col, 0.0) * 1.12);
  gl_FragColor = vec4(col, 1.0);
}
`;
