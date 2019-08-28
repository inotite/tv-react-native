import { observable, action, computed } from "mobx";
import { Queries,Mutations } from "./api";
export class ScenerParticipant
{
    static ERROR = {
        NOT_SIGNED_IN: "NOT_SIGNED_IN",
        NO_DATA: "NO_DATA"
    }
    @observable userId;
    @observable sceneId;
    @observable numHearts;
    @observable updated;
    @observable created;
    @observable user = {};
    @observable accessToken;
    @observable posts = [];
    @observable videoPosts = [];
    @observable nonVideoPosts = [];
    @observable postIds = {};
    @observable likes = [];
    constructor(props)
    {
        props ? this.setProps(props) : null;
    }

    @computed get id()
    {
        return this.userId + "_" + this.sceneId;
    }

    @computed get streamUrl()
    {
        //TODO: Replace hardcoded bucket with env specific
        //return `https://scenermedia-dev.s3.aws.amazon.com/${this.sceneId}/${this.userId}/master.m3u8`;
        return "https://s3-us-west-2.amazonaws.com/scenermedia-dev/LnCqHk9e/hls/LnCqHk9e.m3u8";
    }

    @action async setProps(props)
    {
        for (let k in props)
        {
            this[k] = props[k];
        }
        if (this.userId)
        {
            this.user = await global.scener.userStore.get({ id: this.userId });
        }
        return this;
    }

    @action async fetch()
    {
        //
        let response = await global.scener.client.query(
        {
            query: Queries.getParticipant,
            variables:
            {
                userId: this.userId,
                sceneId: this.sceneId
            },
            fetchPolicy: "network-only"
        });

        if (response.data.Participant)
        {
            return this.setProps(response.data.Participant);
        }
        else
        {
            throw new DOMException(ScenerParticipant.ERROR.NO_DATA);
        }

    }

    static async create(sceneId)
    {
        if (global.scener.user.loggedIn)
        {
            let response = await global.scener.client.mutate(
            {
                mutation: Mutations.createParticipant,
                variables:
                {
                    participant:
                    {
                        sceneId: sceneId,
                        userId: global.scener.user.id
                    }
                }
            });
            if (response.data.createParticipant)
            {
                return new ScenerParticipant(response.data.createParticipant);
            }
            else
            {
                throw new DOMException(ScenerParticipant.ERROR.NO_DATA);
            }
        }
        else
        {
            throw new DOMException(ScenerParticipant.ERROR.NOT_SIGNED_IN);
        }
    }


}