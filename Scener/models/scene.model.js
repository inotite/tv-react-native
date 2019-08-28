import { observable, action } from "mobx";
import { ScenerParticipant } from "./participant.model";
import { Mutations, Queries, Subscriptions } from "./api";
export class Scene
{
    static ERROR = {
        NOT_SIGNED_IN: "NOT_SIGNED_IN",
        NO_DATA: "NO_DATA"
    };

    @observable id;
    @observable hostId;
    @observable explicit;
    @observable contentId;
    @observable participants = [];
    @observable content = {};
    @observable active;
    @observable live;

    constructor(props)
    {
        props ? this.setProps(props) : null;


    }

    @action destroy()
    {
        if (this.participantSubscription)
        {
            this.participantSubscription.unsubscribe();
        }
        if (this.sceneSubscription)
        {
            this.sceneSubscription.unsubscribe();
        }

        //this.id = null;
        this.hostId = null;
        this.explicit = null;
        this.contentId = null;
        this.participants = [];
        this.content = {};
        this.active = 0;
        this.live = 0;

    }


    @action async setProps(props)
    {
        for (let k in props)
        {
            if (k != "participants")
            {
                this[k] = props[k];
            }
        }

        if (props.participants)
        {
            let participants = await Promise.all(
                props.participants.map(p =>
                {
                    let part = new ScenerParticipant();
                    return part.setProps(p);
                }));
            this.participants = participants;
        }
        else
        {
            this.participants = [];
        }
        this.subscribeToParticipants();
        this.subscribeToChanges();
        return this;
    }

    async fetch()
    {

        let response = await global.scener.client.query(
        {
            query: Queries.getScene,
            variables:
            {
                sceneId: this.id
            },
            fetchPolicy: "network-only"
        });
        if (response.data.Scene)
        {
            return this.setProps(response.data.Scene);
        }
        else
        {
            throw new DOMException(Scene.ERROR.NO_DATA);
        }
    }


    async update(props)
    {
        if (global.scener.user.loggedIn)
        {
            let response = await global.scener.client.mutate(
            {
                mutation: Mutations.updateScene,
                variables:
                {
                    sceneId: this.id,
                    scene: props
                }
            });
            if (response.data.updateScene)
            {
                return this.setProps(response.data.updateScene);

            }
            else
            {
                throw new DOMException(Scene.ERROR.NO_DATA);
            }
        }
        else
        {
            throw new DOMException(Scene.ERROR.NOT_SIGNED_IN);
        }
    }

    static async create(content, conversation)
    {
        if (global.scener.user.loggedIn)
        {
            let response = await global.scener.client.mutate(
            {
                mutation: Mutations.createScene,
                variables:
                {
                    scene:
                    {
                        contentId: content.id,
                        conversationId: conversation.id
                    }
                }
            });
            if (response.data.createScene)
            {
                return new Scene(response.data.createScene);
            }
            else
            {
                throw new DOMException(Scene.ERROR.NO_DATA);
            }
        }
        else
        {
            throw new DOMException(Scene.ERROR.NOT_SIGNED_IN);
        }
    }

    @action async createLocalParticipant()
    {
        if (global.scener.user && global.scener.user.loggedIn)
        {
            try
            {
                let participant = this.participantForUser(global.scener.user.id);
                if (!participant)
                {
                    participant = await ScenerParticipant.create(this.id);
                    this.participants.push(participant);
                }
                return participant;
            }
            catch (error)
            {
                console.warn(error);
            }
        }
        else
        {
            return Promise.reject("You must be logged in.");
        }
    }

    @action async addParticipant(data)
    {

        if (this.containsUser(data.userId))
        {
            return true;
        }
        let part = new ScenerParticipant();
        await part.setProps(data);
        this.participants.push(part);

        await part.fetch();
    }

    containsUser(userId)
    {
        for (let i in this.participants)
        {
            if (
                (this.participants[i].user && this.participants[i].user.id == userId) ||
                this.participants[i].userId == userId
            )
            {
                return true;
            }
        }
        return false;
    }

    participantForUser(userId)
    {
        for (let i in this.participants)
        {
            if (
                (this.participants[i].user && this.participants[i].user.id == userId) ||
                this.participants[i].userId == userId
            )
            {
                return this.participants[i];
            }
        }
        return null;
    }

    isHost(userId)
    {
        if (this.host && this.host.id == userId)
        {
            return true;
        }
        else if (this.hostId && this.hostId == userId)
        {
            return true;
        }
        return false;
    }

    subscribeToChanges()
    {
        if (!this.sceneSubscription && this.id)
        {
            this.sceneSubscription = global.scener.client
                .subscribe(
                {
                    query: Subscriptions.onUpdatedScene,
                    variables:
                    {
                        sceneId: this.id
                    }
                })
                .subscribe(response =>
                {
                    if (response.data && response.data.updatedScene)
                    {
                        this.setProps(response.data.updatedScene);
                    }
                });
        }
    }

    subscribeToParticipants()
    {
        if (!this.participantActivationSubscription && this.id)
        {
            this.participantActivationSubscription = global.scener.client
                .subscribe(
                {
                    query: Subscriptions.onCreatedParticipant,
                    variables:
                    {
                        sceneId: this.id
                    }
                })
                .subscribe(response =>
                {
                    if (response.data && response.data.createdParticipant)
                    {
                        this.addParticipant(response.data.createdParticipant);
                    }
                });
        }
        if (!this.participantDeactivationSubscription && this.id)
        {
            this.participantDeactivationSubscription = global.scener.client
                .subscribe(
                {
                    query: Subscriptions.onDeletedParticipant,
                    variables:
                    {
                        sceneId: this.id
                    }
                })
                .subscribe(response =>
                {
                    if (response.data && response.data.createdParticipant)
                    {
                        this.addParticipant(response.data.createdParticipant);
                    }
                });
        }
    }
}