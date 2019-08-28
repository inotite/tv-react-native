import { observable, action, computed, reaction, toJS } from "mobx";
import { Fragments } from "./api";
import { Member } from "./member.model";
import * as CryptoJS from "crypto-js";
import { handleException } from "../utils/errors";
import { AsyncStorage } from "react-native";
import moment from "moment";

export class Conversation {
    static ERROR = {
        NOT_SIGNED_IN: "NOT_SIGNED_IN",
        NO_DATA: "NO_DATA"
    };

    @observable id;
    @observable members = [];

    @observable activeRoom;
    @observable hostId = null;
    @observable contentId = null;
    @observable content = null;
    @observable name = null;
    @observable userIdHash;
    @observable busy = false;
    @observable unreadCount = 0;
    //twilio stuff
    @observable _messages = [];
    @observable chatChannel = null;
    @observable locked = false;
    @observable managed = false;
    // @observable activeRoomSid = null;
    activeRoomObservers = {};
    @observable inChannel = false;
    @observable images = {};
    @observable membersInitialized = false;
    @observable messagesInitialized = false;
    @observable stale = true;

    constructor(props) {
        props ? this.setProps(props) : null;
        reaction(
            () => global.scener.activeConversation,
            (conv) => {
                if (!conv || conv.id != this.id) {
                    this.onBecameInactive();
                } else if (conv && conv.id == this.id) {
                    this.onBecameActive();
                }
            }
        );
        reaction(
            () => this.localMember,
            (m) => {
                if (m) {
                    this.setInChannel(true);
                    m.resetState();
                } else {
                    this.setInChannel(false);
                }
            },
            { fireImmediately: true }
        );
       /* reaction(
            () => global.scener.service.lastContentUserInteraction,
            () => {
                if (this.localMember && this.isActiveConversation && this.isHost(global.scener.user.id)) {
                    this.localMember.sendCurrentState();
                }
            }
        );*/
        reaction(
            () => this.chatChannel,
            (c) => {
                if (c) {
                    this.connectedToChannel(c);
                }
            },
            { fireImmediately: true }
        );
        reaction(
            () => this.messages.length,
            (len) => {
                if (len) {
                    this.writeMessagesToCache();
                }
            },
            { fireImmediately: true }
        );
        reaction(
            () => this.members.length,
            (len) => {
                if (len) {
                    this.writeToCache();
                }
            },
            { fireImmediately: true }
        );
        reaction(
            () => this.initialized,
            (i) => {
                if (i) {
                    this.writeToCache();
                }
            },
            { fireImmediately: true }
        );
    }

    @action destroy() {
        //  document.removeEventListener("messageAdded", this.onMessageAdded);
        //   document.removeEventListener("messageRemoved", this.onMessageRemoved);
        //   document.removeEventListener("messageUpdated", this.onMessageUpdated);

        this.subscribed = false;
        this.members = [];
        this.name = null;
        this.userIdHash = null;
        this.busy = false;
        this.unreadCount = 0;
        //twilio stuff
        this._messages = [];
        if (this.chatChannel) {
            this.chatChannel.removeAllListeners();
        }
        if (this.joiningReaction) {
            this.joiningReaction();
            this.joiningReaction = null;
        }
        this.setChatChannel(null);
    }

    @action setStale(isStale) {
        this.stale = isStale;
    }

    @action setMembersInitialized(inited) {
        this.membersInitialized = inited;
    }

    @action setMessagesInitialized(inited) {
        this.messagesInitialized = inited;
    }

    @computed get initialized() {
        return this.membersInitialized && this.messagesInitialized;
    }

    onBecameActive() {
        /*Sentry.addBreadcrumb({
            message: "Conversation became active",
            data: {
                hasLocalMember: !!this.localMember,
                id: this.id
            },
            level: "info",
            category: "converstation.model"
        });*/
        if (this.localMember) {
            this.localMember.setParticipantState(global.scener.sceneController.localState);
            this.localMember.startStateBeacon();
        }
    }

    onBecameInactive() {
     /*   Sentry.addBreadcrumb({
            message: "Conversation became inactive",
            data: {
                hasLocalMember: !!this.localMember,
                id: this.id
            },
            level: "info",
            category: "converstation.model"
        });*/
        if (this.activeRoom) {
            this.activeRoom.disconnect();
            this.setActiveRoom(null);
        }
        if (this.localMember) {
            this.localMember.stopStateBeacon();
            this.localMember.sendCurrentState();
        }
    }

