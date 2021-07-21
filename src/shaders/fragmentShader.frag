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
  vec3 diffuse = mDiffColor * lightColor * max(dot(fs_norm, lightDirection), 0.0);
  // compute ambient
  vec3 ambient = lightColor;
  // compute specular
  vec3 viewDir = normalize(fs_pos);
  vec3 reflectDir = reflect(-lightDirection, fs_norm);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 2.0);

  // compute final color
  vec3 finalColor = 
    1.5 * diffuse + 
    0.45 * ambient + 
    1.0 * specular;
    
  outColor = vec4(finalColor, 1.0) * texture(u_texture, fs_uv);
}
