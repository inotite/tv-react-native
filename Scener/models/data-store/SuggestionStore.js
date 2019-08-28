/*global scener*/

import { computed, action, reaction } from "mobx";
import { Suggestion } from "../Suggestion.model";
import { Queries, Subscriptions } from ".././api";
import DataStore from "./data-store";

export class SuggestionStore extends DataStore {
    statusChangeSubscriptions = {};

    constructor() {
        super(Suggestion);
    }

    add(suggestion) {
        return super.add(suggestion).then((n) => {
           /* if (!this.statusChangeSubscriptions[n.id]) {
                this.statusChangeSubscriptions[n.id] = reaction(
                    () => n.status,
                    (status, reactionRef) => {
                        this.suggestionStatusChanged(n, status, reactionRef);
                    }
                );
            }*/
            return n;
        });
    }

    get(suggestionData) {
        return super.get(suggestionData).then((n) => {
           /* if (n) {
                if (!this.statusChangeSubscriptions[n.id]) {
                    this.statusChangeSubscriptions[n.id] = reaction(
                        () => n.status,
                        (status, reactionRef) => {
                            this.suggestionStatusChanged(n, status, reactionRef);
                        }
                    );
                }
            }*/
            return n;
        });
    }

    clear() {
        if (this.suggestionSubscription) {
            this.suggestionSubscription.unsubscribe();
            this.suggestionSubscription = null;
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
                query: Queries.getSuggestionsForUser,
                variables: {
                    userId: global.scener.user.id
                },
                fetchPolicy: "network-only"
            })
            .then(({ data }) => {
                data ? this.onSuggestionsQueryChange(data.SuggestionsForUser) : null;
            });
        /*global.scener.client
            .query({
                query: Queries.getSuggestionsFromUser,
                variables: {
                    userId: global.scener.user.id
                },
                fetchPolicy: "network-only"
            })
            .then(({ data }) => {
                data ? this.onSuggestionsQueryChange(data.SuggestionsFromUser) : null;
            });*/

        //this.subscribeToSuggestions();
        
        this.setInitialized(true);

