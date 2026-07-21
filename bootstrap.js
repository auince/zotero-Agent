/* global Cc, Ci, Services, Zotero */

var chromeHandle;
var ResearchAgent;
var ResearchAgentRootURI;

async function startup({ resourceURI, rootURI }) {
  // Zotero 9 can invoke bootstrap code while its UI APIs are still initializing.
  // Registering an item-pane section before this promise settles makes the add-on
  // appear installed but leaves no visible section in the main window.
  await Zotero.initializationPromise;
  rootURI ||= resourceURI?.spec;
  try {
    ResearchAgentRootURI = rootURI;
    const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"]
      .getService(Ci.amIAddonManagerStartup);
    chromeHandle = aomStartup.registerChrome(Services.io.newURI(rootURI + "manifest.json"), [
      ["content", "research-agent", rootURI + "chrome/content/"]
    ]);
    Services.scriptloader.loadSubScript(rootURI + "src/main.js");
    await ResearchAgent.startup({ rootURI });
  } catch (error) {
    Zotero.logError(error);
    throw error;
  }
}

function shutdown() {
  ResearchAgent?.shutdown();
  chromeHandle?.destruct();
  chromeHandle = null;
}

function install() {}
function uninstall() {}

function onMainWindowLoad({ window }) {
  ResearchAgent?.onMainWindowLoad(window);
}

function onMainWindowUnload({ window }) {
  ResearchAgent?.onMainWindowUnload(window);
}
