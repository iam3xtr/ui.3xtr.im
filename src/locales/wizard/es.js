// Diccionario en español de la zona experta del asistente de agentes (Task
// A9.5). Debe tener exactamente las mismas rutas de claves que `ru.js`/
// `en.js` — ver la prueba de completitud en
// `tests/unit/locales/wizard.test.js` y la nota de alcance en `ru.js`.
export default {
  expertToggle: {
    show: "Parámetros avanzados",
    hide: "Ocultar parámetros avanzados",
  },
  expertPanel: {
    title: "Parámetros avanzados",
    subtitle: "Modelo, temperatura, instrucción del sistema y clave propia — "
      + "dentro de lo disponible en tu plan. El modo experto no otorga "
      + "permisos adicionales.",
    localeLabel: "Idioma de esta sección",
  },
  modelClass: {
    title: "Clase de modelo",
    hint: "Equilibra la calidad de la respuesta con el costo relativo — no "
      + "es una garantía de precisión.",
    recommendedBadge: "Recomendado",
    singleAvailableNote: "En tu plan solo está disponible esta clase de modelo.",
    basic: {
      label: "Básica",
      purpose: "Respuestas rápidas a preguntas frecuentes y claras.",
      price: "Menor",
      availability: "Disponible",
    },
    advanced: {
      label: "Avanzada",
      purpose: "Respuestas más precisas para preguntas compuestas.",
      price: "Media",
      availability: "Disponible",
    },
    power: {
      label: "Potente",
      purpose: "Para conversaciones complejas y de alta responsabilidad.",
      price: "Mayor",
      availability: "Disponible",
    },
  },
  catalog: {
    title: "Modelo exacto (catálogo)",
    unavailable: "Elegir un modelo exacto no está disponible en tu plan — se "
      + "usa la clase recomendada.",
  },
  temperature: {
    label: "Temperatura",
    help: "Más baja es más predecible, más alta es más variada.",
  },
  instruction: {
    title: "Instrucción del sistema",
    templateNote: "Se genera automáticamente a partir de los campos de este paso.",
    useCustomToggle: "Escribirla yo mismo",
    useTemplateToggle: "Volver a la plantilla",
    customPlaceholder: "Tu propio texto de instrucción del sistema.",
    revertTitle: "¿Volver a la plantilla?",
    revertMessage: "Tu texto personalizado será reemplazado por la plantilla "
      + "generada a partir de los campos de este paso — esta acción no se "
      + "puede deshacer.",
    revertConfirm: "Volver a la plantilla",
    revertCancel: "Cancelar",
  },
  byok: {
    title: "Clave propia (BYOK)",
    toggleLabel: "Usar mi propia clave de API",
    unavailable: "Tu propia clave no está disponible en tu plan.",
    modelLabel: "Modelo (OpenRouter, clave propia)",
    keyLabel: "Clave de API",
  },
  capability: {
    downgradeWarning: "La selección actual no está disponible en este plan. "
      + "Se conserva en el borrador — elige una opción disponible antes de "
      + "lanzar.",
  },
};
