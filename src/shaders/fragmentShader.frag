#version 300 es

precision mediump float;


in vec3 colorV; // varying?
out vec4 outColor;

void main() {
  outColor = vec4(colorV, 1.0);
}