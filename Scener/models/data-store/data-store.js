import { observable, action, computed } from "mobx";

export default class DataStore
{

    @observable entries = {};
    @observable promises = {};
    @observable initialized = false;
    constructor(BaseClass)
    {
        this.BaseClass = BaseClass;

    }

    @action setInitialized(inited)
    {
        this.initialized = inited;
    }

    @computed get values()
    {
        return Object.values(this.entries);
    }

    @computed get keys()
    {
        return Object.keys(this.entries);
    }

    @action add(data)
    {
        if (!data.id)
        {
            return Promise.resolve(null);
        }
        if (data instanceof this.BaseClass)
        {
            if (this.entries[data.id])
            {
                this.entries[data.id].destroy();
                this.entries[data.id] = data;

            }
            else
            {
                this.entries[data.id] = data;

            }
            return Promise.resolve(this.entries[data.id]);
        }
        else
        {
            return this.get(data);
        }
    }

    @action clear()
    {
        for (let k in this.entries)
        {
            if (this.entries[k] instanceof this.BaseClass && typeof this.entries[k].destroy == "function")
            {
                this.entries[k].destroy();
            }
        }
        this.entries = {};
        this.promises = {};
        this.setInitialized(false);
    }

    @action set(entry)
    {
        this.entries[entry.id] = entry;
    }

    @action get(data)
    {
        if (!data || !data.id || data.id == "null")
        {
            delete this.entries[data.id];
            delete this.promises[data.id];
            return Promise.reject(null);
        }
        if (this.entries[data.id])
        {
            return Promise.resolve(this.entries[data.id]);
        }
        if (this.promises[data.id])
        {
            return this.promises[data.id];
        }
        if (data instanceof this.BaseClass)
        {
            this.entries[data.id] = data;
            return Promise.resolve(this.entries[data.id]);

        }
        let newEntry = new this.BaseClass(data);
        this.promises[data.id] = newEntry.init();
        return this.promises[data.id].then((result) =>
        {
            if (result && this.promises[data.id] && result.id)
            {
                delete this.promises[data.id];
                this.set(result);
                return this.entries[data.id];

            }
            else
            {
                delete this.entries[data.id];
                delete this.promises[data.id];
                return null;
            }
        });
    }

    @action remove(id)
    {

        if (this.entries[id] instanceof this.BaseClass && typeof this.entries[id].destroy == "function")
        {
            this.entries[id].destroy();
        }
        this.entries[id] = null;
        delete this.entries[id];
        delete this.promises[id];
        return Promise.resolve(id);
    }



}