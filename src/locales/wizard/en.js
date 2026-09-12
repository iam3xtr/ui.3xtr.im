// English dictionary for the agent wizard's expert zone (Task A9.5). Must
// carry exactly the same key paths as `ru.js`/`es.js` — see the completeness
// test in `tests/unit/locales/wizard.test.js` and the scope note in `ru.js`.
export default {
  expertToggle: {
    show: "Advanced parameters",
    hide: "Hide advanced parameters",
  },
  expertPanel: {
    title: "Advanced parameters",
    subtitle: "Model, temperature, system instruction and your own key — "
      + "within your plan's available capability. Expert mode does not grant "
      + "extra permissions.",
    localeLabel: "Language for this section",
  },
  modelClass: {
    title: "Model class",
    hint: "Balances answer quality against relative cost — not a guarantee "
      + "of accuracy.",
    recommendedBadge: "Recommended",
    singleAvailableNote: "Only this model class is available on your plan.",
    basic: {
      label: "Basic",
      purpose: "Fast answers to frequent, clear-cut questions.",
      price: "Lower",
      availability: "Available",
    },
    advanced: {
      label: "Advanced",
      purpose: "More accurate answers for multi-part questions.",
      price: "Medium",
      availability: "Available",
    },
    power: {
      label: "Power",
      purpose: "For complex, high-stakes conversations.",
      price: "Higher",
      availability: "Available",
    },
  },
  catalog: {
    title: "Exact model (catalog)",
    unavailable: "Picking an exact model is not available on your plan — "
      + "the recommended class is used instead.",
  },
  temperature: {
    label: "Temperature",
    help: "Lower is more predictable, higher is more varied.",
  },
  instruction: {
    title: "System instruction",
    templateNote: "Assembled automatically from the fields on this step.",
    useCustomToggle: "Write it myself",
    useTemplateToggle: "Revert to template",
    customPlaceholder: "Your own system instruction text.",
    revertTitle: "Revert to template?",
    revertMessage: "Your custom instruction text will be replaced by the "
      + "template assembled from this step's fields — this cannot be undone.",
    revertConfirm: "Revert to template",
    revertCancel: "Cancel",
  },
  byok: {
    title: "Your own key (BYOK)",
    toggleLabel: "Use my own API key",
    unavailable: "Your own key is not available on your plan.",
    modelLabel: "Model (OpenRouter, your own key)",
    keyLabel: "API key",
  },
  capability: {
    downgradeWarning: "The current selection is not available on this plan. "
      + "It stays in the draft — pick an available option before launch.",
  },
};