    @action setInChannel(isInChannel) {
        this.inChannel = isInChannel;
    }

    @action setChatChannel(chatChannel) {
        if (!this.chatChannel || !chatChannel || chatChannel.sid != this.chatChannel.sid) {
            this.subscribed = false;
            this.chatChannel = chatChannel;
        }
    }

    @action setProps(props) {
        if (props.id != this.id && props.id) {
            this.id = props.id;

            this._messages = [];

            this.readMessagesFromCache();
        } else {
            if (!props.id) {
                return this;
            }
        }
        if (props.name != this.name && props.name) {
            this.name = props.name;
        }

        if (props.userIdHash != this.userIdHash && props.userIdHash) {
            this.userIdHash = props.userIdHash;
        }

        if (props.locked != this.locked && typeof props.locked == "boolean") {
            this.locked = props.locked;
        }

        if (props.managed != this.managed && typeof props.managed == "boolean") {
            this.managed = props.managed;
        }

        if (props.deleted != this.deleted && typeof props.deleted != "undefined") {
            this.deleted = props.deleted;
        }

        if (props.contentId != this.contentId && typeof props.contentId != "undefined") {
            this.contentId = props.contentId;
        }

        if (props.hostId != this.hostId && typeof props.hostId != "undefined") {
            //   this.hostId = props.hostId;
        }

        if (props.members) {
            this.addMembers(props.members);
            this.readMessagesFromCache();
        }

        /*   if (props.activeRoomSid != this.activeRoomSid && typeof props.activeRoomSid != "undefined")
           {
               this.activeRoomSid = props.activeRoomSid;
           }*/
        if (typeof props.images != "undefined") {
            for (let i in props.images) {
                this.images[props.images[i].size] = props.images[i].url;
            }
        }

        return this;
    }

    @action setContent(content) {
        this.content = content;
    }

    @action setHostId(hostId) {
        this.hostId = hostId;
        if (hostId == global.scener.user.id) {
            this.localMember.participantState && this.localMember.participantState.sendHost(hostId, true);
        }
    }

    @action setBusy(isBusy) {
        this.busy = isBusy;
    }

    static generateUserIdHash(userIds) {
        let tmp = userIds.slice();
        tmp.push(global.scener.user.id);
        let sorted = tmp.sort();
        let hash = CryptoJS.MD5(sorted.join(""));
        return hash.toString(CryptoJS.enc.Hex).substring(0, 36);
    }
    init(chatChannel) {
        this.setChatChannel(chatChannel);
    }

    initMembers() {
        if (this.chatChannel) {
            return this.chatChannel
                .getMembers()
                .then((members) => {
                    this.addMembers(members);
                    this.setActiveRoom(null);

                    return members;
                })
                .catch((e) => {
                    console.warn(JSON.stringify(e));
                });
        } else {
            return Promise.reject("no chatChannel connected");
        }
    }

    joinChannel() {
        if (!this.chatChannel && this.id) {
            if (global.scener.twilio.state == "connected") {
              /*  Sentry.addBreadcrumb({
                    message: "Connecting to channel",
                    data: {
                        id: this.id
                    },
                    level: "info",
                    category: "converstation.model"
                });*/
                global.scener.twilio.client
                    .getChannelByUniqueName(this.id)
                    .then(async (channel) => {
                        if (channel.status !== "joined") {
                            await channel.join().catch((e) => {
                              /*  Sentry.addBreadcrumb({
                                    message: "joining channel",
                                    data: {
                                        id: this.id,
                                        message: e.message,
                                        code: e.code
                                    },
                                    level: "warning",
                                    category: "converstation.model"
                                });*/
                            });
                        }
                        this.setChatChannel(channel);
                    })
                    .catch((e) => {
                       /* Sentry.addBreadcrumb({
                            message: "getChannelByUniqueName::failed",
                            data: {
                                id: this.id,
                                message: e.message,
                                code: e.code
                            },
                            level: "warning",
                            category: "converstation.model"
                        });*/
                        console.warn(e);
                    });
            } else {
                if (!this.joiningReaction) {
                  /*  Sentry.addBreadcrumb({
                        message: "joinChannel::Waiting for twilio connection",
                        data: {
                            id: this.id
                        },
                        level: "info",
                        category: "converstation.model"
                    });*/
                    this.joiningReaction = reaction(
                        () => global.scener.twilio.state,
                        (state, reactionRef) => {
                            if (state == "connected") {
                                this.joinChannel();
                                reactionRef.dispose();
                                this.joiningReaction = null;
                            }
                        },
                        { fireImmediately: true }
                    );
                }
            }
        }
    }

