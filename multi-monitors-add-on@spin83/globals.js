import GObject from 'gi://GObject';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

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

export function unhideClass(classId) {
    let tmp = GObject.Object.new(GObject.type_from_name(classId));
    return tmp;
}

export function copyClass(s, d) {
    if (!s) {
        console.error(`copyClass s undefined for d ${d.name}`)
        return
        //throw Error(`copyClass s undefined for d ${d.name}`)
    }

    let prototype = s.prototype ? s.prototype : Object.getPrototypeOf(s);
    let propertyNames = Reflect.ownKeys(prototype);

    for (let pName of propertyNames.values()) {
        if (typeof pName === "symbol") continue;
        if (d.prototype.hasOwnProperty(pName)) continue;
        if (pName === "prototype") continue;
        if (pName === "constructor") continue;
        let pDesc = Reflect.getOwnPropertyDescriptor(prototype, pName);
        if (typeof pDesc !== 'object') continue;
        Reflect.defineProperty(d.prototype, pName, pDesc);
    }
};
