export const environment = {
  production: false,
  // vía proxy.conf.json → 192.168.2.40:8095 (evita CORS); en prod la app habla con el BFF
  wgerApiUrl: '/api/v2',
  bffApiUrl: 'http://localhost:3000',
};
