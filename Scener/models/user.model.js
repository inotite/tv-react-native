import { observable, computed, action, toJS } from "mobx";
import { Mutations, Queries, Subscriptions, Fragments } from "./api";
import { UserActivity } from "./userActivity.model";
import { ConversationStore } from "./data-store/ConversationStore";
import { NotificationStore } from "./data-store/NotificationStore";
import { SuggestionStore } from "./data-store/SuggestionStore";
import { ScenerContent } from "./content.model";
import { ScenerNotification } from "./notification.model";
import { handleException } from "../utils/errors";
import { AsyncStorage } from "react-native";

//import { Conversation } from "./conversation.model";
//import { Conversation } from "./conversation.model";

/*global scener*/
//import { ScenerPartyController } from "../components/commentary/party/party.controller";

export class ScenerUser {
    @observable id = null; //string
    @observable username = ""; //string
    @observable name = ""; //string
    @observable firstName = ""; //string
    @observable lastName = ""; //string
    @observable email = ""; //string
    @observable phone = ""; //string
    @observable countryCode = ""; //string
    @observable imageThumbUrl = ""; //string
    @observable imageLargeUrl = ""; //string
    @observable coverLargeUrl = ""; //string
    @observable coverSmallUrl = ""; //string
    @observable token = null; //string
    @observable relationship = { from: "", towards: "" }; //bool - actually a boolean in real life
    @observable private = 0;
    @observable followingList = [];
    @observable blockedList = [];
    @observable pendingList = [];
    @observable requestedList = [];

    @observable connectedUsers = {};

    @observable permissions = "";
    @observable externalAccounts = {};

    @observable about = ""; //string
    @observable website = ""; //string
    @observable twitterUsername = ""; //string
    @observable instagramUsername = ""; //string
    //Conversations
    //@observable conversations = [];
    @observable conversationStore;
    @observable notificationStore;
    @observable suggestionStore;

    //Activity
    @observable activity = new UserActivity();
    @observable watchActivity = [];

    @observable invitation = null;

    //Loading indicator
    @observable busy = true;

    constructor(props) {
        this.conversationStore = new ConversationStore();
        this.notificationStore = new NotificationStore();
        this.suggestionStore = new SuggestionStore();

        props ? this.setProps(props) : null;
    }

    @action destroy() {
        this.stopOnlineStatusBeacon();

        // this.id = null;
        this.username = ""; //string
        this.name = ""; //string
        this.email = ""; //string
        this.firstName = ""; //string
        this.lastName = ""; //string
        this.phone = ""; //string
        this.countryCode = ""; //string
        this.imageThumbUrl = ""; //string
        this.imageLargeUrl = ""; //string
        this.coverLargeUrl = ""; //string
        this.coverSmallUrl = ""; //string

        this.about = ""; //string
        this.website = ""; //string
        this.twitterUsername = ""; //string
        this.instagramUsername = ""; //string

        this.relationship = { from: "", towards: "" }; //bool - actually a boolean in real life
        this.private = 0;
        if (this.id == global.scener.user.id) {
            /*   this.followingList.forEach(u =>
               {
                   u.destroy();
               });
               this.blockedList.forEach(u =>
               {
                   u.destroy();
               });*/
        }
        this.followingList = [];

        this.blockedList = [];
        this.externalAccounts = {};
        this.conversationStore.clear();
        this.notificationStore.clear();
        this.suggestionStore.clear();
        this.activity.destroy();
        this.busy = false;
    }

    @action setBusy(b) {
        this.busy = b;
    }

    @action setPermissions(b) {
        this.permissions = b;
        //this.permissions.push(b);
        //this.permissions = this.permissions.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
    }

