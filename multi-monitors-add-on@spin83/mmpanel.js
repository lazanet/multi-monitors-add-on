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

function getMainIndicators() {
	let ret = {}
	Object.entries(Main.panel.statusArea)
		.forEach(([key, value]) => {
			if (true || (key.startsWith("appindicator-") && ["IndicatorStatusTrayIcon", "IndicatorStatusIcon"].includes(value.constructor.name))) {
				ret[key] = value;
			}
		})
	return ret;
}

export var MultiMonitorsPanel = (() => {
	let MultiMonitorsPanel = class MultiMonitorsPanel extends Panel.Panel {
		_init(monitorIndex, mmPanelBox) {
			super._init();
			Main.layoutManager.panelBox.remove_child(this);
			mmPanelBox.panelBox.add_child(this);
			this.monitorIndex = monitorIndex;
			this.connect('destroy', this._onDestroy.bind(this));
			// this._syncIndicators()
		}

		_syncIndicators() {
			// WIP!
			Object.entries(getMainIndicators()).forEach(([key, value]) => {
				try {
					this.addToStatusArea(key, value, 1);
				} catch (e) {
					console.warn("Skipping role: " + key);
				}
			})
		}

		_onDestroy() {
			Main.ctrlAltTabManager.removeGroup(this);
		}

		vfunc_get_preferred_width(_forHeight) {
			if (Main.layoutManager.monitors.length > this.monitorIndex)
				return [0, Main.layoutManager.monitors[this.monitorIndex].width];

			return [0, 0];
		}

	};
	return GObject.registerClass(MultiMonitorsPanel);
})();
