import { observable, action, computed } from "mobx";
import moment from "moment";

export class Member {
    @observable userId;
    @observable conversationId;
    @observable user;
    @observable created = 0;
    @observable typing = false;
    @observable activeRoomSid = null;
    @observable contentTime = 0;
    @observable playing = false;
    @observable event = null;
    @observable contentId = null;
    @observable pathname = null;
    @observable lastUpdated = 0;
    @observable active = true;
    @observable error = null;
    @observable inSync = false;
    @observable reloading = false;
    @observable participantState = null;
    @observable joined = null;
    subscribed = false;
    constructor() {
    }

    init(twilioMember) {
        if (twilioMember) {
            this.twilioMember = twilioMember;
            this.setProps({
                userId: twilioMember.identity,
                conversationId: twilioMember.channel.uniqueName,
                created: moment(twilioMember.dateCreated).unix(),
                ...twilioMember.attributes,
                typing: twilioMember.typing
            });
            this.subscribeToChanges();
        }
    }

    subscribeToChanges() {
        if (!this.subscribed && this.twilioMember) {
            this.twilioMember.on("updated", ({ member }) => {
                this.setProps(member.attributes);
            });
            this.twilioMember.on("typingStarted", () => {
                this.setProps({
                    typing: true
                });
            });
            this.twilioMember.on("typingEnded", () => {
                this.setProps({
                    typing: false
                });
            });
            this.subscribed = true;
        }
    }

    get id() {
        return this.userId + "_" + this.conversationId;
    }

    @action destroy() {
        this.user = null;
        this.typing = false;
    }

    @action setParticipantState(state) {
        this.participantState = state;
    }

    @action setProps(props) {
        if (props.userId != this.userId && props.userId) {
            this.userId = props.userId;
            global.scener.userStore
                .get({ id: this.userId })
                .then((user) => {
                    this.setUser(user);
                })
                .catch((e) => {
                    console.warn(this.userId, e);
                });
        }
        if (props.conversationId != this.conversationId && props.conversationId) {
            this.conversationId = props.conversationId;
        }
        if (props.channelId != this.conversationId && props.channelId) {
            this.conversationId = props.channelId;
            this.active = false;
        }
        if (typeof props.created !== "undefined") {
            this.created = props.created;
        }
        if (typeof props.typing !== "undefined") {
            this.typing = props.typing;
        }

        if (typeof props.activeRoomSid !== "undefined") {
            this.activeRoomSid = props.activeRoomSid;
        }

        if (typeof props.joined !== "undefined") {
            this.joined = props.joined;
        }
        return this;
    }

    startStateBeacon() {
        this.lastContentTime = 0;//global.scener.service.currentTime;
        if (this.stateBeaconTimer) {
            clearInterval(this.stateBeaconTimer);
            this.stateBeaconTimer = null;
        }
        this.stateBeaconTimer = setInterval(() => {
            this.sendCurrentState();
        }, 1000);
    }

    stopStateBeacon() {

        clearInterval(this.stateBeaconTimer);
        this.stateBeaconTimer = null;
    }

    @computed get isHost() {
        return global.scener.activeConversation && global.scener.activeConversation.id == this.conversationId && global.scener.activeConversation.hostId == this.userId;
    }

    sendCurrentState() {
        if (this.userId == global.scener.user.id) {
            if (this.participantState) {
                this.participantState.sendCurrentState();
            }
        }
    }

    sendHost() {
        if (this.userId == global.scener.user.id) {
            if (this.participantState) {
                this.participantState.sendHost(global.scener.activeConversation.hostId, false);
            }
        }
    }

    requestHost() {
        if (this.userId == global.scener.user.id) {
            if (this.participantState) {
                this.participantState.requestHost();
            }
        }
    }

    resetState() {
        if (this.userId == global.scener.user.id) {
            let state = {
                lastUpdated: Math.round(Date.now()),
                contentTime: 0,
                playing: false,
                contentId: null,
                pathname: null,
                activeRoomSid: null,
                inSync: false,
             //   error: global.scener.service.error || global.scener.sceneController.reloading
            };

            if (this.twilioMember) {
                this.twilioMember.updateAttributes(Object.assign({}, this.twilioMember.attributes, state)).catch((e) => {
                    console.warn(e);
                });
            }
        }
    }

    @action setUser(user) {
        this.user = user;
    }

    @computed get isActiveParticipant() {
        return global.scener.activeConversation && global.scener.sceneController.roomState.participants.filter((p) => p.identity == this.userId).length > 0;
    }
}
