/*global scener*/

import { computed, action, reaction } from "mobx";
import { ScenerNotification } from "../notification.model";
import { Queries, Subscriptions } from ".././api";
import DataStore from "./data-store";

export class NotificationStore extends DataStore {
    statusChangeSubscriptions = {};

    constructor() {
        super(ScenerNotification);
    }

    add(notification) {
        return super.add(notification).then((n) => {
            if (!this.statusChangeSubscriptions[n.id]) {
                this.statusChangeSubscriptions[n.id] = reaction(
                    () => n.status,
                    (status, reactionRef) => {
                        this.notificationStatusChanged(n, status, reactionRef);
                    }
                );
            }
            return n;
        });
    }

    get(notificationData) {
        return super.get(notificationData).then((n) => {
            if (n) {
                if (!this.statusChangeSubscriptions[n.id]) {
                    this.statusChangeSubscriptions[n.id] = reaction(
                        () => n.status,
                        (status, reactionRef) => {
                            this.notificationStatusChanged(n, status, reactionRef);
                        }
                    );
                }
            }
            return n;
        });
    }

    clear() {
        if (this.notificationSubscription) {
            this.notificationSubscription.unsubscribe();
            this.notificationSubscription = null;
        }

        for (let k in this.statusChangeSubscriptions) {
            if (typeof this.statusChangeSubscriptions[k] == "function") {
                this.statusChangeSubscriptions[k]();
            }
        }
        this.statusChangeSubscriptions = {};
        super.clear();
    }

    init() {
        global.scener.client
            .query({
                query: Queries.getNotificationsToUser,
                variables: {
                    userId: global.scener.user.id
                },
                fetchPolicy: "network-only"
            })
            .then(({ data }) => {
                data ? this.onNotificationsQueryChange(data.NotificationsToUser) : null;
            });
        global.scener.client
            .query({
                query: Queries.getNotificationsFromUser,
                variables: {
                    userId: global.scener.user.id
                },
                fetchPolicy: "network-only"
            })
            .then(({ data }) => {
                data ? this.onNotificationsQueryChange(data.NotificationsFromUser) : null;
            });
        this.subscribeToNotifications();
        this.setInitialized(true);

        // this.fetch(true);
    }

    fetch(force) {
        if (force) {
            this.notificationsToQuery.setOptions({ fetchPolicy: "network-only" });
            this.notificationsFromQuery.setOptions({ fetchPolicy: "network-only" });
        } else {
            this.notificationsToQuery.setOptions({ fetchPolicy: "cache-only" });
            this.notificationsFromQuery.setOptions({ fetchPolicy: "cache-only" });
        }
        this.notificationsToQuery.refetch();
        this.notificationsFromQuery.refetch();
    }

    onNotificationsQueryChange(notifications) {
        if (notifications) {
            return Promise.all(
                notifications.map((n) => {
                    return this.get(n);
                })
            );
        }
    }

