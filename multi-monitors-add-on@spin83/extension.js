/*
Copyright (C) 2014  spin83

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, visit https://www.gnu.org/licenses/.
*/

import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import {g} from './globals.js'
var {mmIndicator, mmLayoutManager} = g

import * as MMLayout from './mmlayout.js'
import * as MMIndicator from './indicator.js'

// const OVERRIDE_SCHEMA = 'org.gnome.shell.overrides';
const MUTTER_SCHEMA = 'org.gnome.mutter';

const SHOW_INDICATOR_ID = 'show-indicator';
export default class MultiMonitorsAddOn extends Extension {

    constructor(metadata) {
        super(metadata);
        this._settings = this.getSettings();
        this._mu_settings = new Gio.Settings({ schema: MUTTER_SCHEMA });

        this._mmMonitors = 0;
        this.syncWorkspacesActualGeometry = null;
    }

    _showIndicator() {
        if (this._settings.get_boolean(SHOW_INDICATOR_ID)) {
            if (!mmIndicator) {
                mmIndicator = Main.panel.addToStatusArea('MultiMonitorsAddOn', new MMIndicator.MultiMonitorsIndicator());
            }
        }
        else {
            this._hideIndicator();
        }
    }

    _hideIndicator() {
        if (mmIndicator) {
            mmIndicator.destroy();
            mmIndicator = null;
        }
    }

    enable() {
        console.log(`Enabling ${this.metadata.name}`)

        if (Main.panel.statusArea.MultiMonitorsAddOn)
            disable();

        this._mmMonitors = 0;


        this._showIndicatorId = this._settings.connect('changed::' + SHOW_INDICATOR_ID, this._showIndicator.bind(this));
        this._showIndicator();

        mmLayoutManager = new MMLayout.MultiMonitorsLayoutManager();
        this._showPanelId = this._settings.connect('changed::' + MMLayout.SHOW_PANEL_ID, mmLayoutManager.showPanel.bind(mmLayoutManager));
        mmLayoutManager.showPanel();
    }

    disable() {
        this._settings.disconnect(this._showPanelId);
        this._settings.disconnect(this._showIndicatorId);


        this._hideIndicator();

        mmLayoutManager.hidePanel();
        mmLayoutManager = null;

        this._mmMonitors = 0;

        console.log(`Disabled ${this.metadata.name} ...`)
    }
}
