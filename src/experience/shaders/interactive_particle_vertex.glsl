#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)

precision highp float;

attribute float pIndex;
attribute vec3 position;
attribute vec3 offset;
attribute vec2 uv;
attribute float angle;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float uTime;
uniform float uRandom;
uniform float uDepth;
uniform float uSize;
uniform vec2 uTextureSize;
uniform sampler2D uTexture;
uniform sampler2D uTouch;

varying vec2 vPUv;
varying vec2 vUv;

float random(float n) {
    return fract(sin(n) * 43758.5453123);
}

void main() {
    vUv = uv;

    // Particle UV
    vec2 puv = offset.xy / uTextureSize;
    vPUv = puv;

    // Pixel Color
    vec4 colA = texture2D(uTexture, puv);
    float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07; // Luminosity Method

    // Particle Displacement
    vec3 displaced = offset;
    // randomize
    displaced.xy += vec2(random(pIndex) - 0.5, random(offset.x + pIndex) - 0.5) * uRandom;
    float randz = (random(pIndex) + snoise2(vec2(pIndex * 0.1, uTime * 0.1)));
    displaced.z += randz * (random(pIndex) * 2.0 * uDepth);
    // center the image
    displaced.xy -= uTextureSize * 0.5;

    // Touch/Hover Effect
    float t = texture2D(uTouch, puv).r;
    displaced.z += t * 20.0 * randz;
    displaced.x += cos(angle) * t * 20.0 * randz;
    displaced.y += sin(angle) * t * 20.0 * randz;

    // Particle Size
    float psize = (snoise2(vec2(uTime, pIndex) * 0.5) + 2.0);
    psize *= max(grey, 0.2);
    psize *= uSize;

    // Final Position
    displaced += position * psize;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vec4 finalPosition = projectionMatrix * mvPosition;

    gl_Position = finalPosition;
}