    leaveChannel() {
        if (this.chatChannel) {
            this.chatChannel
                .leave()
                .then(() => {
                    this.setChatChannel(null);
                })
                .catch((e) => {
                  /*  Sentry.addBreadcrumb({
                        message: "leave channel failed",
                        data: {
                            id: this.id,
                            message: e.message,
                            code: e.code
                        },
                        level: "warning",
                        category: "converstation.model"
                    });*/
                    console.warn(JSON.stringify(e));
                });
        }
    }

    memberWithUserId(id) {
        return this.members.filter((m) => m.userId == id)[0];
    }

    @computed get localMember() {
        return this.members.filter((m) => m.userId == global.scener.user.id)[0];
    }

    @action removeMember(member) {
        this.members = this.members.slice().filter((m) => {
            if (member.identity != m.userId) {
                return true;
            } else {
                if (this.activeRoomObservers[m.userId]) {
                    this.activeRoomObservers[m.userId]();
                    delete this.activeRoomObservers[m.userId];
                }
                m.destroy();
                return false;
            }
        });
    }

    @action addMembers(members) {
        for (let i in members) {
            if (members[i].identity) {
                let existing = this.members.filter((m) => m.userId == members[i].identity);
                if (existing.length == 0) {
                    if (global.scener.user.blockedIdList.indexOf(members[i].identity) < 0) {
                        let newMember = new Member();
                        newMember.init(members[i]);

                        this.members.push(newMember);
                    }
                } else {
                    if (!existing[0].twilioMember) {
                        existing[0].init(members[i]);
                    }
                }
            } else {
                if (this.members.filter((m) => m.userId == members[i].userId).length == 0) {
                    if (global.scener.user.blockedIdList.indexOf(members[i].userId) < 0) {
                        let newMember = new Member();
                        newMember.setProps(members[i]);

                        this.members.push(newMember);
                    }
                }
            }
        }
    }

    createMembers(userIds) {
        if (this.chatChannel) {
            for (let i in userIds) {
                this.chatChannel
                    .add(userIds[i])
                    .then(() => {
                        this.sendMessage(`%action%added %user%${userIds[i]}%/user%%/action%`);
                    })
                    .catch((e) => {
                        console.warn(e, this.id);
                       /* Sentry.addBreadcrumb({
                            message: "create members failed",
                            data: {
                                id: this.id,
                                message: e.message,
                                code: e.code
                            },
                            level: "warning",
                            category: "converstation.model"
                        });*/
                    });
            }
        } else {
            console.warn("no chatChannel set for conversationId ", this.id);
        }
    }

    @computed get otherMembers() {
        return this.members
            .filter((m) => m.userId != global.scener.user.id)
            .slice()
            .sort((a, b) => {
                return a.created - b.created;
            });
    }

    @computed get otherUser() {
        if (this.locked) {
            return this.otherMembers[0] ? this.otherMembers[0].userId : {};
        } else {
            return {};
        }
    }

    @computed get conversationStatus() {
        if (this.hasActiveRoom && this.content) {
            return this.content.displayName;
        } else if (this.otherMembers && this.otherMembers.length > 1) {
            let online = this.otherMembers.filter((m) => {
                if (m.user) {
                    return m.user.activity.onlineStatus;
                }
                return false;
            });
            let offline = this.otherMembers.filter((m) => {
                if (m.user) {
                    return !m.user.activity.onlineStatus;
                }
                return true;
            });
            return `${online.length} Online | ${offline.length} Offline`;
        } else if (this.otherMembers.length) {
            return this.otherMembers[0].user ? this.otherMembers[0].user.activity.statusDisplayString : "Loading...";
        } else if (this.otherMembers.length == 0 && !this.locked) {
            return "Waiting for others";
        } else {
            return "Loading...";
        }
    }

    @computed get conversationName() {
        if (this.name) {
            return this.name;
        } else {
            return this.otherMembers.map((m) => (m.user ? m.user.username : "")).join(", ");
        }
    }

    isHost(userId) {
        if (this.managed) {
            return false;
        }
        return this.hostId == userId;
    }

