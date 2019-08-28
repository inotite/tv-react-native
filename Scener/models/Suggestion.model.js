import { observable, action, reaction, computed } from "mobx";
import { Mutations, Subscriptions } from "./api";
import { Conversation } from "./conversation.model";
/*global scener*/
//import { ScenerPartyController } from "../components/commentary/party/party.controller";

export class Suggestion {
    static STATUS = {
        PENDING: "pending",
        VIEWED: "viewed",
        ACCEPTED: "accepted",
        REJECTED: "rejected",
        EXPIRED: "expired",
        DELETED: "deleted"
    };

    id = null; //string
    @observable forUserId = null; //string
    @observable forUser = null;
    @observable relatedUserId = null; //string
    @observable relatedUser = null; //ScenerUser
    @observable status = Suggestion.STATUS.PENDING;
    @observable channelId = null;
    @observable contentId = null;
    @observable seriesId = null;
    type = "ping";
    payload = {};
    context = null; //string
    @observable deleted = 0; //timestamp
    created = 0; //timestamp

    suggestionSubscription = null;

    constructor(props) {
        props ? this.setProps(props) : null;
        if (this.type != "message") {
            reaction(
                () => this.status,
                (status, reactionRef) => {
                    if (
                        status !== Suggestion.STATUS.PENDING &&
                        status !== Suggestion.STATUS.VIEWED
                    ) {
                        if (this.suggestionSubscription) {
                            this.suggestionSubscription.unsubscribe();
                            this.suggestionSubscription = null;
                        }
                        reactionRef.dispose();
                    }
                }
            );
        }
    }

    @action destroy() {
        if (this.suggestionSubscription) {
            this.suggestionSubscription.unsubscribe();
            this.suggestionSubscription = null;
        }
        // this.id = null;
        this.forUserId = null; //string
        this.relatedUserId = null; //string
        this.relatedUser = null; //ScenerUser
        this.status = Suggestion.STATUS.PENDING;
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
        return Conversation.generateUserIdHash([this.relatedUserId, this.forUserId]);
    }

    @action setProps(props) {
        if (props.id != this.id && props.id) {
            this.id = props.id;
        }

        if (
            props.relatedUser &&
            props.relatedUser.id &&
            this.relatedUserId != props.relatedUser.id
        ) {
            this.setRelatedUser(props.relatedUser);
        }

        if (props.forUser && props.forUser.id && this.forUserId != props.forUser.id) {
            this.setForUser(props.forUser);
        }

        if (props.status) {
            this.status = props.status;
        }
        if (props.relatedUserId != this.relatedUserId && props.relatedUserId) {
            this.relatedUserId = props.relatedUserId;
            if (this.relatedUserId != "system") {
                global.scener.userStore
                    .get({ id: this.relatedUserId })
                    .then((user) => {
                        this.setRelatedUser(user);
                    })
                    .catch(() => {
                        this.setProps({ status: "deleted" });
                    });
            }
        }

        if (props.forUserId != this.forUserId && props.forUserId) {
            this.forUserId = props.forUserId;
            if (this.forUserId != "system") {
                global.scener.userStore
                    .get({ id: this.forUserId })
                    .then((user) => {
                        this.setForUser(user);
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
        if (props.channelId) {
            this.channelId = props.channelId;
        }
        if (props.contentId) {
            this.contentId = props.contentId;
        }
        if (props.seriesId) {
            this.seriesId = props.seriesId;
        }
    }

    @action setRelatedUser(user) {
        this.relatedUser = user;
    }

    @action setForUser(user) {
        this.forUser = user;
    }

    async send() {
        let suggestionParams = {
            forUserId: this.forUserId,
            type: this.type
        };
        if (this.context) {
            suggestionParams.contextData = this.context;
        }
        if (this.payload) {
            suggestionParams.payload = JSON.stringify(this.payload);
        }
        let res = await global.scener.client.mutate({
            mutation: Mutations.createSuggestion,
            variables: {
                suggestion: suggestionParams
            }
        });
        if (res.data.createSuggestion) {
            this.setProps(res.data.createSuggestion);
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
                mutation: Mutations.updateSuggestionStatus,
                variables: {
                    suggestionId: this.id,
                    status: status,
                    contextData: contextData
                },
                optimisticResponse: {
                    updateSuggestionStatus: Object.assign({}, this.toJson(), {
                        status: status,
                        context: contextData
                    })
                }
            });
            if (res.data.updateSuggestionStatus) {
                this.setProps(res.data.updateSuggestionStatus);
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
            if (!this.suggestionSubscription) {
                this.suggestionSubscription = global.scener.client
                    .subscribe({
                        query: Subscriptions.onUpdatedSuggestion,
                        variables: {
                            id: this.id
                        }
                    })
                    .subscribe((response) => {
                        if (response.data && response.data.updatedSuggestion) {
                            this.setProps(response.data.updatedSuggestion);
                        }
                    });
            }
        }
    }

    compare(otherSuggestion) {
        if (this.status == otherSuggestion.status) {
            return otherSuggestion.created - this.created;
        }
        if (this.status == "pending" || this.status == "viewed") {
            return -1;
        }
        if (otherSuggestion.status == "pending" || otherSuggestion.status == "viewed") {
            return 1;
        }
        return otherSuggestion.created - this.created;
    }

    @computed get isResolved() {
        return this.status == "accepted" || this.status == "rejected";
    }

    toJson() {
        return {
            context: this.context,
            created: this.created,
            deleted: this.deleted,
            relatedUserId: this.relatedUserId,
            id: this.id,
            payload: this.payload,
            status: this.status,
            forUserId: this.forUserId,
            type: this.type,
            channelId: this.channelId,
            seriesId: this.seriesId,
            contentId: this.contentId,
            __typename: "Suggestion"
        };
    }
}
