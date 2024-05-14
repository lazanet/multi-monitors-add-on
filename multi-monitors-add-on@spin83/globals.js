import {Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export var g = {
    EXTENSION: null,
    UUID: "multi-monitors-add-on@spin83",
    mmIndicator: null,
    mmLayoutManager: null,
    mmOverview: null,
    mmPanel: []
}


export function currentExtension() {
    let extension = g?.EXTENSION ? g.EXTENSION : Extension.lookupByUUID(g.UUID);
    g["EXTENSION"] = extension;
    return extension
}

/** 
 * This function does all the copying of objects from one panel to another.
*/
export function copyClass(s, d) {
    if (!s) {
        console.error(`copyClass s undefined for d ${d.name}`)
        return
        //throw Error(`copyClass s undefined for d ${d.name}`)
    }
    let propertyNames = Reflect.ownKeys(s.prototype);
    for (let pName of propertyNames.values()) {
        if (typeof pName === "symbol") continue;
        if (d.prototype.hasOwnProperty(pName)) continue;
        if (pName === "prototype") continue;
        if (pName === "constructor") continue;
        let pDesc = Reflect.getOwnPropertyDescriptor(s.prototype, pName);
        if (typeof pDesc !== 'object') continue;
        Reflect.defineProperty(d.prototype, pName, pDesc);
    }
};
