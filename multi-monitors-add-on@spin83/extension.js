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

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { ANIMATION_TIME } from 'resource:///org/gnome/shell/ui/overview.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import {g, copyClass} from './globals.js'
var {mmIndicator, mmLayoutManager, mmOverview, mmPanel} = g

import * as MMLayout from './mmlayout.js'
import * as MMOverview from './mmoverview.js'
import * as MMIndicator from './indicator.js'

// const OVERRIDE_SCHEMA = 'org.gnome.shell.overrides';
const MUTTER_SCHEMA = 'org.gnome.mutter';
const WORKSPACES_ONLY_ON_PRIMARY_ID = 'workspaces-only-on-primary';

const SHOW_INDICATOR_ID = 'show-indicator';
const THUMBNAILS_SLIDER_POSITION_ID = 'thumbnails-slider-position';

export default class MultiMonitorsAddOn extends Extension {

    constructor(metadata) {
        super(metadata);
        g["EXTENSION"] = this;
        this._settings = this.getSettings();
        // this._ov_settings = new Gio.Settings({ schema: OVERRIDE_SCHEMA });
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

    _showThumbnailsSlider() {
        if (this._settings.get_string(THUMBNAILS_SLIDER_POSITION_ID) === 'none' || true)  {
            this._hideThumbnailsSlider();
            return;
        }

        //		if(this._ov_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID))
        //			this._ov_settings.set_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID, false);
        if (this._mu_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID))
            this._mu_settings.set_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID, false);

        if (mmOverview)
            return;

        mmOverview = [];
        for (let idx = 0; idx < Main.layoutManager.monitors.length; idx++) {
            if (idx != Main.layoutManager.primaryIndex) {
                mmOverview[idx] = new MMOverview.MultiMonitorsOverview(idx);
            }
        }

        this.syncWorkspacesActualGeometry = Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry;
        Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry = function () {
            if (this._inWindowFade)
                return;

            const primaryView = this._getPrimaryView();
            if (primaryView) {
                primaryView.ease({
                    ...this._actualGeometry,
                    duration: Main.overview.animationInProgress ? ANIMATION_TIME : 0,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                });
            }

            for (let idx = 0; idx < mmOverview.length; idx++) {
                if (!mmOverview[idx])
                    continue;
                if (!mmOverview[idx]._overview)
                    continue;
                const mmView = mmOverview[idx]._overview._controls._workspacesViews;
                if (!mmView)
                    continue;

                const mmGeometry = mmOverview[idx].getWorkspacesActualGeometry();
                mmView.ease({
                    ...mmGeometry,
                    duration: this.overview.animationInProgress ? ANIMATION_TIME : 0,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                });
            }
        }
    }

    _hideThumbnailsSlider() {
        if (!mmOverview)
            return;

        for (let idx = 0; idx < mmOverview.length; idx++) {
            if (mmOverview[idx])
                mmOverview[idx].destroy();
        }
        mmOverview = null;
        Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry = this.syncWorkspacesActualGeometry;
    }

    _relayout() {
        if (this._mmMonitors != Main.layoutManager.monitors.length) {
            this._mmMonitors = Main.layoutManager.monitors.length;
            console.log("pi:" + Main.layoutManager.primaryIndex);
            for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
                let monitor = Main.layoutManager.monitors[i];
                console.log("i:" + i + " x:" + monitor.x + " y:" + monitor.y + " w:" + monitor.width + " h:" + monitor.height);
            }
            this._hideThumbnailsSlider();
            this._showThumbnailsSlider();
        }
    }

    _switchOffThumbnails() {
        if (
            //  this._ov_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID) ||
            this._mu_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID)) {
            this._settings.set_string(THUMBNAILS_SLIDER_POSITION_ID, 'none');
        }
    }

    enable() {
        console.log(`Enabling ${this.metadata.name}`)

        if (Main.panel.statusArea.MultiMonitorsAddOn)
            disable();

        this._mmMonitors = 0;

        //		this._switchOffThumbnailsOvId = this._ov_settings.connect('changed::'+WORKSPACES_ONLY_ON_PRIMARY_ID,
        //																	this._switchOffThumbnails.bind(this));
        this._switchOffThumbnailsMuId = this._mu_settings.connect('changed::' + WORKSPACES_ONLY_ON_PRIMARY_ID,
            this._switchOffThumbnails.bind(this));

        this._showIndicatorId = this._settings.connect('changed::' + SHOW_INDICATOR_ID, this._showIndicator.bind(this));
        this._showIndicator();

        mmLayoutManager = new MMLayout.MultiMonitorsLayoutManager();
        this._showPanelId = this._settings.connect('changed::' + MMLayout.SHOW_PANEL_ID, mmLayoutManager.showPanel.bind(mmLayoutManager));
        mmLayoutManager.showPanel();

        this._thumbnailsSliderPositionId = this._settings.connect('changed::' + THUMBNAILS_SLIDER_POSITION_ID, this._showThumbnailsSlider.bind(this));
        this._relayoutId = Main.layoutManager.connect('monitors-changed', this._relayout.bind(this));
        this._relayout();
    }

    disable() {
        Main.layoutManager.disconnect(this._relayoutId);
        // this._ov_settings.disconnect(this._switchOffThumbnailsOvId);
        this._mu_settings.disconnect(this._switchOffThumbnailsMuId);

        this._settings.disconnect(this._showPanelId);
        this._settings.disconnect(this._thumbnailsSliderPositionId);
        this._settings.disconnect(this._showIndicatorId);


        this._hideIndicator();

        mmLayoutManager.hidePanel();
        mmLayoutManager = null;

        this._hideThumbnailsSlider();
        this._mmMonitors = 0;

        console.log(`Disabled ${this.metadata.name} ...`)
    }
}

function hackPanel() { // TODO: Figure out if this is safe to remove
    // fix bug in panel: Destroy function many time added to this same indicator.
    Main.panel._ensureIndicator = function (role) {
        let indicator = this.statusArea[role];
        if (indicator) {
            indicator.container.show();
            return null;
        }
        else {
            let constructor = PANEL_ITEM_IMPLEMENTATIONS[role];
            if (!constructor) {
                // This icon is not implemented (this is a bug)
                return null;
            }
            indicator = new constructor(this);
            this.statusArea[role] = indicator;
        }
        return indicator;
    };
}
