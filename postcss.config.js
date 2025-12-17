export default {
  plugins: {
    // Plugins removidos para corrigir erro de build "Cannot find module 'tailwindcss'".
    // O estilo está sendo carregado via CDN no index.html.
  },
};