    subscribeToNotifications() {
        if (global.scener.user.id) {
            if (!this.notificationSubscription) {
                this.notificationSubscription = global.scener.client
                    .subscribe({
                        query: Subscriptions.onCreatedNotificationToUser,
                        variables: {
                            toUserId: global.scener.user.id
                        }
                    })
                    .subscribe((response) => {
                        if (response.data && response.data.createdNotification) {
                            let { createdNotification } = response.data;
                            switch (createdNotification.type) {
                                case "conversation-created": {
                                    if (createdNotification.context) {
                                        global.scener.user.conversationStore.get({ id: createdNotification.context }).then((convo) => {
                                            if (convo) {
                                                convo.didViewCurrentMessages(0);
                                                convo.parseMessage({ author: createdNotification.fromUserId, body: createdNotification.payload }).then((msg) => {
                                                    if (msg) {
                                                        this.add({
                                                            type: "message",
                                                            id: Math.round(performance.now()) + "_conversationCreated",
                                                            payload: msg.body,
                                                            context: convo.id,
                                                            fromUserId: createdNotification.fromUserId,
                                                            toUserId: global.scener.user.id,
                                                            deleted: 0,
                                                            status: "pending",
                                                            created: Date.now() / 1000
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    break;
                                }
                                case "invitation-accepted": {
                                    global.scener.userStore.get({ id: createdNotification.fromUserId }).then((user) => {
                                        if (user) {
                                            user.setProps({
                                                relationship: {
                                                    towards: "following",
                                                    from: "following"
                                                }
                                            });
                                            global.scener.user.addUserToFollowing(user);
                                        }
                                    });
                                    break;
                                }
                                case "conversation-room-activated": {
                                    global.scener.user.conversationStore.get({ id: createdNotification.context }).then((conversation) => {
                                        if (conversation) {
                                            conversation.setProps({ activeRoomSid: createdNotification.payload });
                                        }
                                    });
                                    break;
                                }
                                case "conversation-room-deactivated": {
                                    global.scener.user.conversationStore.get({ id: createdNotification.context }).then((conversation) => {
                                        if (conversation) {
                                            conversation.setProps({ activeRoomSid: null });
                                        }
                                    });
                                    break;
                                }
                                case "relationship-changed": {
                                    global.scener.userStore.get({ id: createdNotification.fromUserId }).then((u) => {
                                        if (u) {
                                            u.fetch(true);
                                            global.scener.user.addUserToFollowing(u);
                                        }
                                    });
                                    break;
                                }
                                default: {
                                    // this.get(createdNotification);
                                }
                            }
                        }
                    });
            }
        }
    }

    @action async notificationStatusChanged(notification, status, reactionRef) {
        switch (notification.type) {
            case "followRequest": {
                if (status === ScenerNotification.STATUS.ACCEPTED) {
                    let user = await global.scener.userStore.get({ id: notification.toUserId });
                    user.setProps({
                        relationship: {
                            from: user.relationship.from,
                            towards: "following"
                        }
                    });
                    //user.writeUserToCache();
                    global.scener.user.addUserToFollowing(user);

                    reactionRef.dispose();
                } else if (status == ScenerNotification.STATUS.REJECTED) {
                    let user = await global.scener.userStore.get({ id: notification.toUserId });
                    user.setProps({
                        relationship: {
                            from: user.relationship.from,
                            towards: "none"
                        }
                    });
                    reactionRef.dispose();
                } else if (status !== ScenerNotification.STATUS.VIEWED && status !== ScenerNotification.STATUS.PENDING) {
                    reactionRef.dispose();
                }
                break;
            }
        }
    }

    @computed get notifications() {
        let notesTo = this.notificationsTo
            .filter((n) => {
                return n.status !== "deleted" && n.type !== "message";
            })
            .slice();
        let notesFrom = this.notificationsFrom
            .filter((n) => {
                return n.status == "accepted";
            })
            .slice();
        let combined = [...notesTo, ...notesFrom];
        return combined.filter((n) => {
            return (
                combined.filter((other) => {
                    return n.userHash == other.userHash && n.type == other.type && n.id != other.id && other.fromUserId == global.scener.user.id;
                }).length == 0
            );
        });
    }

    @computed get notificationsTo() {
        return this.values.filter((n) => {
            return n.toUserId == global.scener.user.id;
        });
    }

    @computed get notificationsFrom() {
        return this.values.filter((n) => {
            return n.fromUserId == global.scener.user.id;
        });
    }

    @computed get newNotifications() {
        return this.notificationsTo
            .filter((n) => {
                return n.status === "pending";
            })
            .slice()
            .sort((a, b) => {
                return a.compare(b);
            });
    }

    @computed get pendingNotifications() {
        return this.notificationsTo
            .filter((n) => {
                return (n.status === "pending" || n.status == "viewed") && n.type == "followRequest";
            })
            .slice()
            .sort((a, b) => {
                return a.compare(b);
            });
    }
}