    @computed get hasActiveRoom() {
        return !!this.activeRoomSid;
    }

    @computed get activeMembers() {
        return this.members.filter((m) => !!m.activeRoomSid && m.participantState);
    }

    @computed get inactiveMembers() {
        return this.members.filter((m) => !m.activeRoomSid);
    }

    joinRoom() {
        let token = global.scener.twilio.token;
        if (!this.activeRoom) {
            global.scener.twilio.video.connect(token, { tracks: [], name: this.id }).then(
                (room) => {
                    this.setActiveRoom(room);
                },
                (error) => {
                    console.error(`Unable to connect to Room: ${error.message}`);
                  /*  Sentry.addBreadcrumb({
                        message: "unable to connect to room",
                        data: {
                            id: this.id,
                            message: error.message,
                            code: error.code
                        },
                        level: "warning",
                        category: "converstation.model"
                    });*/
                }
            );
        }
    }

    @action setActiveRoom(room) {
        this.update({ activeRoomSid: room ? room.sid : null });

        this.activeRoom = room;
    }

    @computed get activeRoomSid() {
        if (this.managed) {
            return null;
        }
        if (this.activeRoom) {
            return this.activeRoom.sid;
        }
        for (let i in this.members) {
            if (this.members[i].activeRoomSid && ((this.members[i].user && this.members[i].user.activity.onlineStatus) || this.members[i].userId == global.scener.user.id)) {
                return this.members[i].activeRoomSid;
            }
        }
        return null;
    }

    @computed get memberError() {
        if (this.managed) {
            return null;
        }
        for (let i in this.members) {
            if (this.members[i].participantState && this.members[i].participantState.error && this.members[i].userId != global.scener.user.id) {
                return { error: this.members[i].participantState.error, userId: this.members[i].userId };
            }
        }
        return null;
    }

    update(props) {
        if (global.scener.user.loggedIn) {
            if (props.name && !this.managed) {
                this.chatChannel.updateFriendlyName(props.name).catch((e) => {
                  /*  Sentry.addBreadcrumb({
                        message: "unable to update friendly name",
                        data: {
                            id: this.id,
                            message: e.message,
                            code: e.code
                        },
                        level: "warning",
                        category: "converstation.model"
                    });*/
                });
                this.setProps({ id: this.id, name: props.name });
            }
            if (typeof props.activeRoomSid !== "undefined") {
                let member = this.localMember;
                if (member) {
                    member.twilioMember
                        .updateAttributes({ activeRoomSid: props.activeRoomSid, joined: Date.now() })
                        .then((m_) => {
                            return null;
                        })
                        .catch((e) => {
                            console.warn(e);
                        /*    Sentry.addBreadcrumb({
                                message: "unable to update member",
                                data: {
                                    id: this.id,
                                    message: e.message,
                                    code: e.code
                                },
                                level: "warning",
                                category: "converstation.model"
                            });*/
                        });
                }
            }
        } else {
            throw new DOMException(Conversation.ERROR.NOT_SIGNED_IN);
        }
    }

    isConversationVisible(honorSidebar = true) {
        if (!global.scener.sidebarOpen && honorSidebar) {
            return false;
        }
        if (this.managed) {
            return global.scener.history.location.pathname == "/channel/" + this.id;
        } else if (this.locked) {
            return global.scener.history.location.pathname == "/user/" + this.otherUser;
        } else {
            return global.scener.history.location.pathname == "/group/" + this.id;
        }
    }

    @computed get oldestParticipant() {
        let oldest = [this.localMember, ...this.activeMembers].sort((a, b) => a.joined - b.joined)[0];
        if (oldest) {
            return oldest;
        } else {
            return null;
        }
    }

    @computed.struct get hostState() {
        if (this.otherMembers.length) {
            let host = this.otherMembers.filter((m) => m.userId == this.hostId)[0];
            if (host) {
                return { ...host.participantState, userId: host.userId };
            }
        }

        return null;
    }

