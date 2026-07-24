/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // O link "PDF" que será compartilhado. Acessar /relatorio_jul26.pdf
      // renderiza a página de carregamento infinito em /view.
      { source: "/relatorio_jul26.pdf", destination: "/view" },
    ];
  },
};

module.exports = nextConfig;
