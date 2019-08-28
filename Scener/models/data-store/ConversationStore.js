/*global scener*/

import { computed, reaction } from "mobx";
import { Conversation } from "../conversation.model";
import DataStore from "./data-store";
import { handleException } from "../../utils/errors";
import { AsyncStorage } from "react-native";
import moment from "moment";

export class ConversationStore extends DataStore {
    constructor() {
        super(Conversation);
        reaction(
            () => this.values.length,
            () => {
                this.writeToCache();
            }
        );
    }

    writeToCache() {
        AsyncStorage.setItem("ConversationStore", JSON.stringify(this.values.map((c) => c.toJSON()))).catch(handleException);
    }

    get(data) {
        if (!data || !data.id || data.id == "null") {
            delete this.entries[data.id];
            delete this.promises[data.id];
            return Promise.resolve(null);
        }
        if (this.entries[data.id]) {
            return Promise.resolve(this.entries[data.id]);
        }
        if (this.promises[data.id]) {
            return this.promises[data.id];
        }
        if (data instanceof this.BaseClass) {
            this.entries[data.id] = data;
            return Promise.resolve(this.entries[data.id]);
        }
        let newEntry = new this.BaseClass(data);
        if (global.scener.twilio.client) {
            this.promises[data.id] = global.scener.twilio.client
                .getChannelByUniqueName(data.id)
                .then((result) => {
                    if (this.entries[data.id]) {
                        delete this.promises[data.id];

                        return this.entries[data.id];
                    }
                    if (result && this.promises[data.id]) {
                        delete this.promises[data.id];
                        newEntry.init(result);
                        this.set(newEntry);
                        return this.entries[data.id];
                    } else {
                        delete this.entries[data.id];
                        delete this.promises[data.id];
                        return Promise.resolve(null);
                    }
                })
                .catch((e) => {
                  //  Sentry.captureException(e);
                    delete this.entries[data.id];
                    delete this.promises[data.id];
                    return Promise.resolve(null);
                });
        } else {
            delete this.entries[data.id];
            delete this.promises[data.id];
            return Promise.resolve(null);
        }
        return this.promises[data.id];
    }

    init() {
        reaction(
            () => global.scener.twilio.state,
            (s, reactionRef) => {
                if (s == "connected") {
                    this.initChannels().then(() => {
                        this.setInitialized(true);
                        this.subscribeToChannels();
                    });

                    reactionRef.dispose();
                } else {
                    AsyncStorage.getItem("currentId").then((id) => {
                        if (id == global.scener.user.id) {
                            AsyncStorage.getItem("ConversationStore").then((conversations) => {
                                if (conversations) {
                                    conversations = JSON.parse(conversations);
                                    conversations.forEach((c) => {
                                        let convo = new Conversation(c);
                                        this.get(convo);
                                    });
                                    this.setInitialized(true);
                                }
                            });
                        }
                    });
                }
            },
            {
                fireImmediately: true
            }
        );
    }

    initChannels(iterator = null) {
        if (iterator) {
            return iterator()
                .then(({ items, hasNextPage, nextPage }) => {
                    items
                        .filter((c) => !c.isPrivate)
                        .forEach((c) => {
                            if (c.status === "joined") {
                                c.leave();
                            }
                        });
                    this.addChannels(items.filter((c) => c.isPrivate));
                    if (hasNextPage) {
                        return this.init(nextPage);
                    }
                    return true;
                })
                .catch((e) => {
                    console.error(e);
                });
        } else {
            return global.scener.twilio.client
                .getSubscribedChannels()
                .then(({ items, hasNextPage, nextPage }) => {
                    items
                        .filter((c) => !c.isPrivate)
                        .forEach((c) => {
                            if (c.status === "joined") {
                                c.leave();
                            }
                        });
                    this.addChannels(items.filter((c) => c.isPrivate));

                    if (hasNextPage) {
                        return this.initChannels(nextPage);
                    }
                    return true;
                })
                .catch((e) => {
                    console.error(e);
                    throw e;
                });
        }
    }

