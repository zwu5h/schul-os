"use client";

import { createStore, get as idbGet, set as idbSet, del as idbDel, entries as idbEntries, clear as idbClear } from "idb-keyval";

let currentUser = "";
const legacyOwnerKey = "school-os-legacy-owner";

export function setLocalUser(userId: string) {
  currentUser = userId;
  if (typeof localStorage !== "undefined" && !localStorage.getItem(legacyOwnerKey)) {
    localStorage.setItem(legacyOwnerKey, userId);
  }
}

export function workspaceKey() {
  if (!currentUser) throw new Error("Anmeldung fehlt.");
  return localStorage.getItem(legacyOwnerKey) === currentUser
    ? "school-os-v1" : `school-os-v1:${currentUser}`;
}

export function userStorageKey(key: string) {
  if (!currentUser) throw new Error("Anmeldung fehlt.");
  return localStorage.getItem(legacyOwnerKey) === currentUser
    ? key : `${key}:${currentUser}`;
}

function blobStore() {
  if (!currentUser) throw new Error("Anmeldung fehlt.");
  return localStorage.getItem(legacyOwnerKey) === currentUser
    ? undefined : createStore(`school-os-${currentUser}`, "blobs");
}

export function get<T>(key: string) { return idbGet<T>(key, blobStore()); }
export function set<T>(key: string, value: T) { return idbSet(key, value, blobStore()); }
export function del(key: string) { return idbDel(key, blobStore()); }
export function entries() { return idbEntries(blobStore()); }
export function clear() { return idbClear(blobStore()); }
