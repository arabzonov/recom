export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Add support for line-clamp property
      add: true,
      remove: false,
    },
  },
};
