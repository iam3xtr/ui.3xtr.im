// Development-only counterpart to the generated @iam3xtr/ui/icons entrypoint.
// Vite expands this glob from the editable UI package sources; production
// builds never resolve this module and use the package's published dist file.
const rawIcons = import.meta.glob("../packages/ui/src/assets/icons/*.svg", {
  eager: true,
  import: "default",
  query: "?raw",
});

export const icons = Object.fromEntries(
  Object.entries(rawIcons).map(([file, markup]) => [
    file.slice(file.lastIndexOf("/") + 1, -".svg".length),
    markup.trim(),
  ]),
);

export default icons;
