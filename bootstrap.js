/* global Cc, Ci, Services, Zotero */

var chromeHandle;
var ResearchAgent;
var ResearchAgentRootURI;

async function startup({ rootURI }) {
  ResearchAgentRootURI = rootURI;
  const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"]
    .getService(Ci.amIAddonManagerStartup);
  chromeHandle = aomStartup.registerChrome(Services.io.newURI(rootURI + "manifest.json"), [
    ["content", "research-agent", "chrome/content/"]
  ]);
  Services.scriptloader.loadSubScript(rootURI + "src/main.js");
  await ResearchAgent.startup({ rootURI });
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
