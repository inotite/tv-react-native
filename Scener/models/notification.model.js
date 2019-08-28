import { observable, action, reaction, computed } from "mobx";
import { Mutations, Subscriptions } from "./api";
import { Conversation } from "./conversation.model";
/*global scener*/
//import { ScenerPartyController } from "../components/commentary/party/party.controller";

export class ScenerNotification {
    static STATUS = {
        PENDING: "pending",
        VIEWED: "viewed",
        ACCEPTED: "accepted",
        REJECTED: "rejected",
        EXPIRED: "expired",
        DELETED: "deleted"
    };

    id = null; //string
    @observable toUserId = null; //string
    @observable toUser = null;
    @observable fromUserId = null; //string
    @observable fromUser = null; //ScenerUser
    @observable status = ScenerNotification.STATUS.PENDING;
    type = "ping";
    payload = {};
    context = null; //string
    @observable deleted = 0; //timestamp
    created = 0; //timestamp

    notificationSubscription = null;

    constructor(props) {
        props ? this.setProps(props) : null;
        if (this.type != "message") {
            reaction(
                () => this.status,
                (status, reactionRef) => {
                    if (status !== ScenerNotification.STATUS.PENDING && status !== ScenerNotification.STATUS.VIEWED) {
                        if (this.notificationSubscription) {
                            this.notificationSubscription.unsubscribe();
                            this.notificationSubscription = null;
                        }
                        reactionRef.dispose();
                    }
                }
            );
        }
    }

    @action destroy() {
        if (this.notificationSubscription) {
            this.notificationSubscription.unsubscribe();
            this.notificationSubscription = null;
        }
        // this.id = null;
        this.toUserId = null; //string
        this.fromUserId = null; //string
        this.fromUser = null; //ScenerUser
        this.status = ScenerNotification.STATUS.PENDING;
        this.type = "ping";
        this.payload = {};
        this.context = null; //string
        this.deleted = 0; //timestamp
        this.created = 0; //timestamp
    }

    init() {
        this.createSubscription();
        return Promise.resolve(this);
    }

    @computed get userHash() {
        return Conversation.generateUserIdHash([this.fromUserId, this.toUserId]);
    }

    @action setProps(props) {
        if (props.id != this.id && props.id) {
            this.id = props.id;
        }

        if (props.fromUser && props.fromUser.id && this.fromUserId != props.fromUser.id) {
            this.setFromUser(props.fromUser);
        }

        if (props.toUser && props.toUser.id && this.toUserId != props.toUser.id) {
            this.setToUser(props.toUser);
        }

        if (props.status) {
            this.status = props.status;
        }
        if (props.fromUserId != this.fromUserId && props.fromUserId) {
            this.fromUserId = props.fromUserId;
            if (this.fromUserId != "system") {
                global.scener.userStore
                    .get({ id: this.fromUserId })
                    .then((user) => {
                        this.setFromUser(user);
                    })
                    .catch(() => {
                        this.setProps({ status: "deleted" });
                    });
            }
        }

        if (props.toUserId != this.toUserId && props.toUserId) {
            this.toUserId = props.toUserId;
            if (this.toUserId != "system") {
                global.scener.userStore
                    .get({ id: this.toUserId })
                    .then((user) => {
                        this.setToUser(user);
                    })
                    .catch((e_) => {
                        this.setProps({ status: "deleted" });
                    });
            }
        }

        if (props.type) {
            this.type = props.type;
        }
        if (props.payload) {
            this.payload = props.payload;
        }
        if (props.context) {
            this.context = props.context;
        }
        if (props.deleted) {
            this.deleted = props.deleted;
        }
        if (props.created) {
            this.created = props.created;
        }
    }

    @action setFromUser(user) {
        this.fromUser = user;
    }

    @action setToUser(user) {
        this.toUser = user;
    }

