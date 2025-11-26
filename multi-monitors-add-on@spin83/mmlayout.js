/**
 * New node file
 */

import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';

import * as MMPanel from './mmpanel.js'
import { g, currentExtension } from './globals.js'
var { mmPanel } = g

var SHOW_PANEL_ID = 'show-panel';
var ENABLE_HOT_CORNERS = 'enable-hot-corners';

export const MultiMonitorsPanelBox = class MultiMonitorsPanelBox {
	constructor(monitor) {
		this.panelBox = new St.BoxLayout({ name: 'panelBox', vertical: true, clip_to_allocation: true });
		Main.layoutManager.addChrome(this.panelBox, { affectsStruts: true, trackFullscreen: true });
		this.panelBox.set_position(monitor.x, monitor.y);
		this.panelBox.set_size(monitor.width, -1);
		Main.uiGroup.set_child_below_sibling(this.panelBox, Main.layoutManager.panelBox);
	}

	destroy() {
		this.panelBox.destroy();
	}

	updatePanel(monitor) {
		this.panelBox.set_position(monitor.x, monitor.y);
		this.panelBox.set_size(monitor.width, -1);
	}
};

export var MultiMonitorsLayoutManager = class MultiMonitorsLayoutManager {
	constructor() {
		this._settings = currentExtension().getSettings();
		this._desktopSettings = currentExtension().getSettings("org.gnome.desktop.interface");

		mmPanel = [];

		this._monitorIds = [];
		this.mmPanelBox = [];

		this._monitorsChangedId = null;

		this._layoutManager_updateHotCorners = null;
		this._changedEnableHotCornersId = null;

		this._origAddToStatusArea = null;
		this._mirroredIndicators = new Map();
	}

	showPanel() {
		if (this._settings.get_boolean(SHOW_PANEL_ID)) {
			this._enableIndicatorMirroring();

			if (!this._monitorsChangedId) {
				this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', this._monitorsChanged.bind(this));
				this._monitorsChanged();
			}

			if (!this._layoutManager_updateHotCorners) {
				this._layoutManager_updateHotCorners = Main.layoutManager._updateHotCorners;

				const _this = this;
				Main.layoutManager._updateHotCorners = function () {
					this.hotCorners.forEach((corner) => {
						if (corner)
							corner.destroy();
					});
					this.hotCorners = [];

					if (!_this._desktopSettings.get_boolean(ENABLE_HOT_CORNERS)) {
						this.emit('hot-corners-changed');
						return;
					}

					let size = this.panelBox.height;

					for (let i = 0; i < this.monitors.length; i++) {
						let monitor = this.monitors[i];
						let cornerX = this._rtl ? monitor.x + monitor.width : monitor.x;
						let cornerY = monitor.y;

						let corner = new Layout.HotCorner(this, monitor, cornerX, cornerY);
						corner.setBarrierSize(size);
						this.hotCorners.push(corner);
					}

					this.emit('hot-corners-changed');
				};

				if (!this._changedEnableHotCornersId) {
					this._changedEnableHotCornersId = this._desktopSettings.connect('changed::' + ENABLE_HOT_CORNERS,
						Main.layoutManager._updateHotCorners.bind(Main.layoutManager));
				}

				Main.layoutManager._updateHotCorners();
			}
		}
		else {
			this.hidePanel();
		}
	}

	hidePanel() {
		this._disableIndicatorMirroring();

		if (this._changedEnableHotCornersId) {
			global.settings.disconnect(this._changedEnableHotCornersId);
			this._changedEnableHotCornersId = null;
		}

		if (this._layoutManager_updateHotCorners) {
			Main.layoutManager['_updateHotCorners'] = this._layoutManager_updateHotCorners;
			this._layoutManager_updateHotCorners = null;
			Main.layoutManager._updateHotCorners();
		}

		if (this._monitorsChangedId) {
			Main.layoutManager.disconnect(this._monitorsChangedId);
			this._monitorsChangedId = null;
		}

		let panels2remove = this._monitorIds.length;
		for (let i = 0; i < panels2remove; i++) {
			let monitorId = this._monitorIds.pop();
			this._popPanel();
			console.log("remove: " + monitorId);
		}
	}

	_monitorsChanged() {
		let monitorChange = Main.layoutManager.monitors.length - this._monitorIds.length - 1;
		if (monitorChange < 0) {
			for (let idx = 0; idx < -monitorChange; idx++) {
				let monitorId = this._monitorIds.pop();
				this._popPanel();
				console.log("remove: " + monitorId);
			}
		}

		let j = 0;
		for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
			if (i != Main.layoutManager.primaryIndex) {
				let monitor = Main.layoutManager.monitors[i];
				let monitorId = "i" + i + "x" + monitor.x + "y" + monitor.y + "w" + monitor.width + "h" + monitor.height;
				if (monitorChange > 0 && j == this._monitorIds.length) {
					this._monitorIds.push(monitorId);
					this._pushPanel(i, monitor);
					console.log("new: " + monitorId);
				}
				else if (this._monitorIds[j] > monitorId || this._monitorIds[j] < monitorId) {
					let oldMonitorId = this._monitorIds[j];
					this._monitorIds[j] = monitorId;
					this.mmPanelBox[j].updatePanel(monitor);
					console.log("update: " + oldMonitorId + ">" + monitorId);
				}
				j++;
			}
		}

		this._syncMirroredIndicators();
	}

	_pushPanel(i, monitor) {
		let mmPanelBox = new MultiMonitorsPanelBox(monitor);
		let panel = new MMPanel.MultiMonitorsPanel(i, mmPanelBox);

		panel.connect('destroy', () => this._removePanelFromMirrors(panel));

		mmPanel.push(panel);
		this.mmPanelBox.push(mmPanelBox);

		this._syncMirroredIndicators();
	}

	_popPanel() {
		mmPanel.pop();
		let mmPanelBox = this.mmPanelBox.pop();
		mmPanelBox.destroy();
	}

	_enableIndicatorMirroring() {
		if (this._origAddToStatusArea)
			return;

		this._origAddToStatusArea = Main.panel.addToStatusArea;
		Main.panel.addToStatusArea = (role, indicator, position, box) => {
			let addedIndicator = this._origAddToStatusArea.call(Main.panel, role, indicator, position, box);
			this._mirrorIndicator(role, indicator, position, box);
			return addedIndicator;
		};

		this._mirrorExistingIndicators();
	}

	_disableIndicatorMirroring() {
		for (let [role, record] of this._mirroredIndicators.entries()) {
			if (record.destroyId)
				record.source.disconnect(record.destroyId);

			for (let clone of record.clones.values()) {
				try {
					clone.destroy();
				} catch (e) {
					console.error(e);
				}
			}
		}

		this._mirroredIndicators.clear();

		if (this._origAddToStatusArea) {
			Main.panel.addToStatusArea = this._origAddToStatusArea;
			this._origAddToStatusArea = null;
		}
	}

	_mirrorExistingIndicators() {
		Object.entries(Main.panel.statusArea).forEach(([role, indicator]) => {
			if (!indicator)
				return;
			let { position, box } = this._getIndicatorPlacement(indicator);
			this._mirrorIndicator(role, indicator, position, box);
		});
	}

	_shouldMirrorIndicator(role, indicator) {
		if (!indicator || !indicator.container)
			return false;

		return role.startsWith('appindicator-');
	}

	_getIndicatorPlacement(indicator) {
		let container = indicator.container;
		let parent = container?.get_parent();

		let box = 'right';
		if (parent === Main.panel._leftBox)
			box = 'left';
		else if (parent === Main.panel._centerBox)
			box = 'center';

		let position = 0;
		if (parent) {
			let children = parent.get_children();
			position = children.indexOf(container);
		}

		return { position, box };
	}

	_mirrorIndicator(role, indicator, position, box) {
		if (!this._shouldMirrorIndicator(role, indicator))
			return;

		if (this._mirroredIndicators.has(role))
			this._removeIndicatorMirrors(role);

		let placement = this._getIndicatorPlacement(indicator);
		let record = {
			source: indicator,
			position: position ?? placement.position,
			box: box ?? placement.box,
			clones: new Map(),
			destroyId: indicator.connect('destroy', () => this._removeIndicatorMirrors(role)),
		};

		this._mirroredIndicators.set(role, record);
		this._addClonesForIndicator(role, record);
	}

	_addClonesForIndicator(role, record) {
		mmPanel.forEach(panel => {
			if (!panel || record.clones.has(panel))
				return;

			let clone = this._createIndicatorClone(record.source);
			if (!clone)
				return;

			try {
				panel.addToStatusArea(role, clone, record.position, record.box);
				record.clones.set(panel, clone);
			} catch (e) {
				console.error(e);
				clone.destroy();
			}
		});
	}

	_createIndicatorClone(indicator) {
		try {
			if (indicator.constructor?.name === 'IndicatorStatusIcon' && indicator._indicator)
				return new indicator.constructor(indicator._indicator);

			if (indicator.constructor?.name === 'IndicatorStatusTrayIcon' && indicator._icon)
				return new indicator.constructor(indicator._icon);
		} catch (e) {
			console.error(e);
		}

		return null;
	}

	_removeIndicatorMirrors(role) {
		let record = this._mirroredIndicators.get(role);
		if (!record)
			return;

		for (let clone of record.clones.values()) {
			try {
				clone.destroy();
			} catch (e) {
				console.error(e);
			}
		}

		if (record.destroyId)
			record.source.disconnect(record.destroyId);

		this._mirroredIndicators.delete(role);
	}

	_removePanelFromMirrors(panel) {
		for (let record of this._mirroredIndicators.values()) {
			let clone = record.clones.get(panel);
			if (clone) {
				try {
					clone.destroy();
				} catch (e) {
					console.error(e);
				}
				record.clones.delete(panel);
			}
		}
	}

	_syncMirroredIndicators() {
		for (let [role, record] of this._mirroredIndicators.entries())
			this._addClonesForIndicator(role, record);
	}
};
