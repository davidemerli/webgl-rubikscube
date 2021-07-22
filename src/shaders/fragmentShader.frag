#version 300 es

precision mediump float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

uniform vec3 eyePosition;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  // compute lambert diffuse
  vec3 diffuse = mDiffColor * lightColor * max(dot(fs_norm, lightDirection), 0.0);
  // compute ambient
  vec3 ambient = lightColor;

	vec3 eyeDir = normalize(eyePosition - fs_pos);
  vec3 reflectDir = -reflect(lightDirection, fs_norm);

  // compute Phong specular
  float specular = clamp(pow(dot(eyeDir, reflectDir), 2.0), 0.0, 1.0);

  // compute final color
  vec3 finalColor = 
    1.0 * diffuse + 
    0.5 * ambient + 
    0.2 * specular;
    
  outColor = vec4(finalColor, 1.0) * texture(u_texture, fs_uv);
}
