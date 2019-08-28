import DataStore from "./data-store";
import { ScenerUser } from "../user.model";
import { reaction } from "mobx";
import { AsyncStorage } from "react-native";

export default class UserStore extends DataStore {
  constructor() {
    super(ScenerUser);
  }

  async writeToCache() {
    await AsyncStorage.setItem("UserStore", this.values.map((c) => c.toJSON()));
  }

  init() {
    AsyncStorage.getItem("UserStore").then((users) => {
      if (users) {
        users.forEach((u) => {
          this.add(u);
        });
      }
      this.writeToCache();

      reaction(
        () => this.values.length,
        () => {
          this.writeToCache();
        }
      );
    });
  }

  get(data) {
    if (data.id == global.scener.user.id) {
      return Promise.resolve(global.scener.user);
    }
    return super.get(data);
  }
}
