import { observable,action} from "mobx";

export class Environment
{

    @observable disabled = false;
    
    constructor(props)
    {
        this.disabled = props.disabled;
    }

    @action toggle() {
        this.disabled = !this.disabled;
    }
}