/*eslint no-debugger: "warn"*/
/*global */
import { observable, reaction, toJS } from "mobx";
// MODELS
import { ScenerContent } from "./content.model";
import { ScenerUser } from "./user.model";
import { ScenerAppSyncClient } from "./api/scenerappsync";

import DataStore from "./data-store/data-store";
import UserStore from "./data-store/user-store";
import { ScenerTwilioClient } from "./api/scenertwilio";

import ChannelStore from "./data-store/ChannelStore";
import { AsyncStorage } from "react-native";
export class ScenerApp {
    @observable user = new ScenerUser(); //instance of ScenerUser

    constructor() {
        //Models
        console.log(WebSocket);
        this.api = null; //an instance of ScenerAPI

        //  this.service.currentUrl = "https://" + this.browserHistory.location.pathname;
        this.client = null;
        this.userStore = new UserStore();
        this.contentStore = new DataStore(ScenerContent);
        this.channelStore = new ChannelStore();
        //  this.theme = ScenerTheme();
        //this.checkForDeepLink();
    }

    async init() {
        this.client = await ScenerAppSyncClient.create("dev");

        let token = await AsyncStorage.getItem("token");
        console.log(token);
        this.user.setToken("172e17df53LnCqHk9e");

        this.twilio = new ScenerTwilioClient();

        this.channelStore.init();

        reaction(
            () => this.user.loggedIn,
            (loggedIn) => {
                this.onLoginStatusChanged(loggedIn);
            }
        );

        setTimeout(() => {
            this.fetchUser();
        }, 200);
    }

    async fetchUser() {
        if (!this.client) {
            setTimeout(this.fetchUser.bind(this), 500);
            return;
        }
        if (this.user.token) {
            try {
                await this.user.auth();
            } catch (error) {
                console.warn(error);
                this.authAttempts++;
                if (this.authAttempts < 2) {
                    this.fetchUser();

                    return;
                } else {
                    this.user.setBusy(false);
                    this.user.setToken(null);
                    this.user.destroy();
                }
            }
        } else {
            this.user.setToken(null);
            this.user.setBusy(false);

            this.user.destroy();
            AsyncStorage.removeItem("token");
            this.userStore.clear();
            //  this.user.setContent(null, null, false);
            this.channelStore.clear();
        }
    }

    onLoginStatusChanged() {
        if (this.user.loggedIn) {
            console.log("user logged in", this.user.id);

            AsyncStorage.setItem("token", this.user.token);

            this.twilio.init().then(() => {
                console.log("is twilio ready", !!this.twilio);
                console.log("inited");
                /*    this.handleInvitation().then((result) => {
                    if (!result) {
                        scener.cache.getItem("location.pathname").then((path) => {
                            if (path && path.indexOf("channel") != -1) {
                                reaction(
                                    () => this.channelStore.initialized,
                                    (inited, ref) => {
                                        if (inited) {
                                            this.channelStore
                                                .get({ id: path.split("/")[2] })
                                                .then((channel) => {
                                                    console.log("found channel", channel);
                                                });
                                            ref.dispose();
                                        }
                                    },
                                    { fireImmediately: true }
                                );
                            }
                        });
                    }
                });*/
                this.user.startOnlineStatusBeacon();
            });
        } else {
            
            AsyncStorage.removeItem("token");

            this.user.destroy();
            this.userStore.clear();

            this.twilio.terminate();
            this.client.clearStore();
            this.channelStore.clear();
        }
    }

    async handleInvitation() {
        let cookie = await AsyncStorage.getItem("invitation");
        if (cookie) {
            await AsyncStorage.removeItem("invitation");
            //let data = JSON.parse(cookie);
            let invitationId = cookie;
            let conversationId = null;
            let invitation = null;
            if (invitationId) {
                invitation = await scener.user.acceptInvitation(invitationId);
                conversationId = invitation.conversationId;
            }
           // console.log(invitation);

            if (conversationId) {
                // join the conversation
                let conversation = await scener.user.conversationStore.get({
                    id: conversationId
                });
                if (conversation) {
                    return true;
                }
            } else {
                if (invitation && invitation.senderId) {
                    return true;
                }
            }
        }
    }

    signout() {
        this.user.setToken(null); //causes loggedIn computed state to change.
    }
}