        // this.fetch(true);
    }

    fetch(force) {
        if (force) {
            this.suggestionsToQuery.setOptions({ fetchPolicy: "network-only" });
            this.suggestionsFromQuery.setOptions({ fetchPolicy: "network-only" });
        } else {
            this.suggestionsToQuery.setOptions({ fetchPolicy: "cache-only" });
            this.suggestionsFromQuery.setOptions({ fetchPolicy: "cache-only" });
        }
        this.suggestionsToQuery.refetch();
        this.suggestionsFromQuery.refetch();
    }

    onSuggestionsQueryChange(suggestions) {
        console.log(suggestions);
        if (suggestions) {
            return Promise.all(
                suggestions.map((n) => {
                    return this.get(n);
                })
            );
        }
    }

    subscribeToSuggestions() {
        if (global.scener.user.id) {
            if (!this.suggestionSubscription) {
                this.suggestionSubscription = global.scener.client
                    .subscribe({
                        query: Subscriptions.onCreatedSuggestionToUser,
                        variables: {
                            forUserId: global.scener.user.id
                        }
                    })
                    .subscribe((response) => {
                        if (response.data && response.data.createdSuggestion) {
                            let { createdSuggestion } = response.data;
                            switch (createdSuggestion.type) {
                                case "conversation-created": {
                                    if (createdSuggestion.context) {
                                        global.scener.user.conversationStore
                                            .get({ id: createdSuggestion.context })
                                            .then((convo) => {
                                                if (convo) {
                                                    convo.didViewCurrentMessages(0);
                                                    convo
                                                        .parseMessage({
                                                            author: createdSuggestion.relatedUserId,
                                                            body: createdSuggestion.payload
                                                        })
                                                        .then((msg) => {
                                                            if (msg) {
                                                                this.add({
                                                                    type: "message",
                                                                    id:
                                                                        Math.round(
                                                                            performance.now()
                                                                        ) + "_conversationCreated",
                                                                    payload: msg.body,
                                                                    context: convo.id,
                                                                    relatedUserId:
                                                                        createdSuggestion.relatedUserId,
                                                                    forUserId:
                                                                        global.scener.user.id,
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
                                    global.scener.userStore
                                        .get({ id: createdSuggestion.relatedUserId })
                                        .then((user) => {
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
                                    global.scener.user.conversationStore
                                        .get({ id: createdSuggestion.context })
                                        .then((conversation) => {
                                            if (conversation) {
                                                conversation.setProps({
                                                    activeRoomSid: createdSuggestion.payload
                                                });
                                            }
                                        });
                                    break;
                                }
                                case "conversation-room-deactivated": {
                                    global.scener.user.conversationStore
                                        .get({ id: createdSuggestion.context })
                                        .then((conversation) => {
                                            if (conversation) {
                                                conversation.setProps({ activeRoomSid: null });
                                            }
                                        });
                                    break;
                                }
                                case "relationship-changed": {
                                    global.scener.userStore
                                        .get({ id: createdSuggestion.relatedUserId })
                                        .then((u) => {
                                            if (u) {
                                                u.fetch(true);
                                                global.scener.user.addUserToFollowing(u);
                                            }
                                        });
                                    break;
                                }
                                default: {
                                    // this.get(createdSuggestion);
                                }
                            }
                        }
                    });
            }
        }
    }

    @action async suggestionStatusChanged(suggestion, status, reactionRef) {
        switch (suggestion.type) {
            case "followRequest": {
                if (status === Suggestion.STATUS.ACCEPTED) {
                    let user = await global.scener.userStore.get({ id: suggestion.forUserId });
                    user.setProps({
                        relationship: {
                            from: user.relationship.from,
                            towards: "following"
                        }
                    });
                    //user.writeUserToCache();
                    global.scener.user.addUserToFollowing(user);

                    reactionRef.dispose();
                } else if (status == Suggestion.STATUS.REJECTED) {
                    let user = await global.scener.userStore.get({ id: suggestion.forUserId });
                    user.setProps({
                        relationship: {
                            from: user.relationship.from,
                            towards: "none"
                        }
                    });
                    reactionRef.dispose();
                } else if (
                    status !== Suggestion.STATUS.VIEWED &&
                    status !== Suggestion.STATUS.PENDING
                ) {
                    reactionRef.dispose();
                }
                break;
            }
        }
    }

    @computed get suggestions() {
        let notesTo = this.suggestionsTo
            .filter((n) => {
                return n.status !== "deleted" && n.type !== "message";
            })
            .slice();
        let notesFrom = this.suggestionsFrom
            .filter((n) => {
                return n.status == "accepted";
            })
            .slice();
        let combined = [...notesTo, ...notesFrom];
        return combined.filter((n) => {
            return (
                combined.filter((other) => {
                    return (
                        n.userHash == other.userHash &&
                        n.type == other.type &&
                        n.id != other.id &&
                        other.relatedUserId == global.scener.user.id
                    );
                }).length == 0
            );
        });
    }

    @computed get suggestionsTo() {
        return this.values.filter((n) => {
            return n.forUserId == global.scener.user.id;
        });
    }

    @computed get suggestionsFrom() {
        return this.values.filter((n) => {
            return n.relatedUserId == global.scener.user.id;
        });
    }

    @computed get newSuggestions() {
        return this.suggestionsTo
            .filter((n) => {
                return n.status === "pending";
            })
            .slice()
            .sort((a, b) => {
                return a.compare(b);
            });
    }

    @computed get pendingSuggestions() {
        return this.suggestionsTo
            .filter((n) => {
                return (
                    (n.status === "pending" || n.status == "viewed") && n.type == "followRequest"
                );
            })
            .slice()
            .sort((a, b) => {
                return a.compare(b);
            });
    }
}