    makeUserHost(userId) {
        if (this.hostId == global.scener.user.id) {
            if (this.chatChannel) {
                //   this.chatChannel.updateAttributes(Object.assign({}, this.chatChannel.attributes, { hostId: userId }));
                if (this.localMember.participantState) {
                    this.sendMessage(`%action%passed the remote to %user%${userId}%/user%%/action%`);
                    this.localMember.participantState.sendHost(userId, true);
                    this.setHostId(userId);
                }
            }
        } /*else if (global.scener.service.error) {
            if (this.chatChannel) {
                if (this.localMember.participantState) {
                    this.sendMessage(`%action%took the remote to help with syncing issues%/action%`);
                    this.localMember.participantState.sendHost(userId, true);
                    this.setHostId(userId);
                }
                //  this.chatChannel.updateAttributes(Object.assign({}, this.chatChannel.attributes, { hostId: userId }));
            }
        }*/
    }

    //TWILIO
    @action async connectedToChannel(chatChannel) {
        this.setProps({
            id: chatChannel.uniqueName,
            name: chatChannel.friendlyName,
            ...chatChannel.attributes
        });
       /* Sentry.addBreadcrumb({
            message: "connected to chatChannel",
            data: {
                memberStatus: chatChannel.status,
                id: this.id
            },
            level: "info",
            category: "converstation.model"
        });*/
        if (chatChannel.status !== "joined") {
            await chatChannel.join().catch((err) => {
                console.warn(err);
               /* Sentry.addBreadcrumb({
                    message: "unable to join channel",
                    data: {
                        memberStatus: chatChannel.status,
                        id: this.id,
                        message: err.message,
                        code: err.code
                    },
                    level: "warning",
                    category: "converstation.model"
                });*/
            });
        }
        this.initMembers();
        this.fetchPastMessages();

        this.subscribeToUpdates();

        if (!this.twilioClientStateReaction) {
            this.twilioClientStateReaction = reaction(
                () => global.scener.twilio.state,
                (newState) => {
                    this.onTwilioClientStateChanged(newState);
                },
                {
                    fireImmediately: true
                }
            );
        }
        this.setStale(false);
        return Promise.resolve(true);
    }

    onTwilioClientStateChanged(newState) {
        if (newState == "connected") {
            if (this.chatChannel) {
                if (this.chatChannel.status === "joined") {
                    if (!this.subscribed) {
                        this.subscribeToMessages();
                    }
                } else {
                    this.joinChannel();
                }
            } else {
                this.joinChannel();
            }
        }
    }

    fetchPastMessages() {
        if (this.chatChannel) {
            // this.setBusy(true);
            return this.chatChannel
                .getMessages()
                .then((msgPage) => {
                    return this.appendMessages(msgPage.items, false).finally(() => {
                        //    this.setBusy(false);

                        return this.messages;
                    });
                })
                .catch((e) => {
                    console.warn(JSON.stringify(e));
                    if (e.code == 54007) {
                        reaction(
                            () => this.inChannel,
                            (isInChannel, reactionRef) => {
                                if (isInChannel) {
                                    this.fetchPastMessages();
                                    reactionRef.dispose();
                                }
                            },
                            { fireImmediately: true }
                        );
                    } else {
                        throw e;
                    }
                });
        } else {
            console.log("not connected to chatChannel");
        }
    }

    @action resetMessages() {
        this._messages = [];
    }

    subscribeToUpdates() {
        if (this.chatChannel && !this.subscribed) {
            this.chatChannel.on("messageAdded", (msg) => {
                this.appendMessages(msg);
            });
            this.chatChannel.on("messageUpdated", (msg) => {
                this.updateMessage(msg);
            });
            this.chatChannel.on("messageRemoved", (msg) => {
                this.removeMessage(msg);
            });
            this.chatChannel.on("memberJoined", (member) => this.onMemberJoined(member));
            this.chatChannel.on("memberLeft", (member) => this.onMemberLeft(member));
            this.chatChannel.on("updated", ({ channel }) => this.onChannelUpdated(channel));
            this.subscribed = true;
        }
    }

    onChannelUpdated(chatChannel) {
        if (chatChannel) {
            this.setProps({
                id: chatChannel.uniqueName,
                name: chatChannel.friendlyName,
                status: chatChannel.status,
                ...chatChannel.attributes
            });
        }
    }

    onMemberJoined(member) {
        this.addMembers([member]);
    }

    onMemberLeft(member) {
        this.removeMember(member);
    }

    @computed get lastMessageTime() {
        if (this._messages.length > 0) {
            let lastMessage = this.sortedMessages[this.sortedMessages.length - 1];
            return moment(lastMessage.dateUpdated).unix();
        } else {
            return 0;
        }
    }

