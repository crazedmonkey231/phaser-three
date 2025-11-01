// HEIGHT compute: R = height, G = velocity
export const HEIGHT_FS = /* glsl */`
  #include <common>
  uniform vec2  mousePos;        // in local XY of the plane
  uniform float mouseSize;       // splash radius (world units)
  uniform float viscosity;       // damping
  uniform float delta;           // dt (seconds)
  uniform vec2  bounds;          // half-size in world units (X,Y)
  uniform float splashStrength;  // impulse multiplier (set by JS)
  uniform float baselineReturn;

  #define MAX_PW 4
  #define MAX_RW 4
  uniform float simTime;

  uniform vec2  pw_dir[MAX_PW];
  uniform float pw_k[MAX_PW];
  uniform float pw_omega[MAX_PW];
  uniform float pw_amp[MAX_PW];
  uniform float pw_phase[MAX_PW];

  uniform vec2  rw_center[MAX_RW];
  uniform float rw_k[MAX_RW];
  uniform float rw_omega[MAX_RW];
  uniform float rw_amp[MAX_RW];
  uniform float rw_decay[MAX_RW];
  uniform float rw_phase[MAX_RW];

  void main() {
    vec2 cell = 1.0 / resolution.xy;
    vec2 uv   = gl_FragCoord.xy * cell;

    vec4 h  = texture2D(heightmap, uv);
    float hC = h.x;

    float hL = texture2D(heightmap, uv + vec2(-cell.x, 0.0)).x;
    float hR = texture2D(heightmap, uv + vec2( cell.x, 0.0)).x;
    float hD = texture2D(heightmap, uv + vec2(0.0, -cell.y)).x;
    float hU = texture2D(heightmap, uv + vec2(0.0,  cell.y)).x;
    float sump = (hL + hR + hD + hU - 4.0 * hC);

    float GRAVITY = resolution.x * 3.0;
    float accel = sump * GRAVITY;

    float vel    = h.y + accel * delta;
    float height = hC   + vel   * delta;

    // viscosity-type smoothing
    height += sump * viscosity;

    // splash: UV->local XY in world units
    vec2 local = (uv - 0.5) * 2.0 * bounds;
    float d = length(local - mousePos);
    float k = clamp(1.0 - smoothstep(0.0, mouseSize, d), 0.0, 1.0);

    // impulse into VELOCITY (feels better)
    float r   = d / mouseSize;           // normalized radius (0..~1 in splash)
    float r2  = r * r;
    float g   = exp(-100.0 * r2);          // bell core
    float impulse = (1.0 - 50.0 * r2) * g * splashStrength;
    // positive center, negative ring ⇒ net ≈ 0
    vel += impulse;

    // --- continuous wave forcing (plane + radial) --------------------
    float forcing = 0.0;

    // Plane waves (no break—guard inside loop)
    for (int i = 0; i < MAX_PW; ++i) {
      float amp = pw_amp[i];
      if (amp != 0.0) {
        float theta = pw_k[i] * dot(pw_dir[i], local) - pw_omega[i] * simTime + pw_phase[i];
        forcing += pw_amp[i] * sin(theta);
      }
    }

    // Radial waves (zero-mean envelope)
    for (int i = 0; i < MAX_RW; ++i) {
      float amp = rw_amp[i];
      if (amp != 0.0) {
        vec2  d = local - rw_center[i];
        float r = length(d);

        // derive a stable sigma from decay (decay ~ 1/sigma). guard against 0.
        float sigma = max(1e-3, 1.0 / rw_decay[i]);
        float q = r / sigma;

        // zero-mean "Mexican hat": positive center, negative ring, integrates ~0
        float env = exp(-q*q);
        float hat = (1.0 - 2.0*q*q) * env;

        float om = max(rw_omega[i], 1e-3);
        float theta = rw_k[i] * r - om * simTime + rw_phase[i];
        float wave  = sin(theta);

        // zero-mean forcing
        float f = amp * hat * wave;

        forcing += f;
      }
    }

    // Inject into velocity
    vel += forcing * delta;

    // (optional) safety clamp against numeric blowups
    vel    = clamp(vel,   -20.0, 20.0);
    height = hC + vel * delta;
    height = clamp(height, -5.0, 5.0);

    // slight global decay & integrate
    vel   *= 0.995;
    height = hC + vel * delta;

    // baseline return (prevents drift)
    height -= height * baselineReturn * delta;

    // edge damping
    float fx = min(uv.x, 1.0 - uv.x);
    float fy = min(uv.y, 1.0 - uv.y);
    float border = smoothstep(0.0, 0.04, min(fx, fy));
    vel *= mix(0.99, 1.0, border);

    gl_FragColor = vec4(height, vel, 0.0, 1.0);
  }
`

export const NORMAL_FS = /* glsl */`
  // NOTE: 'uniform sampler2D heightmap;' is auto-injected by GPUComputationRenderer
  uniform vec2  cell;           // 1 / resolution
  uniform float displacement;   // match MeshStandardMaterial.displacementScale
  uniform vec2  foamParams;     // x=threshold, y=sharpness

  void main() {
    vec2 uv = gl_FragCoord.xy * cell;

    float c  = texture2D(heightmap, uv).x;
    float cx = texture2D(heightmap, uv + vec2(cell.x, 0.0)).x;
    float cy = texture2D(heightmap, uv + vec2(0.0, cell.y)).x;

    // derivatives in object-space units
    float dx = (cx - c) * displacement;
    float dy = (cy - c) * displacement;

    // tangent-space normal (plane is XY, +Z up in object space)
    vec3 n   = normalize(vec3(-dx, -dy, 1.0));
    vec3 enc = n * 0.5 + 0.5;

    // foam from slope magnitude (simple & fast)
    float slope = length(vec2(cx - c, cy - c));
    float foam  = smoothstep(foamParams.x, foamParams.x + foamParams.y, slope);

    gl_FragColor = vec4(enc, foam);
  }
`