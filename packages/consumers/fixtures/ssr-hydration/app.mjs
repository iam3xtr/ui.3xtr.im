// Shared app definition for both the "server" and "client" halves of
// run.mjs. Uses only the core (`.`) entry point — no `./navigation` import —
// so this exercises the part of the contract every universal-rendering
// framework (Nuxt included) cares about: zero window/document access before
// mount.
import { defineComponent, h } from "vue";
import { AsyncState, Loader } from "@iam3xtr/vue";

export const App = defineComponent({
  name: "SsrFixtureApp",
  setup() {
    return () =>
      h("div", { id: "root" }, [h(Loader, { size: "inline", label: "Loading" }), h(AsyncState, { variant: "empty", title: "Nothing here" })]);
  },
});
