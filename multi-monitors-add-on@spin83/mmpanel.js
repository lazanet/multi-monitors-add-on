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
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Panel from 'resource:///org/gnome/shell/ui/panel.js';

import { g, currentExtension } from './globals.js'
var { mmPanel } = g

export const SHOW_ACTIVITIES_ID = 'show-activities';
export var SHOW_APP_MENU_ID = 'show-app-menu';
export const SHOW_DATE_TIME_ID = 'show-date-time';
export const AVAILABLE_INDICATORS_ID = 'available-indicators';
export const TRANSFER_INDICATORS_ID = 'transfer-indicators';

export var StatusIndicatorsController = class StatusIndicatorsController {
	constructor() {
		this._transfered_indicators = [];
		this._settings = currentExtension().getSettings();

		this._updatedSessionId = Main.sessionMode.connect('updated', this._updateSessionIndicators.bind(this));
		this._updateSessionIndicators();
		this._extensionStateChangedId = Main.extensionManager.connect('extension-state-changed',
			this._extensionStateChanged.bind(this));

		this._transferIndicatorsId = this._settings.connect('changed::' + TRANSFER_INDICATORS_ID,
			this.transferIndicators.bind(this));
	}

	destroy() {
		this._settings.disconnect(this._transferIndicatorsId);
		Main.extensionManager.disconnect(this._extensionStateChangedId);
		Main.sessionMode.disconnect(this._updatedSessionId);
		this._settings.set_strv(AVAILABLE_INDICATORS_ID, []);
		this._transferBack(this._transfered_indicators);
	}

	transferBack(panel) {
		let transfer_back = this._transfered_indicators.filter((element) => {
			return element.monitor == panel.monitorIndex;
		});

		this._transferBack(transfer_back, panel);
	}

	transferIndicators() {
		let boxs = ['_leftBox', '_centerBox', '_rightBox'];
		let transfers = this._settings.get_value(TRANSFER_INDICATORS_ID).deep_unpack();
		let show_app_menu = this._settings.get_value(SHOW_APP_MENU_ID);

		let transfer_back = this._transfered_indicators.filter((element) => {
			return !transfers.hasOwnProperty(element.iname);
		});

		this._transferBack(transfer_back);

		for (let iname in transfers) {
			if (transfers.hasOwnProperty(iname) && Main.panel.statusArea[iname]) {
				let monitor = transfers[iname];

				let indicator = Main.panel.statusArea[iname];
				let panel = this._findPanel(monitor);
				boxs.forEach((box) => {
					if (Main.panel[box].contains(indicator.container) && panel) {
						console.log('a ' + box + " > " + iname + " : " + monitor);
						this._transfered_indicators.push({ iname: iname, box: box, monitor: monitor });
						Main.panel[box].remove_child(indicator.container);
						if (show_app_menu && box === '_leftBox')
							panel[box].insert_child_at_index(indicator.container, 1);
						else
							panel[box].insert_child_at_index(indicator.container, 0);
					}
				});
			}
		}
	}

	_findPanel(monitor) {
		for (let i = 0; i < mmPanel.length; i++) {
			if (mmPanel[i].monitorIndex == monitor) {
				return mmPanel[i];
			}
		}
		return null;
	}

	_transferBack(transfer_back, panel) {
		transfer_back.forEach((element) => {
			this._transfered_indicators.splice(this._transfered_indicators.indexOf(element));
			if (Main.panel.statusArea[element.iname]) {
				let indicator = Main.panel.statusArea[element.iname];
				if (!panel) {
					panel = this._findPanel(element.monitor);
				}
				if (panel[element.box].contains(indicator.container)) {
					console.log("r " + element.box + " > " + element.iname + " : " + element.monitor);
					panel[element.box].remove_child(indicator.container);
					if (element.box === '_leftBox')
						Main.panel[element.box].insert_child_at_index(indicator.container, 1);
					else
						Main.panel[element.box].insert_child_at_index(indicator.container, 0);
				}
			}
		});
	}

	_extensionStateChanged() {
		this._findAvailableIndicators();
		this.transferIndicators();
	}

	_updateSessionIndicators() {
		let session_indicators = [];
		session_indicators.push('MultiMonitorsAddOn');
		let sessionPanel = Main.sessionMode.panel;
		for (let sessionBox in sessionPanel) {
			sessionPanel[sessionBox].forEach((sesionIndicator) => {
				session_indicators.push(sesionIndicator);
			});
		}
		this._session_indicators = session_indicators;
		this._available_indicators = [];

		this._findAvailableIndicators();
		this.transferIndicators();
	}

	_findAvailableIndicators() {
		let available_indicators = [];
		let statusArea = Main.panel.statusArea;
		for (let indicator in statusArea) {
			if (statusArea.hasOwnProperty(indicator) && this._session_indicators.indexOf(indicator) < 0) {
				available_indicators.push(indicator);
			}
		}
		if (available_indicators.length != this._available_indicators.length) {
			this._available_indicators = available_indicators;
			// console.log(this._available_indicators);
			this._settings.set_strv(AVAILABLE_INDICATORS_ID, this._available_indicators);
		}
	}
};

export var MultiMonitorsPanel = (() => {
	let MultiMonitorsPanel = class MultiMonitorsPanel extends Panel.Panel {
		_init(monitorIndex, mmPanelBox) {
			super._init();
			Main.layoutManager.panelBox.remove_child(this);
			mmPanelBox.panelBox.add_child(this);
			this.monitorIndex = monitorIndex;
			this.connect('destroy', this._onDestroy.bind(this));
		}

		_onDestroy() {
			global.display.disconnect(this._workareasChangedId);
			Main.ctrlAltTabManager.removeGroup(this);
			Main.sessionMode.disconnect(this._updatedId);
		}

		vfunc_get_preferred_width(_forHeight) {
			if (Main.layoutManager.monitors.length > this.monitorIndex)
				return [0, Main.layoutManager.monitors[this.monitorIndex].width];

			return [0, 0];
		}

	};
	return GObject.registerClass(MultiMonitorsPanel);
})();
