import type { NextConfig } from "next";

// En-têtes de sécurité envoyés avec chaque page du dashboard
const entetesSecurite = [
  // Interdit d'afficher le dashboard dans une page d'un autre site (anti "clickjacking")
  { key: "X-Frame-Options", value: "DENY" },
  // Le navigateur ne doit pas deviner le type des fichiers
  { key: "X-Content-Type-Options", value: "nosniff" },
  // N'envoie pas l'adresse complète des pages aux autres sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le dashboard n'utilise ni caméra, ni micro, ni localisation
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: entetesSecurite }];
  },
};

export default nextConfig;
