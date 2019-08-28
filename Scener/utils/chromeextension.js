//The following comments are ESLint rules
/*global chrome*/

import Cookies from "js-cookie";

export class ExtensionMessage {
    constructor(msgType) {
        this.type = msgType;
    }

    serialize() {
        return JSON.stringify(this);
    }

    sendToBackgroundScript(
        callback //send from content script to background script
    ) {
        ChromeExtension.sendMessageToBackgroundScript(this, (res) => {
            if (callback) {
                callback(res);
            }
        });
    }

    sendToPage() {
        //send from content script to page.
        ChromeExtension.sendMessageToPage(this);
    }

    sendToContentScript() {
        //send from page to content script
        ChromeExtension.sendMessageToContentScript(this);
    }
}

export class ChromeExtension {
    static extensionId() {
        //return "nnebgpmbbhnelinnegfagladnogbfjaa";//beta mar 19
          if (scener) {
        return global.scener.env.config.extId;
        } else {
            return chrome.runtime.id;
        } //beta nov 18
        //return
    }

    // ============== messaging ============================

    //send message from content script to background script
    static sendMessageToBackgroundScript(message, callback) {
        if (scener) {
            chrome.runtime.sendMessage(global.scener.env.config.extId, message, callback);
        } else {
            chrome.runtime.sendMessage(ChromeExtension.extensionId(), message, callback);

        }
    }

    static urlForService(serviceName) {
        switch (serviceName) {
            case "netflix": {
                return "www.netflix.com";
            }
            default: {
                return "";
            }
        }
    }

    //send message from content script to page
    static sendMessageToPage(message) {
        let ev = new CustomEvent("scenerMessageToPageFromContentScript", {
            detail: message
        });
        document.dispatchEvent(ev);
    }

    //send message to content script from page or background script
    static sendMessageToContentScript(message) {
        if (chrome && chrome.tabs) {
            //sending from background script to content script
            let man = chrome.runtime.getManifest();
            let urlPatterns = man.background.matches;

            chrome.tabs.query({ active: true, currentWindow: true, url: urlPatterns }, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, message);
                }
            });
        } //sending from page to content script
        else {
            let ev = new CustomEvent("scenerMessageToContentScriptFromPage", {
                detail: message
            });
            document.dispatchEvent(ev);
        }
    }

    static receiveMessagesFromContentScript(
        handler //function handler(msg){}
    ) {
        document.addEventListener("scenerMessageToPageFromContentScript", (e) => {
            handler(e.detail);
        });
    }

    static receiveMessagesFromPage(
        handler //function handler(msg){}
    ) {
        document.addEventListener("scenerMessageToContentScriptFromPage", (e) => {
            handler(e.detail);
        });
    }

    static receiveMessagesFromBackground(handler) {
        chrome.runtime.onMessage.addListener(handler);
    }

    // =================== Environment ========================
    static setEnvironment(env) {
        let msg = new ExtensionMessage("setEnvironment");
        msg.env = env;
        msg.sendToBackgroundScript();
    }

    static clearEnvironment() {
        let msg = new ExtensionMessage("clearEnvironment");
        msg.sendToBackgroundScript();
    }

    static getEnvironment(callback) {
        ChromeExtension.sendMessageToBackgroundScript("getEnvironment", (res) => {
            callback(res);
        });
    }

    static getEnvironmentAsync() {
        return new Promise(function(resolve) {
            ChromeExtension.sendMessageToBackgroundScript("getEnvironment", (res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    // =========================== Options ============================
    static getOptionsAsync() {
        return new Promise(function(resolve) {
            let msg = new ExtensionMessage("getOptions");
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }
    static setOptionsAsync(options) {
        return new Promise(function(resolve) {
            let msg = new ExtensionMessage("setOptions");
            msg.options = options;
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    // ================== Cookies ==============================
    static removeCookie(name) {
        Cookies.remove(name, { domain: ".global.scener.com" });
    }

    static setCookie(name, value, days) {
        return new Promise(function(resolve) {

            Cookies.set(name, value, { domain: ".global.scener.com", expires: days });
            resolve(true);
            /* let msg = new ExtensionMessage("setCookie");
             msg.name = name;
             msg.value = value;
             msg.expirationDate = expirationDate;

             msg.sendToBackgroundScript(res =>
             {
                 if (res)
                 {
                     resolve(res);
                 }
                 else
                 {
                     resolve(false);
                 }
             });*/
        });
    }

    static getCookie(
        name //gets api server cookies  (api.global.scener.com)
    ) {
        return new Promise(function(resolve) {
            resolve(Cookies.get(name));
        });
    }

    static getBackgroundCookie(name) {
        let msg = new ExtensionMessage("getCookie");
        msg.name = name; //"token";
        return new Promise(function(resolve) {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res); //v.value has the cookie value
                } else {
                    resolve(false);
                }
            });
        });
    }

    static getConversationMessages(id) {
        let msg = new ExtensionMessage("getConversationMessages");
        msg.conversationId = id;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static getUnreadMessageCount(id) {
        let msg = new ExtensionMessage("getUnreadMessageCount");
        msg.conversationId = id;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static advanceLastConsumedMessageIndex(index, id) {
        let msg = new ExtensionMessage("advanceLastConsumedMessageIndex");
        msg.conversationId = id;
        msg.index = index;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static sendChatMessage(msgBody, id) {
        let msg = new ExtensionMessage("sendChatMessage");
        msg.body = msgBody;
        msg.conversationId = id;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static getTwilioClientState() {
        let msg = new ExtensionMessage("getTwilioClientState");

        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static requestPermissions(type) {
        let msg = new ExtensionMessage("requestPermissions");
        msg.permission = type;

        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    // =========================== Storage ===========================
    static setLocalStorageValue(key, value) {
        let msg = new ExtensionMessage("setLocalStorageValue");
        msg.key = key;
        msg.value = value;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static removeLocalStorageValue(key) {
        let msg = new ExtensionMessage("removeLocalStorageValue");
        msg.key = key;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static getLocalStorageValue(key) {
        let msg = new ExtensionMessage("getLocalStorageValue");
        msg.key = key;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    static getAllLocalStorageKeys() {
        let msg = new ExtensionMessage("getAllLocalStorageKeys");

        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }

    // ========================== Navigation ===================================
    static navigateTab(urlPattern, url, takeFocus) {
        let msg = new ExtensionMessage("navigateTab");
        msg.urlPattern = urlPattern;
        msg.url = url;
        msg.takeFocus = takeFocus;
        msg.sendToBackgroundScript();
    }

    static navigateNewTab(url) {
        let msg = new ExtensionMessage("navigateNewTab");
        msg.url = url;
        msg.sendToBackgroundScript();
    }

    static navigateCurrentTab(url) {
        let msg = new ExtensionMessage("navigateCurrentTab");
        msg.url = url;
        msg.sendToBackgroundScript();
    }

    // ================= Other Stuff  (Not Used?) ================================
    static resolveFilePath(path) {
        let msg = new ExtensionMessage("resolveFilePath");
        msg.path = path;
        return new Promise((resolve) => {
            msg.sendToBackgroundScript((res) => {
                if (res) {
                    resolve(res);
                } else {
                    resolve(false);
                }
            });
        });
    }
}
