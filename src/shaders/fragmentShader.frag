#version 300 es

precision mediump float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform vec3 mDiffColor; //material diffuse color 

uniform vec3 dirLightDirection; // directional light direction vec
uniform vec3 dirLightColor; // directional light color 
uniform float dirLightGamma; // reflection coefficient

uniform vec3 pointLightPos; // point light position
uniform vec3 pointLightColor; // point light color 


uniform vec3 eyePosition; // observer position

uniform sampler2D u_texture;

out vec4 outColor;


vec3 pointLightColorWithDecay(vec3 pointLightPos, vec3 pointLightColor, vec3 fs_pos, float target, float decay) {
  return pointLightColor * pow(target / length(pointLightPos - fs_pos), decay);
}

vec3 lambertDiffuse(vec3 normal, vec3 lightDirection, vec3 lightColor) {
    return lightColor * clamp(dot(normal, lightDirection), 0.0, 1.0);
}

vec3 phongSpecular(vec3 normal, vec3 eyeDir, vec3 lightDirection, vec3 lightColor, float lightGamma) {
  vec3 reflectDir = -reflect(lightDirection, normal);
  float specular = clamp(pow(dot(eyeDir, reflectDir), lightGamma), 0.0, 1.0);

  return lightColor * specular;
}
void main() {
  vec3 dirLightDirection = normalize(dirLightDirection);
  vec3 eyeDir = normalize(eyePosition - fs_pos);
  vec3 normal = normalize(fs_norm);

  // compute lambert diffuse
  vec3 diffuseA = lambertDiffuse(normal, dirLightDirection, dirLightColor);

  // compute specular
  vec3 specularA = phongSpecular(normal, eyeDir, dirLightDirection, dirLightColor, dirLightGamma);

  // combine
  vec3 color = mDiffColor * (diffuseA + specularA);

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0) * texture(u_texture, fs_uv);
}
