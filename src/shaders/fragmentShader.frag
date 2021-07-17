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
  // compute lambert diffuse
  vec3 diffuse = mDiffColor * lightColor * max(dot(fs_norm, lightDirection), 0.1);
  // compute ambient
  vec3 ambient = 0.3 * lightColor;
  // compute specular
  vec3 viewDir = normalize(fs_pos);
  vec3 reflectDir = reflect(-lightDirection, fs_norm);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 8.0);

  // compute final color
  vec3 finalColor = 
    1.0 * diffuse + 
    1.0 * ambient + 
    0.1 * specular;
    
  outColor = vec4(finalColor, 1.0) * texture(u_texture, fs_uv);
}
