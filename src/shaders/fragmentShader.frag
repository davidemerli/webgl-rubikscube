#version 300 es

precision mediump float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  //compute lambert diffuse
  vec3 diffuse = mDiffColor * lightColor * max(dot(fs_norm, lightDirection), 0.0);
  //compute ambient
  vec3 ambient = 0.3 * lightColor;
  //compute final color
  vec3 color = diffuse + ambient;

  vec3 N = normalize(fs_norm);
  vec3 L = normalize(lightDirection);
  vec3 R = reflect(-L, N);

  //compute specular
  vec3 V = normalize(fs_pos);
  vec3 H = normalize(V + L);
  vec3 specular = pow(max(dot(R, H), 0.0), 32.0) * lightColor;
  vec3 result = color + specular;
  outColor = vec4(result, 1.0) * texture(u_texture, fs_uv);
}
