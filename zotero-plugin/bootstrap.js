/* Plugin do Zotero "Marginália": acrescenta "Abrir Marginália" ao menu
 * Ferramentas e ao menu do botão direito dos itens. Ao clicar, abre o site da
 * Marginália no navegador. O plugin não lê nem muda nada na biblioteca. */

var ENDERECO = 'https://ghsantosalves.github.io/mesa-de-fichas/';
var ID_PLUGIN = 'mesa-de-fichas@ghsantosalves.github.io';
var ID_ITEM_DOM = 'mesa-de-fichas-abrir';
var menusRegistrados = [];

function abrirMesa() {
  try {
    Zotero.launchURL(ENDERECO);
  } catch (e) {
    // Plano B: pede ao sistema para abrir o endereço no navegador padrão.
    Components.classes['@mozilla.org/uriloader/external-protocol-service;1']
      .getService(Components.interfaces.nsIExternalProtocolService)
      .loadURI(Services.io.newURI(ENDERECO));
  }
}

function install() {}

function startup() {
  // Zotero 8 ou mais novo: API oficial de menus.
  if (Zotero.MenuManager) {
    for (var alvo of ['main/menubar/tools', 'main/library/item']) {
      var id = Zotero.MenuManager.registerMenu({
        menuID: 'mesa-de-fichas-' + alvo.replace(/\W+/g, '-'),
        pluginID: ID_PLUGIN,
        target: alvo,
        menus: [{ menuType: 'menuitem', l10nID: 'mesa-de-fichas-abrir', onCommand: abrirMesa }],
      });
      if (id) menusRegistrados.push(id);
    }
  }
  for (var w of Zotero.getMainWindows()) onMainWindowLoad({ window: w });
}

function onMainWindowLoad({ window }) {
  // Textos do menu (arquivo locale/<idioma>/mesa-de-fichas.ftl).
  window.MozXULElement.insertFTLIfNeeded('mesa-de-fichas.ftl');
  // Zotero 7 (sem a API de menus): põe o item no menu Ferramentas diretamente.
  if (Zotero.MenuManager) return;
  var doc = window.document;
  if (doc.getElementById(ID_ITEM_DOM)) return;
  var ferramentas = doc.getElementById('menu_ToolsPopup');
  if (!ferramentas) return;
  var item = doc.createXULElement('menuitem');
  item.id = ID_ITEM_DOM;
  item.setAttribute('data-l10n-id', 'mesa-de-fichas-abrir');
  item.addEventListener('command', abrirMesa);
  ferramentas.appendChild(item);
}

function onMainWindowUnload({ window }) {
  window.document.getElementById(ID_ITEM_DOM)?.remove();
}

function shutdown() {
  for (var id of menusRegistrados) Zotero.MenuManager.unregisterMenu(id);
  menusRegistrados = [];
  for (var w of Zotero.getMainWindows()) onMainWindowUnload({ window: w });
}

function uninstall() {}
