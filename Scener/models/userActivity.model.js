import { action, observable, reaction, computed, toJS } from "mobx";
import moment from "moment";

export class UserActivity {
    // UserActivity
    @observable userId = null;
    @observable _onlineStatus = false; //int  0 == offline, !0 == online
    @observable contentId = null; //string - the content id of what the suer is currently watching.  May be null.
    @observable contentTimeline = 0; //int - timeline position of the content specified by contentId
    @observable content = null;
    @observable channelId = null;
    @observable channel = null;
    @observable updated = 0;
    @observable playing = false;
    @observable visible = true;
    @observable twilioUser = null;
    constructor(props) {
        props ? this.setProps(props) : null;

        this.contentReaction = reaction(
            () => this.contentId,
            (id) => {
                if (id != null && (this.content == null || this.contentId != id || (id != null && this.content != null && this.content.id != id))) {
                    global.scener.contentStore.get({ id: this.contentId }).then((content) => {
                        this.setContent(content);
                    });
                } else if (!id) {
                    this.setContent(null);
                }
            },
            {
                fireImmediately: true
            }
        );

        this.channelReaction = reaction(
            () => this.channelId,
            (id) => {
                if (id != null && (this.channel == null || this.channelId != id || (id != null && this.channel != null && this.channel.id != id))) {
                    global.scener.channelStore.get({ id: this.channelId }).then((channel) => {
                        this.setChannel(channel);
                    });
                } else if (!id) {
                    this.setChannel(null);
                }
            },
            {
                fireImmediately: true
            }
        );

        this.twilioUserReaction = reaction(
            () => this.twilioUser,
            (user) => {
                if (user) {
                    this.subscribeToChanges();
                }
            }
        );
    }

    @action destroy() {
        if (this.twilioUser) {
            this.twilioUser.removeAllListeners();
            this.twilioUser.unsubscribe();
        }
        this.twilioUser = null;
        if (this.userActivityQuerySubscription) {
            this.userActivityQuerySubscription.unsubscribe();
        }
        this.userActivityQuerySubscription = null;
        this.userActivityQuery = null;
        // this.userId = null;
        this._onlineStatus = false; //int  0 == offline, !0 == online
        this.contentId = null; //string - the content id of what the suer is currently watching.  May be null.
        this.contentTimeline = 0; //int - timeline position of the content specified by contentId
        this.content = null;
        this.updated = 0;
        this.playing = false;
        this.visible = true;
        if (this.contentReaction) {
            this.contentReaction();
        }
        this.contentReaction = null;
        if (this.userActivitySubscription) {
            this.userActivitySubscription.unsubscribe();
            this.userActivitySubscription = null;
        }

        this.userActivitySubscription = null;
    }

    @action setProps(props) {
        if (props.userId) {
            this.userId = props.userId;
        }

        this.contentId = props.contentId;
        this.channelId = props.channelId;
        this.contentTimeline = props.contentTimeline;
        if (props.updated) {
            this.updated = props.updated;
        }
        if (this._onlineStatus != props.onlineStatus) {
            this._onlineStatus = props.onlineStatus;
        }
        if (typeof props.visible !== "undefined") {
            this.visible = props.visible;
        }
        this.playing = !!props.playing;
        if (props.content) {
            this.content = props.content;
        }
    }

    @computed get onlineStatus() {
        //if it's been 20 sec without an update, assume they are offline
        return (this.userId != global.scener.user.id && Date.now() / 1000 - this.updated > 60) || !this.visible ? false : this._onlineStatus;
    }

    @computed get isWatching() {
        return this.content && this.content.id && this.onlineStatus;
    }

    @computed get isOnline() {
        return this.onlineStatus;
    }

    @computed get statusDisplayString() {
        if (this.isWatching) {
            return this.contentDisplayString;
        } else if (this.isOnline) {
            return "Browsing";
        } else if (moment().unix() - this.updated < 60 * 60 * 24 * 7) {
            return `Last seen ${moment.unix(this.updated).fromNow()}`;
        } else {
            return `Last seen a while ago`;
        }
    }

