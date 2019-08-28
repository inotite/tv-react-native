export class ScenerTracking {
    constructor() {}

    static init(env) {
     let token = ScenerTracking.mixpanelToken(env);
        mixpanel.init(token, { api_host: "https://panelmix.global.scener.com" });
    }

    static mixpanelToken(apiEnv) {
        //figure out the mixpanel token to use based on the environment
        let preprodToken = "40023a92129a37e38b1ce0c2db857501";
        let betaToken = "39bd9a11abd662deef6a7c179aaab2c2";
        let prodToken = "39bd9a11abd662deef6a7c179aaab2c2";
        switch (apiEnv) {
            case "beta":
                return betaToken;
            case "prod":
                return prodToken;
            case "dev":
            default:
                return preprodToken;
        }
    }
}