    @computed get lastMessagePreview() {
        if (this._messages.length > 0) {
            let lastMessage = this.sortedMessages[this.sortedMessages.length - 1];
            return lastMessage.body.replace(/<.+?>/gi, "");
        } else {
            return "";
        }
    }

    @computed get lastMessage() {
        if (this._messages.length > 0) {
            return this.sortedMessages[this.sortedMessages.length - 1];
        } else {
            return null;
        }
    }

    @computed get firstMessage() {
        if (this._messages.length > 0) {
            return this.sortedMessages[0];
        } else {
            return null;
        }
    }

    @computed get firstMessageTimestamp() {
        if (this.firstMessage) {
            return moment(this.firstMessage.dateUpdated);
        } else {
            return null;
        }
    }
    @computed get lastMessageTimestamp() {
        if (this.lastMessage) {
            return moment(this.lastMessage.dateUpdated);
        } else {
            return null;
        }
    }

    @computed get hasMessages() {
        return this._messages.length > 0;
    }

    messagesInRange(start, end) {
        let msgsInRange = this._messages.filter((m) => {
            return moment(m.dateUpdated).isBefore(end) && moment(m.dateUpdated).isAfter(start);
        });
        return msgsInRange;
    }

    sendReaction({ reactionType }) {
        if (this.chatChannel) {
            this.chatChannel.sendMessage("", { reactionType }).catch((e) => {
                console.warn(JSON.stringify(e));
            });
        }
    }

    sendMessage(msg) {
        if (this.chatChannel) {
            this.chatChannel.sendMessage(msg).catch((e) => {
                if (e.code == 50400) {
                    reaction(
                        () => this.inChannel,
                        (isInChannel, reactionRef) => {
                            if (isInChannel) {
                                this.sendMessage(msg);
                                reactionRef.dispose();
                            }
                        },
                        { fireImmediately: true }
                    );
                    this.joinChannel();
                } else {
                    console.warn(JSON.stringify(e));
                    throw e;
                }
            });
        }
    }

    didViewCurrentMessages(index) {
        let lastMsg = this.lastMessage;
        index = typeof index !== "undefined" ? index : lastMsg ? lastMsg.index : null;

        if (index !== null && this.chatChannel) {
            this.chatChannel
                .advanceLastConsumedMessageIndex(index)
                .then((newCount_) => {
                    this.calculateUnreadCount();
                })
                .catch((e) => {
                    console.warn(JSON.stringify(e));
                    throw e;
                });
        }
    }

    fetchUnreadCount() {
        //if (this.chatChannel) {
        /* this.chatChannel
                .getUnconsumedMessagesCount()
                .then((count_) => {*/
        //this.setUnreadCount(count);
        this.calculateUnreadCount();
        /*   })
                .catch((e) => {
                    console.warn(JSON.stringify(e));
                    throw e;
                });*/
        // }
    }

    @action calculateUnreadCount() {
        if (this.chatChannel) {
            let lastIndex = this.chatChannel.lastConsumedMessageIndex;
            let unreadMessages = this.messages.filter((m) => {
                return m.index > lastIndex && m.author != "system" && m.author != global.scener.user.id;
            });
            this.unreadCount = unreadMessages.length;
        } else {
            this.unreadCount = 0;
        }
    }

    @action setUnreadCount(count) {
        if (count == null) {
            this.unreadCount = 0;
        } else {
            this.unreadCount = count;
        }
    }