    subscribeToChannels() {
        global.scener.twilio.client.on("channelAdded", (c) => {
            this.onChannelAdded(c);
        });
        global.scener.twilio.client.on("channelRemoved", (c) => {
            this.removeChannel(c);
        });
        global.scener.twilio.client.on("channelJoined", (c) => {
            if (c.createdBy != global.scener.user.id && !c.attributes.locked && c.isPrivate) {
                Conversation.parseMessage({ author: c.createdBy, body: `added you to %conversation%${c.uniqueName}%/conversation%` })
                    .then((m) => {
                        global.scener.user.notificationStore.add({
                            type: "message",
                            id: c.sid,
                            payload: m.body,
                            context: c.uniqueName,
                            fromUserId: c.createdBy,
                            toUserId: global.scener.user.id,
                            deleted: 0,
                            status: "pending",
                            created: moment().unix()
                        });
                    })
                    .catch((e) => console.warn(e));
            }
            this.addChannels([c]);
        });
        global.scener.twilio.client.on("channelLeft", (c) => {
            this.removeChannel(c);
        });
    }

    addChannels(channels) {
        for (let i in channels) {
            let c = channels[i];

            if (c.isPrivate && c.uniqueName) {
                let existing = this.conversations.filter((convo) => convo.id == c.uniqueName);
                if (existing.length == 0) {
                    let convo = new Conversation({ id: c.uniqueName });
                    this.get(convo).then((conversation) => {
                        if (conversation) {
                            conversation.init(c);
                        } else {
                            console.warn("no conversation found");
                        }
                    });
                } else {
                    existing[0].init(c);
                }
            }
        }
    }

    removeChannel(c) {
        this.remove(c.uniqueName);
    }

    onChannelAdded(c) {
        if (c.status !== "joined" && c.isPrivate) {
            c.join()
                .then(() => {
                    //console.log("joined channel: ", c);
                })
                .catch((e) => {
                    console.log(e.code, c);
                });
        }
    }

    groupsWithUser(userId) {
        return this.groups.filter((g) => {
            if (g.otherMembers) {
                for (let mem of g.otherMembers) {
                    if (mem && mem.userId == userId) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    conversationWithUserIdHash(hash) {
        return this.conversations.filter((c) => c.userIdHash == hash && c.locked)[0];
    }

    @computed get conversations() {
        return this.values.filter((c) => !c.deleted && !c.managed);
    }
    @computed get users() {
        return this.conversations.filter(
            (c) =>
                c.locked &&
                (c.otherMembers && c.otherMembers[0] && c.otherMembers[0].user && c.otherMembers[0].user.relationship.towards != "blocked" && c.otherMembers[0].user.relationship.from != "blocked")
        );
    }

    @computed get groups() {
        return this.conversations
            .filter((c) => !c.locked)
            .slice()
            .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }

    @computed get nonLiveGroups() {
        return this.groups
            .filter((c) => !c.hasActiveRoom)
            .slice()
            .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }

    @computed get sortedConversations() {
        return this.conversations.slice().sort((a, b) => b.lastMessageTime - a.lastMessageTime); //descending order = most recent first
    }

    //conversations with action in the last 3 days
    @computed get recentConversations() {
        return this.groups.filter((c) => !c.locked && moment().unix() - c.lastMessageTime < 60 * 60 * 24 * 3 && c.unreadCount == 0 && !c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get unreadConversations() {
        return this.groups.filter((c) => !c.locked && c.unreadCount > 0 && !c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get readConversations() {
        return this.groups.filter((c) => !c.locked && c.unreadCount == 0 && !c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get recentUsers() {
        return this.users.filter((c) => c.locked && moment().unix() - c.lastMessageTime < 60 * 60 * 24 * 3 && c.unreadCount == 0 && !c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get unreadUsers() {
        return this.users.filter((c) => c.locked && c.unreadCount > 0 && !c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get liveUsers() {
        return this.users.filter((c) => c.locked && c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get liveConversations() {
        return this.groups.filter((c) => !c.locked && c.hasActiveRoom && !c.isActiveConversation);
    }

    @computed get conversationsForHomeScreen() {
        return [...this.liveConversations, ...this.nonLiveGroups];
    }

    @computed get onlineUsersForHomeScreen() {
        return [
            ...this.liveUsers,
            ...this.unreadUsers.filter((c) => c && c.otherMembers && c.otherMembers[0] && c.otherMembers[0].user && c.otherMembers[0].user.activity && c.otherMembers[0].user.activity.onlineStatus)
        ];
    }

    @computed get offlineUsersForHomeScreen() {
        return [
            ...this.unreadUsers.filter((c) => c && c.otherMembers && c.otherMembers[0] && c.otherMembers[0].user && c.otherMembers[0].user.activity && !c.otherMembers[0].user.activity.onlineStatus)
        ];
    }
}