    @computed get avatarColor() {
        let colorlist = [
            "DarkRed",
            "orange",
            "RoyalBlue",
            "Indigo",
            "purple",
            "DarkGreen",
            "DarkViolet",
            "black",
            "brown",
            "DarkCyan",
            "LightCoral",
            "Chocolate",
            "IndianRed",
            "DarkSlateGray",
            "DimGray",
            "Olive",
            "SeaGreen",
            "DodgerBlue",
            "GoldenRod",
            "Green"
        ];

        let userColor = "transparent";

        if (this.id) {
            const alphaVal = parseInt(this.id.replace(/[-]/g, ""), 36);
            userColor = colorlist[parseInt(alphaVal) % (colorlist.length - 1)];
        }

        return userColor;
    }

    @computed get defaultPhoto() {
        return this.imageLargeUrl && this.imageLargeUrl.includes("profile-default")
            ? ""
            : this.imageLargeUrl;
    }

    @computed get loggedIn() {
        //bool
        const { token, id } = this;
        let res = !!token && !!id;

        return res;
    }

    @action setProps(props) {
        if (typeof props.id !== "undefined") {
            this.id = props.id;
        }

        if (props.username) {
            this.username = props.username;
        }
        if (props.name) {
            this.name = props.name;
        }
        if (props.firstName) {
            this.firstName = props.firstName;
        }
        if (props.lastName) {
            this.lastName = props.lastName;
        }
        if (props.email) {
            this.email = props.email;
        }
        if (props.phone) {
            this.phone = props.phone;
        }
        if (props.countryCode) {
            this.countryCode = props.countryCode;
        }

        if (props.hasOwnProperty("about")) {
            this.about = props.about;
        }
        if (props.hasOwnProperty("website")) {
            this.website = props.website;
        }
        if (props.hasOwnProperty("twitterUsername")) {
            this.twitterUsername = props.twitterUsername;
        }
        if (props.hasOwnProperty("instagramUsername")) {
            this.instagramUsername = props.instagramUsername;
        }

        if (props.imageLargeUrl) {
            this.imageLargeUrl = props.imageLargeUrl;
        }
        if (props.imageThumbUrl) {
            this.imageThumbUrl = props.imageThumbUrl;
        }
        if (props.coverLargeUrl) {
            this.coverLargeUrl = props.coverLargeUrl;
        }
        if (props.coverSmallUrl) {
            this.coverSmallUrl = props.coverSmallUrl;
        }
        if (props.externalAccounts) {
            this.externalAccounts = props.externalAccounts;
        }
        if (typeof props.private !== "undefined") {
            this.private = props.private;
        }

        if (props.relationship) {
            this.relationship = props.relationship;
        }
        if (props.token && this.token != props.token) {
            this.token = props.token;
        }
        if (this.loggedIn) {
            this.setBusy(true);
            this.initFollowing();
            this.initBlocked();
            this.conversationStore.init();
            this.notificationStore.init();
            this.suggestionStore.init();

            if (this.id != this.activity.userId) {
                this.activity.setProps({ userId: this.id });
                this.activity.fetch();
            }
        } else {
            if (props.activity) {
                this.activity.setProps(props.activity);
            } else if (this.activity.userId == null) {
                this.activity.setProps({ userId: this.id });
            }

            if (this.relationship.towards == "following") {
                this.activity.subscribeToChanges();
            }
        }
    }

    @action setInvitation(inv) {
        this.invitation = inv;
    }

    @computed get blockedIdList() {
        return this.blocked.map(function(bu) {
            return bu.id;
        });
    }

    @computed get isPrivate() {
        return (
            !this.loggedIn &&
            this.private &&
            (!this.relationship || this.relationship.towards != "following")
        );
    }

    static async isUnique(searchTerm, field) {
        let resp = await global.scener.client.query({
            query: Queries.IsUniqueUser,
            variables: {
                searchString: searchTerm,
                field: field
            },
            fetchPolicy: "network-only"
        });

        return resp.data.IsUniqueUser;
    }

    static async search(searchTerm) {
        let response = await global.scener.client.query({
            query: Queries.searchUsers,
            variables: {
                searchTerm: searchTerm
            },
            fetchPolicy: "network-only"
        });
        if (response.data.UserSearch) {
            let results = await Promise.all(
                response.data.UserSearch.filter((u) => u.id != global.scener.user.id).map((u) => {
                    let userToAdd = new ScenerUser(u);
                    return global.scener.userStore.get(userToAdd);
                })
            );

            return results;
        } else {
            throw new DOMException("NO_DATA");
        }
    }

