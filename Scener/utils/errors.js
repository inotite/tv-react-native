//import * as localForage from "localforage";
//import StackTrace from "stacktrace-js";
/* global SCENER_VERSION*/
export const handleException = (e) => {
    console.warn(JSON.stringify(e),"ERROR TIME BABY");
    //Sentry.captureException(e);
    throw e;
};
/*
class ErrorTracking {
    constructor() {
        //catch all uncaught exceptions

        this.storage = localForage.createInstance({
            name: "errors"
        });
        this.history = {};
        this.storage.getItem("logged").then((loggedErrors) => {
            if (loggedErrors) {
                this.history = loggedErrors;
            }

            this.codeEnv = "Production";
            switch (window.location.hostname) {
                case "watch.dev.global.scener.com": {
                    this.codeEnv = "Local";
                    break;
                }
                case "watch-dev.global.scener.com": {
                    this.codeEnv = "Development";
                    break;
                }
                case "watch-test.global.scener.com": {
                    this.codeEnv = "Testing";
                    break;
                }
                case "watch.global.scener.com":
                default:
                    this.codeEnv = "Production";
                    break;
            }
            console.log(this.codeEnv);
            if (this.codeEnv == "Testing" || this.codeEnv == "Production") {
                Sentry.init({
                    dsn: "https://63a5b8cedf1a4d7a92dc2443e153473f@sentry.io/1489178",
                    environment: this.codeEnv,
                    release: "scener@" + SCENER_VERSION,
                    beforeSend: this.beforeSend
                });
            }
        });
    }

    beforeSend = (event, hint) => {
        //once per 10m
        // console.log(event, hint);
        if (!this.history[hint.originalException.message] || Date.now() - this.history[hint.originalException.message] > 10 * 60 * 1000) {
            StackTrace.fromError(hint.originalException)
                .then((stackframes) => {
                    return stackframes
                        .map(function(sf) {
                            return sf.toString();
                        })
                        .join("\n");
                })
                .then((stringStack) => {
                    if (scener) {
                        event.extra = { ...event.extra, ...global.scener.getCurrentState(), stack: stringStack };
                    }

                    this.history[hint.originalException.message] = Date.now();
                    this.writeToStorage();
                    return event;
                })
                .catch(() => {
                    if (scener) {
                        event.extra = { ...event.extra, ...global.scener.getCurrentState() };
                    }

                    this.history[hint.originalException.message] = Date.now();
                    this.writeToStorage();
                    return event;
                });
        } else {
            return null;
        }
    };

    writeToStorage() {
        this.storage.setItem("logged", this.history).catch(handleException);
    }
}

export default ErrorTracking;
*/