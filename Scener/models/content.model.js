import { observable, action, computed, reaction, toJS } from "mobx";
import { getContent } from "./api/Queries";
import { createContent } from "./api/Mutations";
import { Subscriptions, Queries } from "./api";
import { handleException } from "../utils/errors";
import { AsyncStorage } from "react-native";

export class ScenerContent {
    static ERROR = {
        NOT_SIGNED_IN: "NOT_SIGNED_IN",
        NO_DATA: "NO_DATA"
    };
    @observable id;
    @observable title;
    @observable year;
    @observable season;
    @observable episode;
    @observable episodeTitle;
    @observable tv;
    @observable movie;
    @observable image16x9;
    @observable image2x3;
    @observable services;
    @observable type;
    @observable synopsis;
    @observable episodeSynopsis;
    @observable seriesId;
    @observable watchersList = [];
    @observable metadata = {};
    constructor(props) {
        props ? this.setProps(props) : null;
    }

    @action setProps(props) {
        for (let k in props) {
            if (k == "metadata") {
                if (typeof props[k] == "string") {
                    this.metadata = JSON.parse(props[k]);
                } else {
                    this.metadata = props[k];
                }
            } else {
                this[k] = props[k];
            }
        }
        if (this.id) {
            //    this.subscribeToWatchers();
        }
    }

    @computed get serviceId() {
        if (!this.services) {
            return false;
        }
        for (let s of this.services) {
          //  if (s.service == global.scener.service.serviceName) {
                return s.id;
          //  }
        }
        return false;
    }

    static async create(data) {

        let response = await global.scener.client.mutate({
            mutation: createContent,
            variables: {
                content: data
            },
            fetchPolicy: "no-cache"
        });
        if (response.data.createContent) {
            return new ScenerContent(response.data.createContent);
        } else {
            throw new DOMException(ScenerContent.ERROR.NO_DATA);
        }
    }

    init() {
        return this.fetch();
    }

    async fetch() {

        let response = await global.scener.client.query({
            query: getContent,
            variables: {
                contentId: this.id
            }
        });
        if (response.data.Content) {
            this.setProps(response.data.Content);
            return this;
        } else {
            throw new DOMException(ScenerContent.ERROR.NO_DATA);
        }
    }

    async subscribeToWatchers() {

        if (this.id && !this.userActivitySubscription) {
            let resp = await global.scener.client.query({
                query: Queries.getUsersForContent,
                variables: {
                    contentId: this.id
                },
                fetchPolicy: "network-only"
            });
            if (resp.data.UsersForContent) {
                this.setWatchers(resp.data.UsersForContent);
            } else {
                throw new DOMException("NO_DATA");
            }

            this.userActivitySubscription = global.scener.client
                .subscribe({
                    query: Subscriptions.onUpdatedUserActivityForContent,
                    variables: {
                        contentId: this.id
                    }
                })
                .subscribe((response) => {

                    if (response.data && response.data.updatedUserActivity) {
                        this.updateWatchers(response.data.updatedUserActivity);
                    }
                });
        }
    }

    @action async setWatchers(list) {
        this.watchersList = await Promise.all(
            list
                .filter((u) => u.id !== global.scener.user.id)
                .map((u) => {
                    return global.scener.userStore.get({ id: u.id });
                })
        );
        for (let i in this.watchersList) {
            this.createWatcherReaction(this.watchersList[i]);
        }
    }

    @action async updateWatchers(activity) {
        if (activity.userId === global.scener.user.id) {
            return;
        }

        let exists = false;
        for (let w of this.watchersList) {
            if (w.id == activity.userId) {
                exists = true;
                return;
            }
        }
        if (!exists) {
            let user = await global.scener.userStore.get({ id: activity.userId, activity: activity });
            this.watchersList.push(user);
            this.createWatcherReaction(user);
        }
    }

    @action removeWatcher(id) {
        this.watchersList = this.watchersList.slice().filter((u) => {
            return u.id != id;
        });
    }

    createWatcherReaction(user) {
        reaction(
            () => user.activity.contentId,
            (id, reactionRef) => {
                if (id !== this.id) {
                    this.removeWatcher(user.id);
                    reactionRef.dispose();
                }
            }
        );
    }

    static truncatedTitle(title) {
        title = title.replace("&amp;", "&");
        if (title.length < 30) {
            return title;
        }
        return title.substring(0, 27) + "...";
    }

    @computed get displayName() {
        return `${this.tv ? ScenerContent.truncatedTitle(this.title) : this.title} ${this.tv ? "S" + this.season + "E" + this.episode : ""}`;
    }

    @computed get watchers() {
        return this.watchersList.slice();
    }

    @computed get subtitle() {
      return `${this.tv ? "S" + this.season + "E" + this.episode : this.year}`;
    }

    isUserWatching(userId) {
        for (let w of this.watchersList) {
            if (w.id == userId) {
                return true;
            }
        }
        return false;
    }

    writeToCache() {
        AsyncStorage.setItem("Content:" + this.id, this.toJSON()).catch(handleException);
    }

    toJSON() {
        const { id, title, year, season, episode, episodeTitle, tv, movie, image16x9, image2x3, services } = this;
        return toJS({
            id,
            title,
            year,
            season,
            episode,
            episodeTitle,
            tv,
            movie,
            image16x9,
            image2x3,
            services
        });
    }
}
