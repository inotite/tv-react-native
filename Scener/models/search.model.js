//import { action, observable, reaction, computed } from "mobx";
import TrieSearch from "trie-search";
//import { toJS } from "mobx";

export class SearchModel {
    constructor() {
        this.followingTrie = null; //contains user instances
        this.conversationMemberTrie = null; //contains conversation member instances
        this.conversationTrie = null; //contains conversation instances
    }

    initFollowing(
        following //following is an array of users
    ) {
        if (!following) return;
        this.followingTrie = new TrieSearch("username");
        this.followingTrie.addAll(following);
    }

    initConversations(
        conversations //conversations is an array of conversation objects.
    ) {
        if (!conversations) return;
        return;
        /*this.conversationTrie = new TrieSearch('conversationName');
        this.conversationTrie.addAll(conversations);

        // initialize the conversations member trie.
        // this is separate from the conversations trie because its collection of 
        // members from different conversations.
        this.conversationMemberTrie = new TrieSearch([
            ['user', 'username']
        ]); //use member.user.username as the key
        for (let i = 0; i < conversations.length; i++)
        {
            let members = conversations[i].members; //array of member objects
            for (let j = 0; j < members.length; j++)
            {
                let member = members[j];
                if (member.user && member.user.username && member.user.id != global.scener.user.id)
                {
                    this.conversationMemberTrie.addAll([member]);
                }
            }
        }*/
    }

    addUsersToFollowing(users_) {
        if (this.followingTrie) {
            //   this.followingTrie.addAll(users);
        }
    }

    addConversations(convos_) {
        if (this.conversationTrie) {
            //     this.conversationTrie.addAll(convos);
        }
    }

    addMembers(members_) {
        if (this.conversationMemberTrie) {
            //  this.conversationMemberTrie.addAll(members.filter(m => m.user && m.user.username && m.user.id != global.scener.user.id));
        }
    }

    followingMatches(pattern) {
        let followingUsers = [];
        if (this.followingTrie && pattern) {
            followingUsers = this.followingTrie.get(pattern);
        }
        return followingUsers;
    }

    conversationMemberMatches(pattern) {
        let conversationMembers = [];
        if (this.conversationMemberTrie && pattern) {
            conversationMembers = this.conversationMemberTrie.get(pattern);
        }
        return conversationMembers;
    }

    conversationNameMatches(pattern) {
        if (this.conversationTrie && pattern) {
            let matches = this.conversationTrie.get(pattern);

            return matches;
        }
        return [];
    }
}
