import { writable, type Writable } from "svelte/store";
import auth from '$slib/auth';
type User = {
    email: string;
    id: string;
}

const user: Writable<User | null> = writable(null);

export default {
    ...user,
    ...auth
};