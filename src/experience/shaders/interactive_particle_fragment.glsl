precision highp float;

uniform sampler2D uTexture;

varying vec2 vPUv;
varying vec2 vUv;

void main() {
    vec4 color = vec4(0.0);
    vec2 uv = vUv;
    vec2 puv = vPUv;

    // Pixel color
    vec4 colA = texture2D(uTexture, puv);

    // RGBA color to RGBA greyscale using Luminosity Method. 
    float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
    vec4 colB = vec4(
        (104.0/255.0*0.5 + grey*0.5), 
        (195.0/255.0*0.5 + grey*0.5), 
        (192.0/255.0*0.5 + grey*0.5), 
        1.0);

    // The alpha channel is determined by the linear distance to the centre of the UV, 
    // which essentially creates a circle.
    float border = 0.3;
    float radius = 0.5;
    float dist = radius - distance(uv, vec2(0.5));

    // The border of the circle can be blurred out using smoothstep.
    // Smooth transition based on u_colorFactor: 0.0 = original, 1.0 = greyscale
    float t = smoothstep(0.0, border, dist);

    // final color
    color = colB;
    color.a = t;

    gl_FragColor = color;
}