    @action setToken(tok) {
        this.token = tok;
    }

    @action setQueue(q) {
        this.queue = q;
    }

    @action addToQueue(com) {
        this.queue[com.id] = com;
    }

    @action deleteFromQueue(com) {
        delete this.queue[com.id];
    }

    async signin(loginId, password) {
        let variables = {
            creds: {
                loginId: loginId,
                password: password
            }
        };
        let response = await global.scener.client.query({
            query: Queries.signin,
            fetchPolicy: "network-only",
            variables
        });
        console.log(response);
        if (response.data.UserSignIn) {
            this.setProps(response.data.UserSignIn);
            return response.UserSignIn;
        }
    }

    auth() {
        console.log("authing", this.token);
        return global.scener.client
            .query({
                query: Queries.authUser,
                fetchPolicy: "network-only"
            })
            .then(({ data, errors }) => {
                if (data.User) {
                    this.setProps(data.User);
                    return this;
                } else {
                    console.log("errrors", errors);
                    return this;
                }
            })
            .catch((e) => {
                console.log(e);
                return this;
            });
    }

    async init() {
        let params = {
            query: Queries.getUser,
            variables: {
                userId: this.id
            },
            fetchPolicy: "cache-only"
        };
        let response = await global.scener.client.query(params);
        if (response.data.User) {
            this.setProps(response.data.User);
            return this;
        } else {
            return this.fetch(true);
        }
    }

    async fetch(force = false) {
        let params = {
            query: Queries.getUser,
            variables: {
                userId: this.id
            }
        };
        if (force) {
            params.fetchPolicy = "network-only";
        }
        let response = await global.scener.client.query(params);
        if (response.data.User) {
            this.setProps(response.data.User);
            await this.writeToCache();
            return this;
        } else {
            // Sentry.addBreadcrumb({ message: "Could not find user with id=" + this.id });
            return null;
        }
    }

    @action async requestFollow(userIds) {
        let uid = this.id; //save a local copy of user id so it doesn't get cleared out from under us before the async mutation executes

        if (uid) {
            let user = await global.scener.userStore.get({ id: userIds[0] });
            let prevRelationship = user.relationship.towards;

            user.setProps({
                relationship: {
                    from: user.relationship.from,
                    towards: "requested"
                }
            });
            try {
                let notification = new ScenerNotification({
                    toUserId: userIds[0],
                    fromUserId: global.scener.user.id,
                    type: "followRequest"
                });
                await notification.send();
                global.scener.user.notificationStore.add(notification);

                if (notification.status == "pending" || notification.status == "viewed") {
                    user.setProps({
                        relationship: {
                            from: user.relationship.from,
                            towards: "requested"
                        }
                    });
                }
            } catch (e) {
                user.setProps({
                    relationship: {
                        from: user.relationship.from,
                        towards: prevRelationship
                    }
                });
                this.followUser(userIds);
                throw e;
            }
        }
    }

