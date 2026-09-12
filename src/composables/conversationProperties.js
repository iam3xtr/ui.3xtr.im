// Injection key for the top-level conversations page's properties-aside
// state. `Conversations.vue` owns the `.tr-conversations` 3-column
// list/chat/properties grid (see `trickster-buefy.scss`, "Список и деталь
// диалогов") and provides `{ propertiesOpen, openProperties, closeProperties }`
// so its nested, routed `conversations/ConversationDetail.vue` can open/close
// the settings pane as a third grid column via the gear button in its own
// header, without owning the grid itself — the same kind of provide/inject
// bridge `navbarMenu.js` uses between a page shell and a routed child it
// does not render directly in its own template. Mirrors
// get.3xtr.im's own `conversation-workbench` provide (`conversations/views/
// Conversations.vue`), minus the route-driven piece: the kit's settings pane
// is a local toggle, not a `/settings` route (see `ConversationDetail.vue`'s
// own top comment for why).
export const conversationPropertiesKey = Symbol("conversationProperties");