    static async parseMessage(msg) {
        try {
            let msgBody = msg.body;
            let userRe = /%user%(.+?)%\/user%/gi;
            let contentRe = /%content%(.+?)%\/content%/gi;
            let conversationRe = /%conversation%(.+?)%\/conversation%/gi;
            let actionRe = /%action%(.+?)%\/action%/gi;

            if (msg.state) {
                msg.originalAuthor = msg.state.author;
            } else {
                msg.originalAuthor = msg.author;
            }

            if (actionRe.exec(msgBody)) {
                msgBody = `%user%${msg.author}%/user% ${msgBody.replace(actionRe, "$1")}`;
                if (msg.state) {
                    msg.state.author = "system";
                } else msg.author = "system";
            }

            let usersInMessage = {};
            let userMatches = userRe.exec(msgBody);
            while (userMatches) {
                if (!usersInMessage[userMatches[1]]) {
                    usersInMessage[userMatches[1]] = global.scener.userStore.get({ id: userMatches[1] });
                }
                userMatches = userRe.exec(msgBody);
            }
            let users = await Promise.all(Object.values(usersInMessage));
            for (let k in users) {
                usersInMessage[users[k].id] = users[k];
            }
            msgBody = msgBody.replace(userRe, (match_, p1) => {
                if (usersInMessage[p1]) {
                    return "<strong>" + usersInMessage[p1].username + "</strong>";
                } else {
                    return "";
                }
            });

            let contentInMessage = {};
            let contentMatches = contentRe.exec(msgBody);
            while (contentMatches) {
                if (!contentInMessage[contentMatches[1]]) {
                    contentInMessage[contentMatches[1]] = global.scener.contentStore.get({ id: contentMatches[1] });
                }
                contentMatches = contentRe.exec(msgBody);
            }
            let content = await Promise.all(Object.values(contentInMessage));
            for (let k in content) {
                contentInMessage[content[k].id] = content[k];
            }
            msgBody = msgBody.replace(contentRe, (match_, p1) => {
                if (contentInMessage[p1]) {
                    return "<strong>" + contentInMessage[p1].displayName + "</strong>";
                } else {
                    return "";
                }
            });

            let conversationsInMessage = {};
            let conversationMatches = conversationRe.exec(msgBody);

            while (conversationMatches) {
                if (!conversationsInMessage[conversationMatches[1]]) {
                    conversationsInMessage[conversationMatches[1]] = global.scener.user.conversationStore.get({ id: conversationMatches[1] });
                }
                conversationMatches = conversationRe.exec(msgBody);
            }
            let conversations = await Promise.all(Object.values(conversationsInMessage));
            for (let k in conversations) {
                conversationsInMessage[conversations[k].id] = conversations[k];
            }
            msgBody = msgBody.replace(conversationRe, (match_, p1) => {
                return "<strong>" + (conversationsInMessage[p1].name ? conversationsInMessage[p1].name : "this group") + "</strong>";
            });

            if (msg.state) {
                msg.state.body = msgBody;
            } else {
                msg.body = msgBody;
            }
        } catch (e) {
            return null;
        }
        return msg;
    }

    @action async appendMessages(msgs, isNew = true, parse = true) {
        if (!Array.isArray(msgs)) {
            msgs = [msgs];
        }

        let msgsToAdd = [];
        if (parse) {
            for (let k in msgs) {
                if (this._messages.filter((m) => m.sid == msgs[k].sid).length == 0) {
                    msgsToAdd.push(Conversation.parseMessage(msgs[k]));
                }
            }
        } else {
            msgsToAdd = [];
        }

        try {
            let parsedMessages = [];
            if (parse) {
                parsedMessages = await Promise.all(msgsToAdd);
            } else {
                parsedMessages = msgs;
            }

            // REMOVE BLOCKED USERS
            parsedMessages = parsedMessages.filter((m) => !!m && global.scener.user.loggedIn && global.scener.user.blockedIdList.indexOf(m.originalAuthor) < 0);

            for (let k in parsedMessages) {
                if (parsedMessages[k] && this._messages.filter((m) => m.sid == msgs[k].sid).length == 0) {
                    this._messages.push(parsedMessages[k]);
                }
            }
            this.writeMessagesToCache();

            if (parsedMessages.length) {
                if (isNew && !this.isConversationVisible()) {
                    if (this.chatChannel && this.chatChannel.state && this.chatChannel.state.attributes && this.chatChannel.state.attributes.managed) {
                        // dont show for channels
                        this.didViewCurrentMessages();
                    } else {
                        for (let i in parsedMessages) {
                            if (
                                ((this.chatChannel && parsedMessages[i].index > this.chatChannel.lastConsumedMessageIndex) || !this.chatChannel.lastConsumedMessageIndex) &&
                                parsedMessages[i].body.length > 0
                            ) {
                                if (parsedMessages[i].originalAuthor != global.scener.user.id) {
                                    let curMessageBody = parsedMessages[i].body.includes("media.tenor.com") ? "sent a GIF" : parsedMessages[i].body;

                                    global.scener.user.notificationStore.add({
                                        type: "message",
                                        id: parsedMessages[i].sid,
                                        payload: curMessageBody,
                                        context: this.id,
                                        fromUserId: parsedMessages[i].author,
                                        toUserId: global.scener.user.id,
                                        deleted: 0,
                                        status: "pending",
                                        created: Date.now() / 1000
                                    });
                                } else {
                                    console.log("from the current user, don't show popup", parsedMessages[i].index);
                                    //  this.didViewCurrentMessages(parsedMessages[i].index);
                                }
                            }
                        }
                    }
                }
            }
            this.fetchUnreadCount();
        } catch (e) {
            console.warn(e);
            throw e;
        }
    }