    @action async followUser(userIds) {
        let uid = this.id; //save a local copy of user id so it doesn't get cleared out from under us before the async mutation executes

        if (uid) {
            //modify the cloud so others will know we are now online
            let res = await global.scener.client.mutate({
                mutation: Mutations.updateUserRelationship,
                variables: {
                    userId: userIds,
                    status: "following"
                }
            });
            if (res.data.updateUserRelationship) {
                //array of followed users
                let results = res.data.updateUserRelationship;
                for (let i = 0; i < results.length; i++) {
                    let user = await global.scener.userStore.get({ id: results[i].id });
                    user.setProps({
                        relationship: {
                            from: results[i].relationship.from,
                            towards: results[i].relationship.towards
                        }
                    });
                    this.addUserToFollowing(user);
                    /* mixpanel.track("Add Friend Clicked", {
                        status: results[i].relationship.towards,
                        username: user.username
                    });*/
                }

                return res.data.updateUserRelationship;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            console.warn("user follow called with invalid UserID.  User id is required.");
        }
    }

    @action async unfollowUser(userIds) {
        //

        let uid = this.id; //save a local copy of user id so it doesn't get cleared out from under us before the async mutation executes

        if (uid) {
            //modify the cloud so others will know we are now online
            let res = await global.scener.client.mutate({
                mutation: Mutations.updateUserRelationship,
                variables: {
                    userId: userIds,
                    status: "none"
                }
            });
            if (res.data.updateUserRelationship) {
                let results = res.data.updateUserRelationship;
                for (let i = 0; i < results.length; i++) {
                    let user = await global.scener.userStore.get({ id: results[i].id });
                    user.setProps({
                        relationship: {
                            from: results[i].relationship.from,
                            towards: results[i].relationship.towards
                        }
                    });
                    if (user.relationship.towards == "following") {
                        this.addUserToFollowing(user);
                    }
                }
                //  this.writeFollowingToCache();
                return res.data.updateUserRelationship;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            console.warn("user unfollow called with invalid UserID.  User id is required.");
        }
    }

    async blockUser(
        userIds //userIds: array of user ids
    ) {
        //

        let uid = this.id; //save a local copy of user id so it doesn't get cleared out from under us before the async mutation executes

        if (uid) {
            //modify the cloud so others will know we are now online
            let res = await global.scener.client.mutate({
                mutation: Mutations.updateUserRelationship,
                variables: {
                    userId: userIds,
                    status: "blocked"
                }
            });
            if (res.data.updateUserRelationship) {
                //array of blocked users
                let results = res.data.updateUserRelationship;
                for (let i = 0; i < results.length; i++) {
                    let user = await global.scener.userStore.get({ id: results[i].id });
                    user.setProps({
                        relationship: {
                            from: results[i].relationship.from,
                            towards: results[i].relationship.towards
                        }
                    });
                    this.addUserToBlocked(user);
                }

                return res.data.updateUserRelationship;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            console.warn("user block called with invalid UserID.  User id is required.");
        }
    }

    update(newProps) {
        if (this.id == global.scener.user.id) {
            this.setProps(newProps);
            global.scener.client.mutate({
                mutation: Mutations.updateUser,
                variables: {
                    user: newProps
                }
            });
        }
    }

    // =========== User Activity ===============

    @action setVisible(vis) {
        let uid = this.id;

        if (uid && this.loggedIn) {
            this.activity.setProps({
                contentId: this.activity.contentId,
                contentTimeline: this.activity.contentTimeline,
                playing: this.activity.playing,
                visible: vis,
                onlineStatus: this.activity._onlineStatus
            });
            this.updateActivity();
            //
            /*global.scener.client.mutate({
                mutation: Mutations.updateVisibility,
                variables: {
                    visibilityInput: {
                        userId: uid,
                        visible: vis ? 1 : 0
                    }
                }
            });*/
        } else {
            console.warn("user SetStatus called with invalid UserID.  User id is required.");
        }
    }

    @action setStatus(
        stat //status: int 0==offline, non-zero == online
    ) {
        //

        let uid = this.id; //save a local copy of user id so it doesn't get cleared out from under us before the async mutation executes

        if (uid) {
            this.activity.setProps({
                contentId: this.activity.contentId,
                contentTimeline: this.activity.contentTimeline,
                playing: this.activity.playing,
                visible: this.activity.visible,
                onlineStatus: stat
            });
            //modify the cloud so others will know we are now online
            global.scener.client.mutate({
                mutation: Mutations.updateOnlineStatus,
                variables: {
                    statusInput: {
                        userId: uid,
                        status: stat
                    }
                }
            });
        } else {
            console.warn(
                `user SetStatus called with invalid UserID '${uid}'.  User id is required.`
            );
        }
    }

    @action setLocation(geohash) {
        if (this.id && this.loggedIn) {
            this.activity.setProps({
                contentId: this.activity.contentId,
                contentTimeline: this.activity.contentTimeline,
                playing: this.activity.playing,
                visible: this.activity.visible,
                onlineStatus: this.activity._onlineStatus,
                location: geohash
            });
            global.scener.client.mutate({
                mutation: Mutations.updateUserActivity,
                variables: {
                    activity: {
                        userId: this.id,
                        location: geohash
                    }
                }
            });
        }
    }

    @action setContent(
        contentId,
        contentTimeline, //contentTimeline is the current timestamp of the content.
        playing
    ) {
        if (this.id && this.loggedIn) {
            this.activity.setProps({
                contentId: contentId,
                contentTimeline: contentTimeline,
                playing: playing,
                visible: this.activity.visible,
                onlineStatus: this.activity._onlineStatus
            });
            //modify the cloud so others will know we are now online
            global.scener.client.mutate({
                mutation: Mutations.updateUserActivityContent,
                variables: {
                    contentInput: {
                        userId: this.id,
                        contentId: contentId,
                        contentTimeline: contentTimeline,
                        playing: playing
                    }
                }
            });
        }
    }

    updateActivity() {
        if (this.id && this.loggedIn) {
            this.activity.computeActivity();
            this.activity.pushToServer();
        }
    }

    startOnlineStatusBeacon() {
        if (this.onlineStatusBeacon) {
            clearInterval(this.onlineStatusBeacon);
            this.onlineStatusBeacon = null;
        }
        this.onlineStatusBeacon = setInterval(() => {
            this.updateActivity();
        }, 5000);
    }

    stopOnlineStatusBeacon() {
        clearInterval(this.onlineStatusBeacon);
        this.onlineStatusBeacon = null;
    }

    //==========================  Following ============================

    async fetchBlocked(force) {
        let params = {
            query: Queries.getBlocked,
            variables: {
                userId: this.id
            }
        };
        if (force) {
            params.fetchPolicy = "network-only";
        }
        let response = await global.scener.client.query(params);

        return response.data;
    }

    async initBlocked() {
        //
        let params = {
            query: Queries.getBlocked,
            variables: {
                userId: this.id
            },
            fetchPolicy: "network-only"
        };
        let response = await global.scener.client.query(params);
        //
        if (response.data) {
            this.onBlockedData(response);
            setTimeout(() => {
                this.fetchBlocked(true);
            }, 1000);

            return this;
        } else {
            return this.fetchBlocked(true);
        }
    }

    async initFollowingForOtherUser() {
        let params = {
            query: Queries.getFollowing,
            variables: {
                userId: this.id
            },
            fetchPolicy: "network-only"
        };
        let response = await global.scener.client.query(params);
        //
        if (response.data) {
            this.setFollowing(response.data.Following);

            return this;
        }
    }

    async initWatchActivity() {
        let params = {
            query: Queries.getWatchActivity,
            variables: {
                userId: this.id
            },
            fetchPolicy: "network-only"
        };
        let response = await global.scener.client.query(params);
        //
        if (response.data) {
            this.setWatchActivity(response.data.WatchActivity);
            return this;
        }
    }

    @action setWatchActivity(list) {
        if (list) {
            let result = {};
            list.forEach((a) => {
                if (a) {
                    if (!result[a.content.title] || result[a.content.title].updated < a.updated) {
                        result[a.content.title] = {
                            type: "watched",
                            content: new ScenerContent(a.content),
                            updated: a.updated
                        };
                    }
                }
            });
            this.watchActivity = Object.values(result).sort((a, b) => b.updated - a.updated);
        }
    }

    @action deleteWatchActivity({ content }) {
        this.watchActivity = this.watchActivity.slice().filter((a) => a.content.id != content.id);

        global.scener.client
            .mutate({
                mutation: Mutations.deleteWatchActivity,
                variables: {
                    userId: this.id,
                    contentIds: [content.id]
                }
            })
            .then(({ data }) => {
                return console.log(data);
            });
    }

    @action deleteAllWatchActivity() {
        let contentids = this.watchActivity.map(function(wa) {
            return wa.content.id;
        });

        global.scener.client
            .mutate({
                mutation: Mutations.deleteWatchActivity,
                variables: {
                    userId: this.id,
                    contentIds: contentids
                }
            })
            .then(({ data }) => {
                return console.log(data);
            });

        this.watchActivity = [];
    }

    /*async*/
    initFollowing() {
        this.fetchPendingAndRequested();
        return this.fetchFollowing(true);
    }

    async fetchFollowing(force) {
        let params = {
            query: Queries.getFollowing,
            variables: {
                userId: this.id
            }
        };
        if (force) {
            params.fetchPolicy = "network-only";
        }
        let response = await global.scener.client.query(params);
        if (response.data) {
            this.onFollowingData(response);

            return this;
        }
    }

    async fetchPendingAndRequested(force = true) {
        let params = {
            query: Queries.getPendingAndRequested,
            variables: {
                userId: this.id
            }
        };
        if (force) {
            params.fetchPolicy = "network-only";
        }
        let response = await global.scener.client.query(params);
        if (response.data) {
            this.onPendingAndRequestedData(response.data);

            return this;
        }
    }

    onPendingAndRequestedData({ Requested, Pending }) {
        if (Requested) {
            Requested.map((u) => {
                global.scener.userStore.get(u).then((user) => {
                    this.addUserToRequested(user);
                    return user;
                });
            });
        }
        if (Pending) {
            Pending.map((u) => {
                global.scener.userStore.get(u).then((user) => {
                    this.addUserToPending(user);
                    return user;
                });
            });
        }
    }

    onFollowingData({ data, loading }) {
        if (data && data.Following) {
            if (!loading || !this.followingList.length) {
                let waitForThese = [];
                for (let i in data.Following) {
                    waitForThese.push(
                        global.scener.userStore
                            .get(data.Following[i])
                            .then((u) => {
                                if (u) {
                                    u.setProps(data.Following[i]);
                                    this.addUserToFollowing(u);
                                }
                                return true;
                            })
                            .catch(() => {
                                return true;
                            })
                    );
                }
                return Promise.all(waitForThese).finally(() => {
                    return this.setBusy(false);
                });
            }
        }
    }

    onBlockedData({ data, loading }) {
        if (data && data.Blocked) {
            if (!loading || !this.blockedList.length) {
                let waitForThese = [];
                for (let i in data.Blocked) {
                    waitForThese.push(
                        global.scener.userStore
                            .get(data.Blocked[i])
                            .then((u) => {
                                if (u) {
                                    u.setProps(data.Blocked[i]);
                                    this.addUserToBlocked(u);
                                }
                                return true;
                            })
                            .catch(() => {
                                return true;
                            })
                    );
                }
                return Promise.all(waitForThese).finally(() => {
                    return this.setBusy(false);
                });
            }
        }
    }

    @action addUserToBlocked(user) {
        this.connectedUsers[user.id] = user;
    }

    @action removeUserFromBlocked(user) {
        this.connectedUsers = Object.values(this.connectedUsers).filter((u) => u.id != user.id);
    }

    @action addUserToFollowing(user) {
        this.connectedUsers[user.id] = user;
    }

    @action addUserToPending(user) {
        this.connectedUsers[user.id] = user;
    }

    @action addUserToRequested(user) {
        this.connectedUsers[user.id] = user;
    }

    @action isFollowing(userid) {
        return this.followingList.filter((u) => u.id == userid).length > 0;
    }

    @action removeUserFromFollowing(user) {
        this.followingList = this.followingList.filter((u) => u.id != user.id);
    }

    @action async setFollowing(list) {
        list = await Promise.all(
            list.map((f) => {
                return global.scener.userStore.get(f);
            })
        );
        this.followingList = list;
    }

    @computed.struct get suggestions() {
        return this.suggestionStore.suggestions;
    }

    @computed.struct get friends() {
        if (this.loggedIn) {
            return Object.values(this.connectedUsers).filter(
                (u) => u.relationship.towards == "following"
            );
        } else {
            return this.followingList;
        }
    }

    @computed.struct get following() {
        if (this.loggedIn) {
            return Object.values(this.connectedUsers).filter(
                (u) => u.relationship.towards == "following"
            );
        } else {
            return this.followingList;
        }
    }

    @computed.struct get pending() {
        return Object.values(this.connectedUsers).filter((u) => u.relationship.from == "requested");
    }

    @computed.struct get requested() {
        return Object.values(this.connectedUsers).filter(
            (u) => u.relationship.towards == "requested"
        );
    }

    @computed.struct get blocked() {
        return Object.values(this.connectedUsers).filter(
            (u) => u.relationship.towards == "blocked"
        );
    }

    subscribeToChanges() {
        if (this.id && this.id !== global.scener.user.id) {
            if (!this.changesSubscription) {
                this.changesSubscription = global.scener.client
                    .subscribe({
                        query: Subscriptions.onUpdatedUser,
                        variables: {
                            userId: this.id
                        }
                    })
                    .subscribe((response) => {
                        if (response.data && response.data.updatedUser) {
                            this.setProps(response.data.updatedUser);
                        }
                    });
            }
        }
    }

    //==========================  External Accounts (FB, TWITTER, ETC.) ============================
    async linkExternalAccount(extAccountInfo) {
        if (this.loggedIn) {
            let response = await global.scener.client.mutate({
                mutation: Mutations.linkExternalAccount,
                variables: {
                    extAccount: {
                        userId: this.id,
                        externalAccount: extAccountInfo
                    }
                }
            });

            if (response.data.linkExternalAccount) {
                this.setProps(response.data.linkExternalAccount);
            }
        }
    }

    async unlinkExternalAccount(type) {
        if (this.loggedIn) {
            let response = await global.scener.client.mutate({
                mutation: Mutations.unlinkExternalAccount,
                variables: {
                    userId: this.id,
                    type: type
                }
            });

            if (response.data.unlinkExternalAccount) {
                this.setProps(response.data.unlinkExternalAccount);
            }
        }
    }

    async getFriends() {
        let resp = await global.scener.client.query({
            query: Queries.getFriends,
            variables: {
                userId: this.id
            },
            fetchPolicy: "network-only"
        });
        if (resp.data.Friends) {
            return resp.data.Friends;
        } else {
            return [];
        }
    }

    //==========================  Magic Link Invitations ============================

    async createInvitation(conversationId) {
        if (this.invitation && !conversationId) {
            return this.invitation;
        }
        if (this.loggedIn) {
            let vars = { senderId: this.id };
            if (conversationId) {
                vars.conversationId = conversationId;
            }
            let res = await global.scener.client.mutate({
                mutation: Mutations.createInvitation,
                variables: vars
            });

            if (res.data.createInvitation) {
                if (!conversationId) {
                    this.setInvitation(res.data.createInvitation);
                }
                return res.data.createInvitation;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            return Promise.reject("Not signed in");
        }
    }

    async updateInvitation(invitationId, conversationId) {
        if (this.loggedIn) {
            let res = await global.scener.client.mutate({
                mutation: Mutations.updateInvitation,
                variables: {
                    invitationId: invitationId,
                    conversationId: conversationId
                }
            });

            if (res.data.updateInvitation) {
                if (this.invitation && this.invitation.id == res.data.updateInvitation.id) {
                    this.invitation = null;
                }
                return res.data.updateInvitation;
            } else {
                return Promise.reject(res.errors);
            }
        } else {
            return Promise.reject("Not signed in");
        }
    }

    async acceptInvitation(invitationId) {
        let res = await global.scener.client.mutate({
            mutation: Mutations.acceptInvitation,
            variables: {
                invitationId: invitationId
            }
        });
        if (res.data.acceptInvitation) {
            let user = await global.scener.userStore.get({
                id: res.data.acceptInvitation.senderId
            });
            user.setProps({
                relationship: {
                    towards: "following",
                    from: "following"
                }
            });
            this.addUserToFollowing(user);

            return res.data.acceptInvitation;
        } else {
            return Promise.reject(res.errors);
        }
    }

    uploadProfileImage(file) {
        return fetch(
            `https://gazxilgnyi.execute-api.us-west-2.amazonaws.com/${
                global.scener.env.current == "prod" ? "prod" : "dev"
            }/imageUpload`,
            {
                method: "POST",
                mode: "cors",
                headers: {
                    token: global.scener.user.token
                },
                body: file
            }
        )
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                console.log(data);
                /* let loadingWaiters = [];
                for (let k in data) {
                    if (data[k]) {
                        loadingWaiters.push(ScenerUtils.preloadImage(data[k]));
                    }
                }
                return Promise.all(loadingWaiters).then(() => {
                    this.setProps(data);
                });*/
                return data;
            })
            .catch((e) => {
                return handleException(e);
            });
    }

    dataForCache(following) {
        if (!following) {
            return {
                id: this.id,
                name: this.name,
                username: this.username,
                imageThumbUrl: this.imageThumbUrl,
                coverSmallUrl: this.coverSmallUrl,
                imageLargeUrl: this.imageLargeUrl,
                private: this.private,
                externalAccounts: {
                    facebook: !!this.externalAccounts.facebook,
                    twitter: !!this.externalAccounts.twitter,
                    __typename: "ExternalAccountMap"
                },
                relationship: {
                    ...this.relationship,
                    userId: null,
                    __typename: "UserRelationship"
                },
                __typename: "User"
            };
        } else {
            return {
                id: this.id,
                name: this.name,
                username: this.username,
                imageThumbUrl: this.imageThumbUrl,
                coverSmallUrl: this.coverSmallUrl,
                imageLargeUrl: this.imageLargeUrl,
                private: this.private,
                relationship: {
                    ...this.relationship,
                    userId: null,
                    __typename: "UserRelationship"
                },
                __typename: "User"
            };
        }
    }

    writeUserToCache() {
        this.writeUserInfoToCache();
        this.writeUserRelationshipToCache();
    }

    writeUserInfoToCache() {
        let frag = Fragments.UserInfo;

        global.scener.client.writeFragment({
            fragment: frag,
            id: this.id,
            data: {
                id: this.id,
                name: this.name,
                firstName: this.firstName,
                lastName: this.lastName,
                username: this.username,
                about: this.about,
                website: this.website,
                twitterUsername: this.twitterUsername,
                instagramUsername: this.instagramUsername,
                imageThumbUrl: this.imageThumbUrl,
                coverSmallUrl: this.coverSmallUrl,
                imageLargeUrl: this.imageLargeUrl,
                private: this.private,
                __typename: "User"
            }
        });
    }

    writeUserRelationshipToCache() {
        let frag = Fragments.RelationshipFields;

        global.scener.client.writeFragment({
            fragment: frag,
            fragmentName: "UserRelationshipFields",
            id: this.id,
            data: {
                relationship: {
                    ...this.relationship,
                    userId: null,
                    __typename: "UserRelationship"
                },
                __typename: "User"
            }
        });
    }

    writeFollowingToCache() {
        //
        let query = Queries.getFollowing;

        global.scener.client.writeFragment({
            query,
            data: {
                Following: this.followingList.map((u) => {
                    return u.dataForCache(true);
                })
            }
        });
    }

    writeToCache() {
        return AsyncStorage.setItem("User:" + this.id, JSON.stringify(this.toJSON()));
    }

    toJSON() {
        return toJS({
            id: this.id,
            name: this.name,
            username: this.username,
            imageThumbUrl: this.imageThumbUrl,
            coverSmallUrl: this.coverSmallUrl,
            imageLargeUrl: this.imageLargeUrl,
            private: this.private,
            activity: this.activity ? this.activity.toJSON() : null,
            externalAccounts: {
                facebook: !!this.externalAccounts.facebook,
                twitter: !!this.externalAccounts.twitter
            },
            relationship: {
                ...this.relationship
            },
            following: this.followingList.map((u) => {
                return { id: u.id };
            })
        });
    }
}
