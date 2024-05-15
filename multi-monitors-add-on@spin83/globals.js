import GObject from 'gi://GObject';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export var g = {
    mmPanel: []
}

export function currentExtension() {
    return Extension.lookupByUUID("multi-monitors-add-on@spin83");
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
