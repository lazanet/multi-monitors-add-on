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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as MMLayout from './mmlayout.js'
import * as MMIndicator from './indicator.js'

const SHOW_INDICATOR_ID = 'show-indicator';

export default class MultiMonitorsAddOn extends Extension {

    constructor(metadata) {
        super(metadata);
        this._settings = this.getSettings();

        this.mmIndicator = null;
        this.mmLayoutManager = null;
    }

    _toggleIndicator() {
        if (this._settings.get_boolean(SHOW_INDICATOR_ID))
            this._showIndicator();
        else
            this._hideIndicator();
    }

    _showIndicator() {
        if (this.mmIndicator)
            return;
        this.mmIndicator = Main.panel.addToStatusArea('MultiMonitorsAddOn', new MMIndicator.MultiMonitorsIndicator());
    }

    _hideIndicator() {
        if (!this.mmIndicator)
            return
        this.mmIndicator.destroy();
        this.mmIndicator = null;
    }

    enable() {
        console.log(`Enabling ${this.metadata.name}`)

        if (Main.panel.statusArea.MultiMonitorsAddOn)
            disable();

        this._toggleIndicatorId = this._settings.connect('changed::' + SHOW_INDICATOR_ID, this._toggleIndicator.bind(this));
        this._toggleIndicator();

        this.mmLayoutManager = new MMLayout.MultiMonitorsLayoutManager();
        this._showPanelId = this._settings.connect('changed::' + MMLayout.SHOW_PANEL_ID, this.mmLayoutManager.showPanel.bind(this.mmLayoutManager));
        this.mmLayoutManager.showPanel();
    }

    disable() {
        this._settings.disconnect(this._showPanelId);
        this._settings.disconnect(this._toggleIndicatorId);
        this._hideIndicator();

        this.mmLayoutManager.hidePanel();
        this.mmLayoutManager = null;

        console.log(`Disabled ${this.metadata.name} ...`)
    }
}