    async send() {
        let notificationParams = {
            toUserId: this.toUserId,
            type: this.type
        };
        if (this.context) {
            notificationParams.contextData = this.context;
        }
        if (this.payload) {
            notificationParams.payload = JSON.stringify(this.payload);
        }
        let res = await global.scener.client.mutate({
            mutation: Mutations.createNotification,
            variables: {
                notification: notificationParams
            }
        });
        if (res.data.createNotification) {
            this.setProps(res.data.createNotification);
            if (this.type !== "ping") {
                this.createSubscription();
            }
            return this;
        } else {
            return Promise.reject(res.errors);
        }
    }

    @action async sendResponse(status, contextData) {
        if (this.type != "message" && this.id) {
            this.setProps({ status: status, context: contextData });
            let res = await global.scener.client.mutate({
                mutation: Mutations.updateNotificationStatus,
                variables: {
                    notificationId: this.id,
                    status: status,
                    contextData: contextData
                },
                optimisticResponse: {
                    updateNotificationStatus: Object.assign({}, this.toJson(), { status: status, context: contextData })
                }
            });
            if (res.data.updateNotificationStatus) {
                this.setProps(res.data.updateNotificationStatus);
                return this;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            this.setProps({ status: this.type == "message" ? "deleted" : status });
        }
    }

    createSubscription() {
        if (this.id) {
            if (!this.notificationSubscription) {
                this.notificationSubscription = global.scener.client
                    .subscribe({
                        query: Subscriptions.onUpdatedNotification,
                        variables: {
                            id: this.id
                        }
                    })
                    .subscribe((response) => {
                        if (response.data && response.data.updatedNotification) {
                            this.setProps(response.data.updatedNotification);
                        }
                    });
            }
        }
    }

    compare(otherNotification) {
        if (this.status == otherNotification.status) {
            return otherNotification.created - this.created;
        }
        if (this.status == "pending" || this.status == "viewed") {
            return -1;
        }
        if (otherNotification.status == "pending" || otherNotification.status == "viewed") {
            return 1;
        }
        return otherNotification.created - this.created;
    }

    @computed get isResolved() {
        return this.status == "accepted" || this.status == "rejected";
    }

    @computed get acceptButtonText() {
        let userToDisplay = null;
        if (this.toUserId == global.scener.user.id) {
            userToDisplay = this.fromUser;
        } else {
            userToDisplay = this.toUser;
        }
        if (this.type == "followRequest") {
            switch (this.status) {
                case "accepted": {
                    return userToDisplay && userToDisplay.relationship.towards == "following" ? "Friends" : "Add Friend";
                }
                case "rejected": {
                    return "BLOCK?";
                }
                default: {
                    return "ACCEPT";
                }
            }
        } else if (this.type == "message") {
            return "VIEW";
        } else {
            return null;
        }
    }

    @computed get rejectButtonText() {
        if (this.type == "followRequest") {
            switch (this.status) {
                case "accepted": {
                    return null;
                }
                case "rejected": {
                    return "IGNORED";
                }
                default: {
                    return "IGNORE";
                }
            }
        } else if (this.type == "message") {
            return "IGNORE";
        } else {
            return null;
        }
    }

    @computed get displayContent() {
        if (this.type == "followRequest") {
            switch (this.status) {
                case "accepted": {
                    return this.fromUserId == global.scener.user.id ? ` accepted your friend request.` : "";
                }
                case "rejected": {
                    return null;
                }
                default: {
                    return ` wants to be your friend.`;
                }
            }
        } else if (this.type == "message") {
            return this.payload;
        } else if (this.type == "followRequest-acceptance") {
            return `accepted your friend request.`;
        } else {
            return null;
        }
    }

    toJson() {
        return {
            context: this.context,
            created: this.created,
            deleted: this.deleted,
            fromUserId: this.fromUserId,
            id: this.id,
            payload: this.payload,
            status: this.status,
            toUserId: this.toUserId,
            type: this.type,
            __typename: "Notification"
        };
    }
}
