import DataStore from "./data-store";
import { Queries } from ".././api";

import { ContentChannel } from "../ContentChannel.model";
import { computed, toJS, observable, action } from "mobx";
import { handleException } from "../../utils/errors";
import { AsyncStorage } from "react-native";

export default class ChannelStore extends DataStore {
    @observable serverTime;

    constructor() {
        super(ContentChannel);
    }

    init() {
        AsyncStorage.getItem("activeChannels").then((data) => {
            if (data) {
                this.addChannels(JSON.parse(data));
            }
            this.fetch();
        });
    }

    fetch() {
        global.scener.client
            .query({
                query: Queries.getActiveChannels,
                fetchPolicy: "network-only"
            })
            .then(async ({ data }) => {
                if (data && data.ActiveChannels.length) {
                    console.log("loaded channels", data.ActiveChannels.length);
                    await AsyncStorage.setItem(
                        "activeChannels",
                        JSON.stringify(toJS(data.ActiveChannels.slice()))
                    ).catch((e) => {
                        console.warn("could not set active channels in cache");
                        handleException(e);
                    });
                    this.addChannels(data.ActiveChannels);
                    this.setInitialized(true);
                    /*  setInterval(() => {
            this.checkServerTime();
          }, 10000);*/
                }
            });
    }

    addChannels(channels) {
        channels.forEach((ch) => {
            let scenerChannel = new ContentChannel({ ...ch });
            this.add(scenerChannel);
        });
    }

    @computed get channels() {
        return this.values;
    }

    @action setServerTime(scenerTime) {
        this.serverTime = scenerTime;
        this.values.forEach((c) => {
            c.setServerTime(scenerTime);
        });
    }

    checkServerTime() {
        fetch("/time")
            .then((resp) => resp.json())
            .then(({ scenerTime }) => {
                this.setServerTime(scenerTime);
            })
            .catch((e) => {
                console.log(e);
            });
    }
}
