//The following comments are ESLint rules
/*global scener chrome */
import moment from "moment";

export class ScenerUtils {
    static FOREVER = 1000 * 365 * 24 * 60 * 60;

    static MINUTE = 60;
    static MINUTES_FROM_NOW(mins = 1) {
        return Date.now() / 1000 + mins * ScenerUtils.MINUTE;
    }

    static HOUR = 60 * 60;
    static HOURS_FROM_NOW(hrs = 1) {
        return Date.now() / 1000 + hrs * ScenerUtils.HOUR;
    }

    static DAY = 365 * 24 * 60 * 60;
    static DAYS_FROM_NOW(days = 1) {
        return Date.now() / 1000 + days * ScenerUtils.DAY;
    }

    static YEAR = 365 * 24 * 60 * 60;
    static YEARS_FROM_NOW(years = 1) {
        return Date.now() / 1000 + years * ScenerUtils.YEAR;
    }

    static preloadImage(url) {
        console.log("preload image", url);
        return new Promise((resolve, reject) => {
            let imgLoader = document.createElement("img");
            imgLoader.onload = () => {
                resolve(imgLoader.src);
            };
            imgLoader.onerror = (e) => {
                reject({ error: e, url });
            };
            imgLoader.src = url;
        });
    }

    static simulateMouseEvent(target, type, x, y) {
        let event = new MouseEvent(type, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            isTrusted: true
            // you can pass any other needed properties here
        });
        target.dispatchEvent(event);
    }

    static injectDiv(id, parent = document.body) {
        let div = document.createElement("div");
        div.id = id;

        let injected = parent.insertBefore(div, parent.firstChild);
        return global.scener.$(injected);
    }

    static injectHTML(html, id, parent) {
        let div = ScenerUtils.injectDiv(id, parent);
        div.html(html);
        return div;
    }

    static injectHTMLUrl(url, id, parent) {
        let div = ScenerUtils.injectDiv(id, parent);

        let xhttp = new XMLHttpRequest();
        xhttp.div = div;
        xhttp.onload = function() {
            this.div.html(this.responseText);
        };

        xhttp.onreadystatechange = function() {
            switch (this.readyState) {
                case 0:
                    break;
                case 1:
                    break;
                case 2:
                    break;
                case 3:
                    break;
                case 4:
                    break;
            }
        };

        xhttp.open("GET", url, true);
        xhttp.send();

        return div;
    }

    static injectHTMLUrlAsync(url, id, parent) {
        return new Promise((resolve) => {
            let div = ScenerUtils.injectDiv(id, parent);

            let xhttp = new XMLHttpRequest();
            xhttp.div = div;
            xhttp.onload = function() {
                this.div.html(this.responseText);
                resolve(this.div);
            };

            xhttp.onreadystatechange = function() {
                switch (this.readyState) {
                    case 0:
                        break;
                    case 1:
                        break;
                    case 2:
                        break;
                    case 3:
                        break;
                    case 4:
                        break;
                }
            };

            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }

    static injectCSSUrl(url) {
        let s = document.createElement("link");
        s.href = url;
        s.rel = "stylesheet";
        s.type = "text/css";

        (document.head || document.documentElement).append(s);
    }
    static injectCSS(cssfilename) {
        let url = chrome.extension.getURL(cssfilename);
        ScenerUtils.injectCSSUrl(url);
    }

    //script is injected/run, and remains in place
    static injectScript(jsfilename) {
        let s = document.createElement("script");
        // TODO: add jfsfilename to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL(jsfilename);
        (document.head || document.documentElement).append(s);
    }

    static assert(condition, message) {
        if (!condition) {
            let msg = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(msg);
            }
            throw msg; // Fallback
        }
    }

    static addGlobalStyle(css, title) {
        try {
            let elmHead = null;
            let elmStyle = null;
            elmHead = document.getElementsByTagName("head")[0];
            elmStyle = document.createElement("style");
            elmStyle.title = title;
            elmStyle.type = "text/css";
            elmHead.append(elmStyle);
            elmStyle.innerHTML = css;
        } catch (e) {
            if (!document.styleSheets.length) {
                document.createStyleSheet();
            }
            document.styleSheets[0].cssText += css;
        }
    }

    static removeGlobalStyle(title) {
        let styles = document.querySelectorAll("style");
        for (let n = 0; n < styles.length; n++) {
            let s = styles[n];
            if (s.title == title) {
                s.parentNode.removeChild(s);
            }
        }
    }

    static normalizeUrl(url, includeQuery = false, includeHash = false) {
        if (url.indexOf("?") != -1 && !includeQuery) {
            return url.substring(0, url.indexOf("?"));
        }
        if (url.indexOf("#") != -1 && !includeHash) {
            return url.substring(0, url.indexOf("#"));
        }
        return url;
    }

    static extractUrlParams(url) {
        let query = "";
        if (typeof url == "string") {
            if (url.indexOf("#") != -1) {
                query = url.substring(url.indexOf("#") + 1, url.length);
            } else {
                return {};
            }
        } else if (url.search) {
            query = url.hash.substring(1, url.search.length);
        } else {
            return {};
        }
        let paramArr = query.split("&");
        let params = {};
        for (let p of paramArr) {
            let param = p.split("=");
            params[param[0]] = param[1] ? decodeURIComponent(param[1]) : true;
        }

        return params;
    }

    static setUrlParams(newParams) {
        let paramStr = "";
        for (let k in newParams) {
            paramStr += `&${k}=${newParams[k]}`;
        }
        if (window.location.hash.substring(1) == paramStr.substring(1)) {
            return;
        }
        window.location.hash = "#" + paramStr.substring(1);
    }

    static parseUrl(url) {
        let service = url.replace(/^https?:\/\/(?:www\.)?(.+?)\.[a-z]{0,3}\/?.*$/i, "$1");

        let path = url.replace(/https?:\/\/.+?(\/.*)$/i, "$1");
        let pathname = path || "/";

        let search = "";
        let hash = "";
        let hashIndex = pathname.indexOf("#");

        if (hashIndex !== -1) {
            hash = pathname.substr(hashIndex);
            pathname = pathname.substr(0, hashIndex);
        }

        let searchIndex = pathname.indexOf("?");

        if (searchIndex !== -1) {
            search = pathname.substr(searchIndex);
            pathname = pathname.substr(0, searchIndex);
        }

        return { service, pathname, search, hash };
    }

    static parsePath(pathname) {
        if (!pathname) {
            return {
                path: null,
                service: null
            };
        }
        let paths = pathname.split("/");
        if (paths[0] == "") {
            paths.shift();
        }
        let service = paths.shift();
        let newPathname = paths.join("/");
        return { service, path: newPathname };
    }

    static sanitizeUrlHash() {
        ScenerUtils.setUrlParams(ScenerUtils.extractUrlParams(window.location.hash));
    }

    static precision(num, digits = 3) {
        if (typeof num == "string") {
            num = parseFloat(num);
        }
        return Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);
    }

    static clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    static millisecondsToTimeString(milliseconds, digits = 3) {
        if (isNaN(parseFloat(milliseconds))) {
            return false;
        }
        return ScenerUtils.secondsToTimeString(milliseconds / 1000.0, digits);
    }

    static secondsToTimeString(seconds, digits = 3) {
        if (isNaN(parseFloat(seconds))) {
            return false;
        }
        let hrs = Math.floor(seconds / 3600);
        seconds = seconds % 3600;
        let mins = Math.floor(seconds / 60);
        seconds = ScenerUtils.precision(seconds % 60, digits);
        if (seconds >= 60) {
            mins++;
            seconds -= 60;
        }

        seconds = seconds < 10 ? "0" + seconds : seconds;

        if (digits > 0) {
            let numComps = seconds.toString().split(".");
            if (numComps.length == 1) {
                numComps[1] = "";
            }
            while (numComps[1].length < digits) {
                numComps[1] += "0";
            }
            seconds = numComps.join(".");
        }

        return `${hrs > 0 ? hrs + ":" : ""}${mins < 10 ? "0" + mins : mins}:${seconds}`;
        //return `${mins < 10 ? '0'+mins : mins}:${seconds}`;
    }

    static isHostedFrame() {
        if (window == window.top) {
            return false;
        }
        return true;
    }

    static webEnvFromApiEnv(apiEnv) {
        //figure out the web environment to use based on the api env.
        let webenv = "https://global.scener.com";
        switch (apiEnv) {
            case "local":
                webenv = "http://local.global.scener.com:4200";
                break;
            case "dev":
                webenv = "https://dev.global.scener.com";
                break;
            case "beta":
                webenv = "https://beta.global.scener.com";
                break;
            case "int":
                webenv = "https://int.global.scener.com";
                break;
            default:
                break;
        }
        return webenv;
    }

    static overrideDefaultObject(defaultObj, overrideObj) {
        //combines two objects, prioritizing overrideObj's value if possible
        for (let k in defaultObj) {
            defaultObj[k] = overrideObj.hasOwnProperty(k) ? overrideObj[k] : defaultObj[k];
        }
        return defaultObj;
    }

    static customizeMomentLocale(moment) {
        moment.updateLocale("en", {
            relativeTime: {
                future: "in %s",
                past: "%s ago",
                s: "a moment",
                ss: "%ds",
                m: "1m",
                mm: "%dm",
                h: "1h",
                hh: "%dh",
                d: "1d",
                dd: "%dd",
                M: "amo",
                MM: "%dmo",
                y: "%dy",
                yy: "%dy"
            }
        });
    }

    static fallbackCopyTextToClipboard(text) {
        let textArea = document.createElement("textarea");
        textArea.style.opacity = 0;
        textArea.style.position = "absolute";
        textArea.style.zIndex = -1;
        textArea.value = text;
        document.body.append(textArea);
        textArea.focus();
        textArea.select();

        try {
            let successful = document.execCommand("copy");
            let msg = successful ? "successful" : "unsuccessful";
            console.log("Fallback: Copying text command was " + msg);
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err);
        }

        document.body.removeChild(textArea);
    }

    static copyTextToClipboard(text) {
        if (!navigator.clipboard) {
            ScenerUtils.fallbackCopyTextToClipboard(text);
            return;
        }
        return navigator.clipboard.writeText(text).then(
            function() {
                return true;
            },
            function(err) {
                console.error("Async: Could not copy text: ", err);
                return false;
            }
        );
    }

    static scanForElementWithDelay(selector, delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(document.querySelector(selector));
            }, delay);
        });
    }

    static waitForElementToExist(selector, freq = 1000, retries = 30) {
        if (retries > 0) {
            return ScenerUtils.scanForElementWithDelay(selector, freq).then((el) => {
                if (el) {
                    return el;
                } else {
                    return ScenerUtils.waitForElementToExist(selector, freq, retries - 1);
                }
            });
        } else {
            return Promise.resolve(null);
        }
    }
}