    @action updateMessage(msg) {
        this._messages = this._messages.slice().map((m) => {
            if (m.sid != msg.sid) {
                return m;
            } else {
                return msg;
            }
        });
    }

    @action removeMessage(msg) {
        this._messages = this._messages.slice().filter((m) => m.sid != msg.sid);
    }

    @computed get messages() {
        return this._messages.filter((msg) => {
            return msg.body.replace(/ /gi, "").length != 0 && (!msg.attributes || !msg.attributes.reactionType);
        });
    }

    @computed get reactions() {
        return this._messages.filter((msg) => {
            return msg.attributes && msg.attributes.reactionType && moment().diff(moment(msg.dateUpdated), "seconds") < 10;
        });
    }

    @computed get sortedMessages() {
        return this._messages.slice().sort((a, b) => moment(a.dateUpdated).unix() - moment(b.dateUpdated).unix());
    }

    @computed get isActiveConversation() {
        return global.scener.activeConversation && global.scener.activeConversation.id == this.id;
    }

    static DEFAULT_MESSAGES = [
        {
            sid: "default1",
            body: "Welcome to the chat!",
            author: "scenerbot",
            dateUpdated: new Date()
        }
    ];

    dataForCache() {
        let { id, name, userIdHash, activeRoomSid, contentId, hostId, locked, deleted } = this;
        return {
            id,
            name,
            userIdHash,
            activeRoomSid,
            contentId,
            hostId,
            locked,
            deleted,
            members: this.members.map((m) => {
                // BLOCKED USERS HERE
                return {
                    userId: m.userId,
                    conversationId: this.id,
                    deleted: m.deleted,
                    created: m.created,
                    __typename: "Member"
                };
            }),
            __typename: "Conversation"
        };
    }

    writeToCache() {
        AsyncStorage.setItem("Conversation:" + this.id, JSON.stringify(this.toJSON())).catch(handleException);
    }

    writeMembersToCache() {
        global.scener.client.writeFragment({
            id: this.id,
            fragment: Fragments.ConversationMembers,
            fragmentName: "ConversationMembers",
            data: {
                members: this.members.map((m) => {
                    return {
                        userId: m.userId,
                        conversationId: this.id,
                        deleted: m.deleted,
                        created: m.created,
                        __typename: "Member"
                    };
                }),
                __typename: "Conversation"
            }
        });
    }

    toJSON() {
        let { id, name, userIdHash, activeRoomSid, contentId, hostId, locked, deleted } = this;
        return toJS({
            id,
            name,
            userIdHash,
            activeRoomSid,
            contentId,
            hostId,
            locked,
            deleted,

            members: this.members
                .map((m) => {
                    return m
                        ? {
                              userId: m.userId,
                              conversationId: this.id,
                              deleted: m.deleted,
                              created: m.created
                          }
                        : null;
                })
                .filter((m) => !!m)
        });
    }

    messagesToJSON() {
        return toJS(
            this._messages
                .map((m) => {
                    return !m.skipCache
                        ? {
                              sid: m.sid,
                              author: m.state.author,
                              originalAuthor: m.originalAuthor,
                              body: m.state.body,
                              state: {
                                  sid: m.sid,
                                  author: m.state.author,
                                  originalAuthor: m.originalAuthor,
                                  body: m.state.body,
                                  dateUpdated: m.state.dateUpdated,
                                  index: m.state.index
                              },
                              dateUpdated: m.state.dateUpdated,
                              index: m.state.index
                          }
                        : null;
                })
                .filter((m) => !!m)
        );
    }

    writeMessagesToCache() {
        AsyncStorage.setItem("Conversation:" + this.id + ":messages", JSON.stringify(this.messagesToJSON())).catch(handleException);
    }

    readMessagesFromCache() {
        AsyncStorage.getItem("Conversation:" + this.id + ":messages").then((msgs) => {
            if (msgs) {
                this.appendMessages(JSON.parse(msgs), false, false);
            }
        });
    }
}