    @computed get contentDisplayString() {
        if (this.channel) {
            return this.channel.name;
        } else if (this.content) {
            return this.content.displayName;
        } else {
            return "Watching";
        }
    }

    @action setContent(content) {
        this.content = content;
    }

    @action setChannel(channel) {
        this.channel = channel;
    }

    @action setContentId(id) {
        this.contentId = id;
    }

    @action setTwilioUser(user) {
        this.twilioUser = user;
    }

    fetch() {
        if (global.scener.twilio.state == "connected") {
            return global.scener.twilio.client
                .getUser(this.userId)
                .then((user) => {
                    this.setTwilioUser(user);
                    this.setProps({
                        onlineStatus: user.online,
                        ...user.attributes
                    });
                    return this;
                })
                .catch((e_) => {
                    // console.warn(this.userId, JSON.stringify(e));
                });
        } else {
            return new Promise((resolve) => {
                reaction(
                    () => global.scener.twilio.state,
                    (newState, connectReactionRef) => {
                        if (newState == "connected") {
                            resolve(this.fetch());
                            connectReactionRef.dispose();
                        }
                    }
                );
            });
        }
    }

    onUserActivityQueryChanged(data) {
        if (data && data.UserActivity) {
            this.setProps(data.UserActivity);
        }
    }

    computeActivity() {
        if (global.scener.user.loggedIn && this.userId == global.scener.user.id) {
            this.setProps({
                contentId: global.scener.content ? global.scener.content.id : null,
                contentTimeline: 0,//global.scener.service.currentTime,
                playing: false,//global.scener.service.playing,
                visible: this.visible,
                onlineStatus: 1,
                location: this.location,
                updated: moment().unix()
            });
        }
    }

    pushToServer() {
        if (this.userId == global.scener.user.id && (!this.lastPush || moment().unix() - this.lastPush > 1)) {
            if (this.twilioUser) {
                this.lastPush = moment().unix();
                this.twilioUser
                    .updateAttributes({
                        channelId: global.scener.activeConversation && global.scener.activeConversation.managed ? global.scener.activeConversation.id : null,
                        contentId: this.contentId,
                        contentTimeline: this.contentTimeline,
                        playing: this.playing,
                        visible: this.visible,
                        updated: this.updated,
                       // extensionVersion: global.scener.env.config.extensionVersion,
                      //  webappVersion: global.scener.env.config.webappVersion
                    })
                    .then(() => {
                        return null;
                    })
                    .catch((e) => {
                       // Sentry.captureException(e);

                        console.warn(this.userId, JSON.stringify(e));
                    });
            }

            /*    global.scener.client.mutate(
                {
                    mutation: Mutations.updateUserActivity,
                    variables:
                    {
                        activity:
                        {
                            userId: this.userId,
                            contentId: this.contentId,
                            contentTimeline: this.contentTimeline,
                            playing: this.playing,
                            visible: this.visible ? 1 : 0,
                            status: this._onlineStatus,
                            location: this.location,
                            extensionVersion: global.scener.env.config.extensionVersion,
                            webappVersion: global.scener.env.config.webappVersion
                        }
                    },

                });*/
        }
    }

    subscribeToChanges() {
        if (this.userId && this.userId !== global.scener.user.id && !this.subscribed) {
            this.fetch().then(() => {
                if (this.twilioUser) {
                    this.subscribed = true;
                    this.twilioUser.on("updated", ({ user }) => {
                        this.setProps({
                            onlineStatus: user.online,
                            ...user.attributes
                        });
                    });
                }
            });
        }
    }
    toJSON() {
        const {
            userId,
            contentId, //string - the content id of what the suer is currently watching.  May be null.
            contentTimeline, //int - timeline position of the content specified by contentId
            content,
            channelId,
            updated,
            playing,
            visible
        } = this;
        return toJS({
            userId,
            contentId, //string - the content id of what the suer is currently watching.  May be null.
            contentTimeline, //int - timeline position of the content specified by contentId
            content: content ? content.toJSON() : null,
            channelId,
            updated,
            playing,
            visible
        });
    }
}
