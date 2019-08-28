import { action, computed, observable, reaction } from "mobx";
import { Conversation } from "./conversation.model";
import { ScenerUtils } from "../utils/utils";
import { ScenerContent } from "./content.model";
import { Queries } from "./api";
import { Member } from "./member.model";

export class ContentChannel extends Conversation {
    //===channel stuff
    @observable active;
    @observable playlist = [];
    @observable serverTime = Date.now() / 1000;
    @observable _inactiveMembers = [];
    constructor(props) {
        super(props);
       /* reaction(
            () => global.scener.service.currentUrl,
            (url_) => {
                if (this.isActiveConversation) {
                    this.fetchPlaylist();
                }
            }
        );*/
    }

    @action setProps(props) {
        props.managed = true;
        props.locked = false;
        super.setProps(props);
        if (props.active != this.active && typeof props.active !== "undefined") {
            this.active = props.active;
        }

        if (typeof props.playlist !== "undefined") {
            this.addPlaylistItems(props.playlist);
        }
    }

    @action addPlaylistItems(items) {
        if (typeof items !== "undefined") {
            Promise.all(
                items.map((pi) => {
                    return global.scener.contentStore.get(new ScenerContent(pi.content)).then((content) => {
                        pi.content = content;
                        return pi;
                    });
                })
            ).then((playL) => {
                this.playlist = playL.sort((a, b) => b.start - a.start);
            });
        }
    }

    @computed get upcomingPlaylist() {
        return this.playlist
            .slice()
            .filter((pi) => pi.start > this.serverTime)
            .reverse();
    }

    init() {
        //init through props
        return Promise.resolve(this);
    }

    @computed get conversationStatus() {
        if (this.current) {
            return this.current.content.displayName;
        } else if (this.upcoming.length) {
            return this.upcoming[0].content.displayName;
        } else {
            return "Loading...";
        }
    }

    fetchPlaylist() {
        global.scener.client
            .query({
                query: Queries.getPlaylist,
                variables: {
                    channelId: this.id
                },
                fetchPolicy: "no-cache"
            })
            .then(({ data }) => {
                if (data && data.Channel) {
                    this.addPlaylistItems(data.Channel.playlist);
                }
            });
    }

    fetchMembers() {
        global.scener.client
            .query({
                query: Queries.getMembersForChannel,
                variables: {
                    channelId: this.id
                },
                fetchPolicy: "no-cache"
            })
            .then(({ data }) => {
                if (data && data.MembersForChannel) {
                    this.addInactiveMembers(data.MembersForChannel);
                }
            });
    }

    @action addInactiveMembers(mems) {
        for (let i in mems) {
            let existing = this.members.filter((m) => m.userId == mems[i].userId);
            if (existing.length == 0) {
                let newMember = new Member();
                newMember.setProps(mems[i]);

                this._inactiveMembers.push(newMember);
            }
        }
    }

    @computed get inactiveMembers() {
        return this._inactiveMembers.filter((m) => this.members.filter((other) => other.userId == m.userId).length == 0);
    }

    update() {
        //noop
    }

    onBecameInactive() {
        super.onBecameInactive();
        this.leaveChannel();
        this.stopPlayback();
    }

    onBecameActive() {
        //super.onBecameActive();
        this.joinChannel();
        this.startPlayback();
    }

    startPlayback() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.timer = setInterval(() => {
            this.setServerTime(this.serverTime + 1);
        }, 1000);
    }

    stopPlayback() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    @computed get current() {
        if (this.past.length) {
            return this.past[0];
        } else {
            return null;
        }
    }

    @computed get upcoming() {
        return this.playlist
            .filter((p) => {
                return p.start > this.serverTime;
            })
            .slice()
            .sort((a, b) => a.start - b.start);
    }

    @computed get past() {
        return this.playlist
            .filter((p) => {
                return p.start <= this.serverTime;
            })
            .slice()
            .sort((a, b) => b.start - a.start);
    }

    @action setServerTime(time) {
        this.serverTime = time;
    }

    @computed get pathname() {
        if (this.current) {
            let { pathname, service } = ScenerUtils.parseUrl(this.current.content.services[0].url);
            return "/" + service + pathname;
        } else {
            return null;
        }
    }

    @computed get hostState() {
        return {
            userId: "system",
            contentTime: this.current ? (this.serverTime - this.current.start) * 1000 + this.current.offset : 0,
            playing: true,
            event: false,
            contentId: this.current ? this.current.contentId : null,
            pathname: this.pathname,
            lastUpdated: this.serverTime
        };
    }
}
